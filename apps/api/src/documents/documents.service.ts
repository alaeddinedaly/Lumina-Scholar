import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Role, DocumentStatus } from 'shared-types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('pdf-ingestion') private audioQueue: Queue,
    private configService: ConfigService,
  ) {}

  async uploadDocument(user: any, courseId: string, file: Express.Multer.File, isAssignment = false, deadline: Date | null = null) {
    if (user.role !== Role.PROFESSOR) throw new UnauthorizedException('Only professors can upload documents');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.tenantId !== user.tenantId || course.professorId !== user.userId) {
      throw new UnauthorizedException('Access denied to course');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    const uuid = uuidv4();
    const uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    const folderPath = path.resolve(process.cwd(), uploadDir, user.tenantId, courseId);
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filename = `${uuid}.pdf`;
    const filePath = path.join(folderPath, filename);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        filename,
        originalName: file.originalname,
        filePath,
        status: DocumentStatus.PENDING,
        courseId,
        uploadedById: user.userId,
        tenantId: user.tenantId,
        isAssignment,
        deadline,
      }
    });

    // Enqueue job for background ingestion
    await this.audioQueue.add('process-pdf', {
      documentId: document.id,
      tenantId: user.tenantId,
      courseId,
      filePath,
      originalName: file.originalname,
    }, {
      removeOnComplete: true,
      attempts: 3,
    });

    return { documentId: document.id, status: DocumentStatus.PENDING };
  }

  async uploadPersonal(user: any, file: Express.Multer.File) {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    const uuid = uuidv4();
    const uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    const folderPath = path.resolve(process.cwd(), uploadDir, 'personal', user.userId);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filename = `${uuid}.pdf`;
    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        filename,
        originalName: file.originalname,
        filePath,
        status: DocumentStatus.PENDING,
        isPersonal: true,
        uploadedById: user.userId,
        tenantId: user.tenantId,
      }
    });

    await this.audioQueue.add('process-pdf', {
      documentId: document.id,
      tenantId: user.tenantId,
      courseId: null,
      filePath,
      originalName: file.originalname,
      isPersonal: true,
      userId: user.userId,
    }, { removeOnComplete: true, attempts: 3 });

    return { documentId: document.id, status: DocumentStatus.PENDING };
  }

  async findPersonal(user: any) {
    return this.prisma.document.findMany({
      where: { uploadedById: user.userId, isPersonal: true },
      select: { id: true, originalName: true, status: true, chunkCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByCourse(courseId: string, user: any) {
    // Validate access
    const isEnrolled = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.userId, courseId } }
    });
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });

    if (!course || course.tenantId !== user.tenantId) throw new NotFoundException('Course not found');

    if (!isEnrolled && course.professorId !== user.userId) {
      throw new UnauthorizedException('Access denied');
    }

    const documents = await this.prisma.document.findMany({
      where: { 
        courseId,
        tenantId: user.tenantId,
        ...(user.role === Role.STUDENT ? { status: DocumentStatus.INDEXED } : {})
      },
      select: {
        id: true,
        originalName: true,
        status: true,
        chunkCount: true,
        isAssignment: true,
        deadline: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  }

  async submitAssignment(documentId: string, user: any, file?: Express.Multer.File) {
    if (user.role !== Role.STUDENT) throw new UnauthorizedException('Only students can submit assignments');

    const document = await this.prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document || !document.isAssignment) throw new NotFoundException('Assignment not found');

    let submissionFilePath: string | null = null;
    let submissionFileName: string | null = null;

    if (file) {
      if (file.mimetype !== 'application/pdf') {
        throw new BadRequestException('Only PDF files are supported for submissions');
      }
      const uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
      const folderPath = path.resolve(process.cwd(), uploadDir, user.tenantId, 'submissions', documentId);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const uuid = uuidv4();
      const filename = `${uuid}.pdf`;
      submissionFilePath = path.join(folderPath, filename);
      submissionFileName = file.originalname;
      fs.writeFileSync(submissionFilePath, file.buffer);
    }

    // Score starts as null — professor grades manually via PATCH /documents/:id/grade
    return this.prisma.submission.upsert({
      where: { documentId_studentId: { documentId, studentId: user.userId } },
      create: { documentId, studentId: user.userId, score: null, submissionFilePath, submissionFileName },
      update: { submittedAt: new Date(), submissionFilePath: submissionFilePath ?? undefined, submissionFileName: submissionFileName ?? undefined },
    });
  }

  async gradeSubmission(documentId: string, studentId: string, score: number, user: any) {
    if (user.role !== Role.PROFESSOR) throw new UnauthorizedException('Only professors can grade submissions');

    if (score < 0 || score > 20) throw new BadRequestException('Score must be between 0 and 20');

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { course: true },
    });

    if (!document || !document.isAssignment) throw new NotFoundException('Assignment not found');
    if (document.course?.professorId !== user.userId || document.course?.tenantId !== user.tenantId) {
      throw new UnauthorizedException('Access denied — not your assignment');
    }

    const submission = await this.prisma.submission.findUnique({
      where: { documentId_studentId: { documentId, studentId } },
    });

    if (!submission) throw new NotFoundException('No submission found for this student');

    return this.prisma.submission.update({
      where: { documentId_studentId: { documentId, studentId } },
      data: { score },
    });
  }

  async getSubmissionDownloadPath(documentId: string, studentId: string, user: any): Promise<{ filePath: string; fileName: string }> {
    if (user.role !== Role.PROFESSOR) throw new UnauthorizedException('Only professors can download submissions');

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { course: true },
    });

    if (!document || !document.isAssignment) throw new NotFoundException('Assignment not found');
    if (document.course?.professorId !== user.userId || document.course?.tenantId !== user.tenantId) {
      throw new UnauthorizedException('Access denied — not your assignment');
    }

    const submission = await this.prisma.submission.findUnique({
      where: { documentId_studentId: { documentId, studentId } },
    });

    if (!submission || !submission.submissionFilePath) {
      throw new NotFoundException('No submitted file for this student');
    }

    return {
      filePath: submission.submissionFilePath,
      fileName: submission.submissionFileName ?? 'submission.pdf',
    };
  }

  async findAll(user: any) {
    if (user.role === Role.PROFESSOR) {
      return this.prisma.document.findMany({
        where: { tenantId: user.tenantId, uploadedById: user.userId },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { studentId: user.userId },
        select: { courseId: true }
      });
      const courseIds = enrollments.map(e => e.courseId);
      return this.prisma.document.findMany({
        where: { courseId: { in: courseIds } },
        include: { submissions: { where: { studentId: user.userId } } },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  async getDownloadPath(documentId: string, user: any) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { course: true },
    });

    if (!document) throw new NotFoundException('Document not found');

    // Personal document: only the uploader can access it
    if (document.isPersonal || !document.course) {
      if (document.uploadedById !== user.userId) {
        throw new UnauthorizedException('Access denied');
      }
      return document.filePath;
    }

    // Course document: check tenant + enrollment
    if (document.course.tenantId !== user.tenantId) throw new NotFoundException('Document not found');

    const isEnrolled = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.userId, courseId: document.courseId! } }
    });

    if (!isEnrolled && document.course.professorId !== user.userId) {
      throw new UnauthorizedException('Access denied');
    }

    return document.filePath;
  }

  async getStatus(documentId: string, user: any) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId, tenantId: user.tenantId },
      select: { status: true, chunkCount: true }
    });

    if (!document) throw new NotFoundException();

    return document;
  }
}

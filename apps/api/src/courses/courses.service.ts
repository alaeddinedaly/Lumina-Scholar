import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from 'shared-types';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
    if (user.role === Role.PROFESSOR) {
      return this.prisma.course.findMany({
        where: { tenantId: user.tenantId, professorId: user.userId },
        include: { 
          _count: { select: { enrollments: true, documents: true } },
          enrollments: { include: { student: { select: { id: true, name: true, email: true, role: true } } } }
        }
      });
    } else {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { studentId: user.userId, course: { tenantId: user.tenantId } },
        include: { course: { include: { professor: { select: { name: true } }, _count: { select: { documents: true } } } } }
      });
      return enrollments.map(e => e.course);
    }
  }

  async create(data: { name: string, description?: string, studentIds?: string[] }, user: any) {
    if (user.role !== Role.PROFESSOR) throw new BadRequestException('Only professors can create courses');

    const course = await this.prisma.course.create({
      data: {
        name: data.name,
        description: data.description || '',
        tenantId: user.tenantId,
        professorId: user.userId,
      }
    });

    // Auto-enroll the professor in their own course
    await this.prisma.enrollment.create({
      data: {
        studentId: user.userId,
        courseId: course.id,
      }
    });

    // Enroll only the selected students
    if (data.studentIds && data.studentIds.length > 0) {
      // Verify students belong to same tenant
      const verifiedStudents = await this.prisma.user.findMany({
        where: { id: { in: data.studentIds }, tenantId: user.tenantId, role: Role.STUDENT }
      });

      if (verifiedStudents.length > 0) {
        await this.prisma.enrollment.createMany({
          data: verifiedStudents.map(student => ({
            studentId: student.id,
            courseId: course.id
          }))
        });
      }
    }

    // Auto-create a default class channel
    await this.prisma.channel.create({
      data: {
        name: data.name,
        description: data.description || 'General discussion',
        type: 'COURSE',
        courseId: course.id,
        tenantId: user.tenantId,
        createdById: user.userId,
      }
    });

    return course;
  }

  async findOne(id: string, user: any) {
    const course = await this.prisma.course.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        professor: { select: { id: true, name: true, email: true } },
        _count: { select: { enrollments: true, documents: true } }
      }
    });

    if (!course) throw new NotFoundException('Course not found');

    const isEnrolled = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.userId, courseId: id } }
    });

    if (!isEnrolled && course.professorId !== user.userId) {
      throw new UnauthorizedException('You do not have access to this course');
    }

    return course;
  }

  async enroll(courseId: string, studentEmail: string, user: any) {
    if (user.role !== Role.PROFESSOR) throw new UnauthorizedException('Only professors can enroll students');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.tenantId !== user.tenantId || course.professorId !== user.userId) {
      throw new UnauthorizedException('Course access denied');
    }

    const student = await this.prisma.user.findFirst({
      where: { email: studentEmail, tenantId: user.tenantId, role: Role.STUDENT }
    });

    if (!student) throw new BadRequestException(`Student with email ${studentEmail} not found in this tenant`);

    return this.prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
      }
    });
  }

  async enrollMultiple(courseId: string, studentIds: string[], user: any) {
    if (user.role !== Role.PROFESSOR) throw new UnauthorizedException('Only professors can enroll students');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.tenantId !== user.tenantId || course.professorId !== user.userId) {
      throw new UnauthorizedException('Course access denied');
    }

    const students = await this.prisma.user.findMany({
      where: { id: { in: studentIds }, tenantId: user.tenantId, role: Role.STUDENT }
    });

    let added = 0;
    for (const student of students) {
      const exists = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } }
      });
      if (!exists) {
        await this.prisma.enrollment.create({
          data: { studentId: student.id, courseId: course.id }
        });
        added++;
      }
    }

    return { message: 'Students enrolled successfully', added };
  }

  async syncEnrollments(tenantId: string) {
    const students = await this.prisma.user.findMany({
      where: { tenantId, role: Role.STUDENT }
    });
    const courses = await this.prisma.course.findMany({
      where: { tenantId }
    });

    let created = 0;
    let skipped = 0;
    for (const student of students) {
      for (const course of courses) {
        const exists = await this.prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId: student.id, courseId: course.id } }
        });
        if (!exists) {
          await this.prisma.enrollment.create({
            data: { studentId: student.id, courseId: course.id }
          });
          created++;
        } else {
          skipped++;
        }
      }
    }

    return { message: `Sync complete`, created, skipped, students: students.length, courses: courses.length };
  }
}

import { Controller, Post, Get, Patch, Param, UseInterceptors, UploadedFile, Body, Req, UseGuards, Res } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from 'shared-types';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles(Role.PROFESSOR)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('courseId') courseId: string,
    @Body('isAssignment') isAssignment: string,
    @Body('deadline') deadline: string,
    @Req() req: any
  ) {
    return this.documentsService.uploadDocument(
      req.user, 
      courseId, 
      file, 
      isAssignment === 'true', 
      deadline ? new Date(deadline) : null
    );
  }

  @Post('personal-upload')
  @UseInterceptors(FileInterceptor('file'))
  async personalUpload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.documentsService.uploadPersonal(req.user, file);
  }

  @Get('personal')
  async findPersonal(@Req() req: any) {
    return this.documentsService.findPersonal(req.user);
  }

  @Get('course/:courseId')
  async getByCourse(@Param('courseId') courseId: string, @Req() req: any) {
    return this.documentsService.findByCourse(courseId, req.user);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.documentsService.findAll(req.user);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const filePath = await this.documentsService.getDownloadPath(id, req.user);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found on disk');
    }
    const stream = fs.createReadStream(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="document.pdf"`
    });
    stream.pipe(res);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @Req() req: any) {
    return this.documentsService.getStatus(id, req.user);
  }

  // Student submits their assignment work (optional file attachment)
  @Post(':id/submit')
  @Roles(Role.STUDENT)
  @UseInterceptors(FileInterceptor('file'))
  async submitAssignment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    return this.documentsService.submitAssignment(id, req.user, file);
  }

  // Professor downloads a student's submitted work PDF
  @Get(':docId/submission/:studentId/download')
  @Roles(Role.PROFESSOR)
  async downloadSubmission(
    @Param('docId') docId: string,
    @Param('studentId') studentId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const { filePath, fileName } = await this.documentsService.getSubmissionDownloadPath(docId, studentId, req.user);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Submission file not found on disk');
    }
    const stream = fs.createReadStream(filePath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    stream.pipe(res);
  }

  @Patch(':id/grade')
  @Roles(Role.PROFESSOR)
  async gradeSubmission(
    @Param('id') documentId: string,
    @Body('studentId') studentId: string,
    @Body('score') score: number,
    @Req() req: any,
  ) {
    return this.documentsService.gradeSubmission(documentId, studentId, Number(score), req.user);
  }
}

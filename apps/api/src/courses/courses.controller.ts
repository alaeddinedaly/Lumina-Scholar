import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from 'shared-types';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.coursesService.findAll(req.user);
  }

  @Post()
  @Roles(Role.PROFESSOR)
  create(@Req() req: any, @Body() body: any) {
    return this.coursesService.create(body, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.coursesService.findOne(id, req.user);
  }

  @Post(':id/enroll')
  @Roles(Role.PROFESSOR)
  enroll(@Param('id') id: string, @Body('studentEmail') studentEmail: string, @Req() req: any) {
    return this.coursesService.enroll(id, studentEmail, req.user);
  }

  @Post(':id/enroll-multiple')
  @Roles(Role.PROFESSOR)
  enrollMultiple(@Param('id') id: string, @Body('studentIds') studentIds: string[], @Req() req: any) {
    return this.coursesService.enrollMultiple(id, studentIds, req.user);
  }

  @Post('sync-enrollments')
  @Roles(Role.PROFESSOR)
  syncEnrollments(@Req() req: any) {
    return this.coursesService.syncEnrollments(req.user.tenantId);
  }
}

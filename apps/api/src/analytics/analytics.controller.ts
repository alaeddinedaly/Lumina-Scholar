import { Controller, Get, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from 'shared-types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('courses')
  @Roles(Role.PROFESSOR)
  async getCoursesAnalytics(@Req() req: any) {
    if (req.user.role !== Role.PROFESSOR) {
      throw new UnauthorizedException('Only professors can access analytics.');
    }
    return this.analyticsService.getProfessorAnalytics(req.user);
  }

  @Get('grading')
  @Roles(Role.PROFESSOR)
  async getGrading(@Req() req: any) {
    if (req.user.role !== Role.PROFESSOR) {
      throw new UnauthorizedException('Only professors can access grading data.');
    }
    return this.analyticsService.getSubmissionsForGrading(req.user);
  }
}

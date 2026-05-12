import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(
    private channelsService: ChannelsService,
    private prisma: PrismaService
  ) {}

  // ── Course Channels ──
  @Get('course/:courseId')
  getCourseChannels(@Param('courseId') courseId: string, @Req() req: any) {
    return this.channelsService.getCourseChannels(courseId, req.user);
  }

  @Post('course/:courseId')
  createCourseChannel(
    @Param('courseId') courseId: string,
    @Body() body: { name: string; description?: string },
    @Req() req: any,
  ) {
    return this.channelsService.createCourseChannel(courseId, body.name, body.description, req.user);
  }

  // ── Private Channels ──
  @Get('private')
  getPrivateChannels(@Req() req: any) {
    return this.channelsService.getPrivateChannels(req.user);
  }

  @Post('private')
  createPrivateChannel(
    @Body() body: { name: string; memberIds: string[] },
    @Req() req: any,
  ) {
    return this.channelsService.createPrivateChannel(body.name, body.memberIds, req.user);
  }

  // Get all users in tenant for private chat selection
  @Get('users')
  async getTenantUsers(@Req() req: any) {
    return this.prisma.user.findMany({
      where: { tenantId: req.user.tenantId, id: { not: req.user.userId } },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' }
    });
  }

  // ── General ──
  @Delete(':channelId')
  deleteChannel(@Param('channelId') channelId: string, @Req() req: any) {
    return this.channelsService.deleteChannel(channelId, req.user);
  }

  @Get(':channelId/messages')
  getMessages(@Param('channelId') channelId: string, @Req() req: any) {
    return this.channelsService.getMessages(channelId, req.user);
  }

  @Post(':channelId/messages')
  sendMessage(
    @Param('channelId') channelId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return this.channelsService.sendMessage(channelId, body.content, req.user);
  }
}

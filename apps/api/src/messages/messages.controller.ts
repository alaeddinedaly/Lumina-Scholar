import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('course/:courseId')
  async getMessages(
    @Param('courseId') courseId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Req() req: any
  ) {
    return this.messagesService.getPaginatedMessages(courseId, parseInt(page), parseInt(limit), req.user);
  }
}

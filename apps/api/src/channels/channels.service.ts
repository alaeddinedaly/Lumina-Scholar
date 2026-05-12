import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from 'shared-types';

const MESSAGE_TTL_DAYS = 7;

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  // ── Course Channels ─────────────────────────────────────────────────────────────

  async getCourseChannels(courseId: string, user: any) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.tenantId !== user.tenantId) throw new NotFoundException('Course not found');

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.userId, courseId } }
    });
    if (!enrolled && course.professorId !== user.userId) throw new ForbiddenException('Access denied');

    return this.prisma.channel.findMany({
      where: { courseId, type: 'COURSE', tenantId: user.tenantId },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCourseChannel(courseId: string, name: string, description: string | undefined, user: any) {
    if (user.role !== Role.PROFESSOR) throw new ForbiddenException('Only professors can create course channels');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.tenantId !== user.tenantId || course.professorId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.channel.create({
      data: { name, description, courseId, type: 'COURSE', tenantId: user.tenantId, createdById: user.userId },
      include: { createdBy: { select: { id: true, name: true, role: true } } },
    });
  }

  // ── Private Channels (Conversations) ─────────────────────────────────────────────

  async getPrivateChannels(user: any) {
    return this.prisma.channel.findMany({
      where: {
        type: 'PRIVATE',
        tenantId: user.tenantId,
        members: { some: { userId: user.userId } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrivateChannel(name: string, memberIds: string[], user: any) {
    if (!memberIds.includes(user.userId)) {
      memberIds.push(user.userId);
    }
    
    // Verify all members belong to the same tenant
    const verifiedMembers = await this.prisma.user.findMany({
      where: { id: { in: memberIds }, tenantId: user.tenantId }
    });
    if (verifiedMembers.length !== memberIds.length) {
      throw new BadRequestException('Some users are not in your tenant');
    }

    const channel = await this.prisma.channel.create({
      data: {
        name,
        type: 'PRIVATE',
        tenantId: user.tenantId,
        createdById: user.userId,
        members: {
          create: memberIds.map(id => ({ userId: id }))
        }
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        createdBy: { select: { id: true, name: true, role: true } }
      }
    });
    return channel;
  }

  // ── General Channel Ops ──────────────────────────────────────────────────

  async deleteChannel(channelId: string, user: any) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || channel.tenantId !== user.tenantId) throw new NotFoundException('Channel not found');
    if (channel.createdById !== user.userId) throw new ForbiddenException('Only the creator can delete a channel');
    
    await this.prisma.channel.delete({ where: { id: channelId } });
    return { success: true };
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async getMessages(channelId: string, user: any) {
    const channel = await this.prisma.channel.findUnique({ 
      where: { id: channelId },
      include: { members: true, course: true }
    });
    if (!channel || channel.tenantId !== user.tenantId) throw new NotFoundException('Channel not found');

    if (channel.type === 'COURSE') {
      const enrolled = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: user.userId, courseId: channel.courseId! } }
      });
      if (!enrolled && channel.course?.professorId !== user.userId) throw new ForbiddenException('Access denied');
    } else {
      if (!channel.members.some(m => m.userId === user.userId)) throw new ForbiddenException('Access denied');
    }

    // Purge expired messages first
    await this.prisma.channelMessage.deleteMany({
      where: { channelId, expiresAt: { lt: new Date() } }
    });

    return this.prisma.channelMessage.findMany({
      where: { channelId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(channelId: string, content: string, user: any) {
    const channel = await this.prisma.channel.findUnique({ 
      where: { id: channelId },
      include: { members: true, course: true }
    });
    if (!channel || channel.tenantId !== user.tenantId) throw new NotFoundException('Channel not found');

    if (channel.type === 'COURSE') {
      const enrolled = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: user.userId, courseId: channel.courseId! } }
      });
      if (!enrolled && channel.course?.professorId !== user.userId) throw new ForbiddenException('Access denied');
    } else {
      if (!channel.members.some(m => m.userId === user.userId)) throw new ForbiddenException('Access denied');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + MESSAGE_TTL_DAYS);

    return this.prisma.channelMessage.create({
      data: {
        content,
        channelId,
        userId: user.userId,
        tenantId: user.tenantId,
        expiresAt,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
  }

  async purgeExpiredMessages() {
    const { count } = await this.prisma.channelMessage.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (count > 0) console.log(`[Channels] Purged ${count} expired messages`);
  }
}

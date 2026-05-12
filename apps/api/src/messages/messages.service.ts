import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getPaginatedMessages(courseId: string, page: number, limit: number, user: any) {
    // Basic verification - assume enrolled if asking for own messages
    // Real strict RBAC might check enrollment again here

    const skip = (page - 1) * limit;

    const messages = await this.prisma.message.findMany({
      where: {
        courseId,
        userId: user.userId,
        tenantId: user.tenantId,
      },
      include: {
        citations: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prisma.message.count({
      where: {
        courseId,
        userId: user.userId,
        tenantId: user.tenantId,
      }
    });

    return {
      data: messages.reverse(), // chronologically ascending for UI
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

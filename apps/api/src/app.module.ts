import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { DocumentsModule } from './documents/documents.module';
import { MessagesModule } from './messages/messages.module';
import { ChannelsModule } from './channels/channels.module';
import { WsModule } from './websockets/ws.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class GlobalModule {}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    GlobalModule,
    AuthModule,
    CoursesModule,
    DocumentsModule,
    MessagesModule,
    ChannelsModule,
    WsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}

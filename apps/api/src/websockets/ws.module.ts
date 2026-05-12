import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({
      name: 'chat',
    }),
  ],
  providers: [WsGateway],
})
export class WsModule {}

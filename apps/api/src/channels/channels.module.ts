import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { ChannelsPurgeTask } from './channels.purge.task';

@Module({
  providers: [ChannelsService, ChannelsPurgeTask],
  controllers: [ChannelsController],
  exports: [ChannelsService],
})
export class ChannelsModule {}

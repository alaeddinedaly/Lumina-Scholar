import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChannelsService } from './channels.service';

@Injectable()
export class ChannelsPurgeTask {
  constructor(private channelsService: ChannelsService) {}

  // Runs every day at 3am to purge expired messages
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handlePurge() {
    await this.channelsService.purgeExpiredMessages();
  }
}

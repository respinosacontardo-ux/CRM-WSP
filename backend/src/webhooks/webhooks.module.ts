import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { YCloudService } from './ycloud.service';
import { LeadsModule } from '../leads/leads.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [LeadsModule, ConversationsModule, AgentModule],
  controllers: [WebhooksController],
  providers: [YCloudService],
})
export class WebhooksModule {}

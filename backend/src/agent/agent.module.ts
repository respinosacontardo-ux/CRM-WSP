import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AppConfigModule } from '../config/config.module';
import { LeadsModule } from '../leads/leads.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ConversationsModule } from '../conversations/conversations.module';

/**
 * IMPORTANT: this module imports Mastra. In app.module.ts it MUST be the LAST
 * imported module, because Mastra mounts catch-all routes under /api.
 */
@Module({
  imports: [AppConfigModule, LeadsModule, AppointmentsModule, ConversationsModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { EventsModule } from './events/events.module';
import { AppConfigModule } from './config/config.module';
import { LeadsModule } from './leads/leads.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SeedModule } from './seed/seed.module';
import { WebhooksModule } from './webhooks/webhooks.module';
// IMPORTANT: AgentModule imports Mastra, which mounts catch-all routes under
// /api. It MUST be the LAST module in this list so it does not shadow the
// routes of the modules above.
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    // Global rate limiting: 120 requests / minute per IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    EventsModule,
    AppConfigModule,
    LeadsModule,
    AppointmentsModule,
    ConversationsModule,
    DashboardModule,
    SeedModule,
    WebhooksModule,
    // --- Mastra last ---
    AgentModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

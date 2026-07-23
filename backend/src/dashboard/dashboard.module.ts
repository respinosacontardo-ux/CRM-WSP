import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/lead.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Conversation } from '../conversations/conversation.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, Appointment, Conversation]),
    AppConfigModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

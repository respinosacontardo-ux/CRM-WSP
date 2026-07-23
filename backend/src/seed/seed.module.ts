import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../config/entities/app-config.entity';
import { MeetingType } from '../config/entities/meeting-type.entity';
import { BusinessHour } from '../config/entities/business-hour.entity';
import { Lead } from '../leads/lead.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Conversation } from '../conversations/conversation.entity';
import { Message } from '../conversations/message.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppConfig,
      MeetingType,
      BusinessHour,
      Lead,
      Appointment,
      Conversation,
      Message,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}

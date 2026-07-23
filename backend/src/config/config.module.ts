import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from './entities/app-config.entity';
import { MeetingType } from './entities/meeting-type.entity';
import { BusinessHour } from './entities/business-hour.entity';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { OpenRouterService } from './openrouter.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig, MeetingType, BusinessHour])],
  controllers: [ConfigController],
  providers: [ConfigService, OpenRouterService],
  exports: [ConfigService],
})
export class AppConfigModule {}

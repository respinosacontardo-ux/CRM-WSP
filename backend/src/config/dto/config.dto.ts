import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MeetingTypeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class BusinessHourDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:MM' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be HH:MM' })
  endTime: string;
}

/**
 * Partial update of the app configuration.
 * Secret fields (openRouterApiKey) are ignored when empty so an accidental
 * blank submit never wipes an existing secret.
 */
export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  companyDescription?: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  agentEnabled?: boolean;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  // --- AI model ---
  @IsOptional()
  @IsString()
  openRouterApiKey?: string;

  @IsOptional()
  @IsString()
  agentModel?: string;

  // --- Collections (replace-all semantics when provided) ---
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeetingTypeDto)
  meetingTypes?: MeetingTypeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  businessHours?: BusinessHourDto[];
}

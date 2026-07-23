import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AppointmentStatus } from '../appointment.entity';

export class CreateAppointmentDto {
  @IsString()
  leadId: string;

  @IsString()
  @MinLength(1)
  meetingTypeName: string;

  /** ISO 8601 start datetime. */
  @IsDateString()
  startsAt: string;

  /** Optional explicit end. If omitted, computed from the meeting type duration. */
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  meetingTypeName?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsIn(['scheduled', 'cancelled', 'completed'])
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

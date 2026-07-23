import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment, AppointmentSource } from './appointment.entity';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { EventsService } from '../events/events.service';
import { ConfigService } from '../config/config.service';
import { LeadsService } from '../leads/leads.service';
import {
  parseHhMm,
  weekdayOfDate,
  zonedWallTimeToUtc,
} from '../common/timezone.util';

export interface AvailabilitySlot {
  startsAt: string; // ISO
  endsAt: string; // ISO
  label: string; // "HH:MM" local
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly events: EventsService,
    private readonly config: ConfigService,
    private readonly leads: LeadsService,
  ) {}

  /** Appointments within an optional [from, to] date range (ISO strings). */
  async findAll(from?: string, to?: string): Promise<Appointment[]> {
    if (from && to) {
      return this.appointmentRepo.find({
        where: { startsAt: Between(new Date(from), new Date(to)) },
        order: { startsAt: 'ASC' },
      });
    }
    return this.appointmentRepo.find({ order: { startsAt: 'ASC' } });
  }

  async findOne(id: string): Promise<Appointment> {
    const appt = await this.appointmentRepo.findOne({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async findForLead(leadId: string): Promise<Appointment[]> {
    return this.appointmentRepo.find({
      where: { leadId },
      order: { startsAt: 'DESC' },
    });
  }

  async create(dto: CreateAppointmentDto, source: AppointmentSource = 'manual'): Promise<Appointment> {
    await this.leads.findOne(dto.leadId); // validates the lead exists

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid startsAt');
    }

    const endsAt = dto.endsAt
      ? new Date(dto.endsAt)
      : await this.computeEnd(startsAt, dto.meetingTypeName);

    const appointment = this.appointmentRepo.create({
      leadId: dto.leadId,
      meetingTypeName: dto.meetingTypeName,
      startsAt,
      endsAt,
      notes: dto.notes ?? null,
      source,
      status: 'scheduled',
    });
    const saved = await this.appointmentRepo.save(appointment);
    this.events.emit({ type: 'appointment.changed', data: { id: saved.id } });
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    const appt = await this.findOne(id);
    if (dto.meetingTypeName !== undefined) appt.meetingTypeName = dto.meetingTypeName;
    if (dto.startsAt !== undefined) appt.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) appt.endsAt = new Date(dto.endsAt);
    if (dto.status !== undefined) appt.status = dto.status;
    if (dto.notes !== undefined) appt.notes = dto.notes;
    const saved = await this.appointmentRepo.save(appt);
    this.events.emit({ type: 'appointment.changed', data: { id: saved.id } });
    return this.findOne(saved.id);
  }

  /** Cancels (keeps history) rather than hard-deletes. */
  async cancel(id: string): Promise<Appointment> {
    return this.update(id, { status: 'cancelled' });
  }

  async remove(id: string): Promise<void> {
    const appt = await this.findOne(id);
    await this.appointmentRepo.remove(appt);
    this.events.emit({ type: 'appointment.changed', data: { id } });
  }

  private async computeEnd(startsAt: Date, meetingTypeName: string): Promise<Date> {
    const types = await this.config.getMeetingTypes();
    const match = types.find((t) => t.name === meetingTypeName);
    const duration = match?.durationMinutes ?? 30;
    return new Date(startsAt.getTime() + duration * 60_000);
  }

  /**
   * Free slots on a given calendar date for a meeting type, respecting the
   * company's business hours and existing (non-cancelled) appointments.
   * Used by the calendar UI and by the agent's availability tool.
   */
  async getAvailability(dateIso: string, meetingTypeName: string): Promise<AvailabilitySlot[]> {
    const cfg = await this.config.getSanitizedConfig();
    const timezone = cfg.timezone;

    const meetingType = cfg.meetingTypes.find((t) => t.name === meetingTypeName);
    const duration = meetingType?.durationMinutes ?? 30;

    const weekday = weekdayOfDate(dateIso);
    const intervals = cfg.businessHours.filter((h) => h.dayOfWeek === weekday);
    if (intervals.length === 0) return [];

    const [year, month, day] = dateIso.split('-').map((n) => parseInt(n, 10));

    // Existing appointments for that day (widen the window to cover the timezone).
    const dayStart = zonedWallTimeToUtc(timezone, year, month, day, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);
    const existing = (
      await this.appointmentRepo.find({
        where: { startsAt: Between(dayStart, dayEnd) },
      })
    ).filter((a) => a.status !== 'cancelled');

    const slots: AvailabilitySlot[] = [];
    const stepMinutes = 15;
    const now = new Date();

    for (const interval of intervals) {
      const start = parseHhMm(interval.startTime);
      const end = parseHhMm(interval.endTime);
      const intervalStartMin = start.hour * 60 + start.minute;
      const intervalEndMin = end.hour * 60 + end.minute;

      for (let m = intervalStartMin; m + duration <= intervalEndMin; m += stepMinutes) {
        const slotStart = zonedWallTimeToUtc(
          timezone,
          year,
          month,
          day,
          Math.floor(m / 60),
          m % 60,
        );
        const slotEnd = new Date(slotStart.getTime() + duration * 60_000);

        if (slotStart.getTime() <= now.getTime()) continue; // no past slots

        const overlaps = existing.some(
          (a) => slotStart < a.endsAt && slotEnd > a.startsAt,
        );
        if (overlaps) continue;

        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
          label: `${hh}:${mm}`,
        });
      }
    }

    return slots;
  }
}

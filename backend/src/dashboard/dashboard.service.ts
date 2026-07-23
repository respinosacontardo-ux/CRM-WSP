import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { Lead } from '../leads/lead.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Conversation } from '../conversations/conversation.entity';
import { ConfigService } from '../config/config.service';

export interface DashboardMetrics {
  totalLeads: number;
  appointmentsToday: number;
  upcomingAppointments: number;
  agentEnabled: boolean;
  agentConfigured: boolean;
  recentConversations: {
    id: string;
    title: string;
    channel: string;
    lastMessageAt: Date | null;
  }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    private readonly config: ConfigService,
  ) {}

  async getMetrics(): Promise<DashboardMetrics> {
    const cfg = await this.config.getSanitizedConfig();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 3600_000);

    const [totalLeads, appointmentsToday, upcomingAppointments, recent] = await Promise.all([
      this.leadRepo.count(),
      this.appointmentRepo.count({
        where: { startsAt: Between(startOfToday, endOfToday), status: Not('cancelled') },
      }),
      this.appointmentRepo.count({
        where: { startsAt: Between(now, new Date(now.getTime() + 30 * 24 * 3600_000)), status: Not('cancelled') },
      }),
      this.conversationRepo.find({
        order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return {
      totalLeads,
      appointmentsToday,
      upcomingAppointments,
      agentEnabled: cfg.agentEnabled,
      agentConfigured: cfg.hasAnyApiKey && !!cfg.agentModel,
      recentConversations: recent.map((c) => ({
        id: c.id,
        title: c.title,
        channel: c.channel,
        lastMessageAt: c.lastMessageAt,
      })),
    };
  }
}

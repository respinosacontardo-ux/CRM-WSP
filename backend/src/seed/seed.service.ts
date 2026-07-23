import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from '../config/entities/app-config.entity';
import { MeetingType } from '../config/entities/meeting-type.entity';
import { BusinessHour } from '../config/entities/business-hour.entity';
import { Lead } from '../leads/lead.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Conversation } from '../conversations/conversation.entity';
import { Message } from '../conversations/message.entity';

/**
 * Idempotent demo data for "MKT BATTISTON". Runs once, the first time the app
 * starts against an empty database, only when SEED_DEMO_DATA is truthy.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(AppConfig) private readonly configRepo: Repository<AppConfig>,
    @InjectRepository(MeetingType) private readonly meetingTypeRepo: Repository<MeetingType>,
    @InjectRepository(BusinessHour) private readonly businessHourRepo: Repository<BusinessHour>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Appointment) private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Conversation) private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled = (process.env.SEED_DEMO_DATA ?? 'false').toLowerCase() === 'true';
    if (!enabled) return;

    // Idempotency: only seed when there are no leads yet.
    const leadCount = await this.leadRepo.count();
    if (leadCount > 0) return;

    this.logger.log('Seeding demo data for MKT BATTISTON...');
    await this.seedConfig();
    await this.seedMeetingTypes();
    await this.seedBusinessHours();
    await this.seedLeadsAndAppointments();
    this.logger.log('Demo data seeded.');
  }

  private async seedConfig(): Promise<void> {
    let config = await this.configRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!config) config = this.configRepo.create();
    config.companyName = 'MKT BATTISTON';
    config.companyDescription =
      'Software de automatización con Inteligencia Artificial para redes sociales ' +
      '(Instagram, Facebook, YouTube, TikTok y WhatsApp). Ayudamos a los negocios a ' +
      'captar clientes, publicar contenido y gestionar múltiples cuentas de forma ' +
      'automática, 24/7. Únicos en Latinoamérica.';
    config.tone = 'cercano y profesional';
    config.timezone = 'America/Argentina/Buenos_Aires';
    config.agentEnabled = true;
    await this.configRepo.save(config);
  }

  private async seedMeetingTypes(): Promise<void> {
    if ((await this.meetingTypeRepo.count()) > 0) return;
    const types = [
      { name: 'Demo general', durationMinutes: 30 },
      { name: 'Demo Instagram', durationMinutes: 30 },
      { name: 'Demo Facebook', durationMinutes: 30 },
      { name: 'Demo WhatsApp Pro', durationMinutes: 30 },
      { name: 'Consultoría de automatización', durationMinutes: 45 },
      { name: 'Reunión de cierre', durationMinutes: 30 },
    ];
    await this.meetingTypeRepo.save(
      types.map((t, i) => this.meetingTypeRepo.create({ ...t, active: true, sortOrder: i })),
    );
  }

  private async seedBusinessHours(): Promise<void> {
    if ((await this.businessHourRepo.count()) > 0) return;
    const rows: Partial<BusinessHour>[] = [];
    // Monday(1) to Friday(5): 09:00-18:00
    for (let day = 1; day <= 5; day++) {
      rows.push({ dayOfWeek: day, startTime: '09:00', endTime: '18:00' });
    }
    // Saturday(6): 09:00-13:00
    rows.push({ dayOfWeek: 6, startTime: '09:00', endTime: '13:00' });
    await this.businessHourRepo.save(rows.map((r) => this.businessHourRepo.create(r)));
  }

  private async seedLeadsAndAppointments(): Promise<void> {
    const now = new Date();
    const inDays = (d: number, h = 11, m = 0) => {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      date.setHours(h, m, 0, 0);
      return date;
    };

    // --- Lead 1: with an upcoming demo + a WhatsApp conversation ---
    const lead1 = await this.leadRepo.save(
      this.leadRepo.create({
        name: 'Lucía Fernández',
        phone: '+5493811111111',
        email: 'lucia@example.com',
        company: 'Boutique Aurora',
        interest: 'Instagram',
        notes: 'Interesada en automatizar publicaciones y DMs de Instagram.',
      }),
    );
    await this.appointmentRepo.save(
      this.appointmentRepo.create({
        leadId: lead1.id,
        meetingTypeName: 'Demo Instagram',
        startsAt: inDays(2, 11, 0),
        endsAt: inDays(2, 11, 30),
        status: 'scheduled',
        source: 'agent',
      }),
    );
    const conv1 = await this.conversationRepo.save(
      this.conversationRepo.create({
        leadId: lead1.id,
        channel: 'whatsapp',
        title: lead1.name,
        lastMessageAt: inDays(-1, 10, 5),
      }),
    );
    await this.messageRepo.save([
      this.messageRepo.create({
        conversationId: conv1.id,
        role: 'user',
        content: 'Hola, vi que automatizan Instagram con IA, ¿cómo funciona para mi negocio?',
      }),
      this.messageRepo.create({
        conversationId: conv1.id,
        role: 'assistant',
        content:
          '¡Hola! Con gusto te lo mostramos. Automatizamos publicaciones, historias, ' +
          'Reels e interacción con IA. ¿Te viene bien que agendemos una demo de Instagram esta semana?',
      }),
    ]);

    // --- Lead 2: WhatsApp Pro interest + past (completed) meeting ---
    const lead2 = await this.leadRepo.save(
      this.leadRepo.create({
        name: 'Martín Gómez',
        phone: '+5493812222222',
        email: null,
        company: 'Gimnasio Titan',
        interest: 'WhatsApp Pro',
        notes: 'Quiere hacer envíos masivos por WhatsApp a su base de clientes.',
      }),
    );
    await this.appointmentRepo.save(
      this.appointmentRepo.create({
        leadId: lead2.id,
        meetingTypeName: 'Demo WhatsApp Pro',
        startsAt: inDays(-5, 16, 0),
        endsAt: inDays(-5, 16, 30),
        status: 'completed',
        source: 'manual',
      }),
    );
    const conv2 = await this.conversationRepo.save(
      this.conversationRepo.create({
        leadId: lead2.id,
        channel: 'whatsapp',
        title: lead2.name,
        lastMessageAt: inDays(-6, 9, 30),
      }),
    );
    await this.messageRepo.save([
      this.messageRepo.create({
        conversationId: conv2.id,
        role: 'user',
        content: 'Me interesa el envío masivo de WhatsApp, ¿tienen una demo esta semana?',
      }),
      this.messageRepo.create({
        conversationId: conv2.id,
        role: 'assistant',
        content:
          '¡Claro! Te muestro cómo hacer envíos masivos, grupos y canales de difusión. ' +
          'Agendé una Demo de WhatsApp Pro para ti. ¡Nos vemos!',
      }),
    ]);

    // --- Lead 3: new lead, no meeting yet ---
    await this.leadRepo.save(
      this.leadRepo.create({
        name: 'Sofía Ramírez',
        phone: '+5493813333333',
        email: 'sofia@example.com',
        company: 'Estudio Contable RyR',
        interest: 'Facebook',
        notes: 'Consultó por automatización de Facebook. Pendiente de agendar demo.',
      }),
    );
  }
}

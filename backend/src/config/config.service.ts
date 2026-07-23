import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './entities/app-config.entity';
import { MeetingType } from './entities/meeting-type.entity';
import { BusinessHour } from './entities/business-hour.entity';
import { UpdateConfigDto } from './dto/config.dto';
import { EventsService } from '../events/events.service';

/** Shape returned to clients: secrets replaced by `has*` booleans. */
export interface SanitizedConfig {
  id: string;
  companyName: string;
  companyDescription: string;
  tone: string;
  timezone: string;
  agentEnabled: boolean;
  agentModel: string | null;
  hasOpenRouterApiKey: boolean;
  /** True when a key exists either in the DB or as an env fallback. */
  hasAnyApiKey: boolean;
  meetingTypes: MeetingType[];
  businessHours: BusinessHour[];
}

@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(AppConfig)
    private readonly configRepo: Repository<AppConfig>,
    @InjectRepository(MeetingType)
    private readonly meetingTypeRepo: Repository<MeetingType>,
    @InjectRepository(BusinessHour)
    private readonly businessHourRepo: Repository<BusinessHour>,
    private readonly events: EventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Ensure the singleton config row exists.
    await this.getRawConfig();
  }

  /** Returns the singleton config row, creating a default one if missing. */
  async getRawConfig(): Promise<AppConfig> {
    let config = await this.configRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!config) {
      config = this.configRepo.create();
      config = await this.configRepo.save(config);
    }
    return config;
  }

  async getMeetingTypes(activeOnly = false): Promise<MeetingType[]> {
    return this.meetingTypeRepo.find({
      where: activeOnly ? { active: true } : {},
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getBusinessHours(): Promise<BusinessHour[]> {
    return this.businessHourRepo.find({
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  /** Public, secret-free view of the configuration. */
  async getSanitizedConfig(): Promise<SanitizedConfig> {
    const config = await this.getRawConfig();
    const [meetingTypes, businessHours] = await Promise.all([
      this.getMeetingTypes(),
      this.getBusinessHours(),
    ]);

    const hasDbKey = !!config.openRouterApiKey;
    const hasEnvKey = !!process.env.OPENROUTER_API_KEY;

    return {
      id: config.id,
      companyName: config.companyName,
      companyDescription: config.companyDescription,
      tone: config.tone,
      timezone: config.timezone,
      agentEnabled: config.agentEnabled,
      agentModel: config.agentModel ?? process.env.AGENT_MODEL ?? null,
      hasOpenRouterApiKey: hasDbKey,
      hasAnyApiKey: hasDbKey || hasEnvKey,
      meetingTypes,
      businessHours,
    };
  }

  /**
   * Applies a partial update. Empty secret fields are ignored so they are
   * never overwritten with a blank value.
   */
  async updateConfig(dto: UpdateConfigDto): Promise<SanitizedConfig> {
    const config = await this.getRawConfig();

    if (dto.companyName !== undefined) config.companyName = dto.companyName;
    if (dto.companyDescription !== undefined) config.companyDescription = dto.companyDescription;
    if (dto.tone !== undefined) config.tone = dto.tone;
    if (dto.timezone !== undefined) config.timezone = dto.timezone;
    if (dto.agentEnabled !== undefined) config.agentEnabled = dto.agentEnabled;
    if (dto.agentModel !== undefined) config.agentModel = dto.agentModel;

    // Secret: only update when a non-empty value is provided.
    if (dto.openRouterApiKey !== undefined && dto.openRouterApiKey.trim() !== '') {
      config.openRouterApiKey = dto.openRouterApiKey.trim();
    }

    await this.configRepo.save(config);

    if (dto.meetingTypes) {
      await this.replaceMeetingTypes(dto.meetingTypes);
    }
    if (dto.businessHours) {
      await this.replaceBusinessHours(dto.businessHours);
    }

    this.events.emit({ type: 'agent.status', data: { agentEnabled: config.agentEnabled } });
    return this.getSanitizedConfig();
  }

  private async replaceMeetingTypes(items: UpdateConfigDto['meetingTypes']): Promise<void> {
    await this.meetingTypeRepo.clear();
    const rows = (items ?? []).map((m, index) =>
      this.meetingTypeRepo.create({
        name: m.name,
        durationMinutes: m.durationMinutes,
        active: m.active ?? true,
        sortOrder: index,
      }),
    );
    if (rows.length) await this.meetingTypeRepo.save(rows);
  }

  private async replaceBusinessHours(items: UpdateConfigDto['businessHours']): Promise<void> {
    await this.businessHourRepo.clear();
    const rows = (items ?? []).map((h) =>
      this.businessHourRepo.create({
        dayOfWeek: h.dayOfWeek,
        startTime: h.startTime,
        endTime: h.endTime,
      }),
    );
    if (rows.length) await this.businessHourRepo.save(rows);
  }

  /**
   * Resolves the effective OpenRouter credentials: DB config first, env fallback.
   * Used by the agent — never exposed over the API.
   */
  async resolveModelCredentials(): Promise<{ apiKey: string | null; model: string | null }> {
    const config = await this.getRawConfig();
    return {
      apiKey: config.openRouterApiKey ?? process.env.OPENROUTER_API_KEY ?? null,
      model: config.agentModel ?? process.env.AGENT_MODEL ?? null,
    };
  }
}

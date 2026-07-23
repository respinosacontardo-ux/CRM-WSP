import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    private readonly events: EventsService,
  ) {}

  /** List leads, optionally filtered by a free-text search. */
  async findAll(search?: string): Promise<Lead[]> {
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      return this.leadRepo.find({
        where: [
          { name: ILike(term) },
          { phone: ILike(term) },
          { email: ILike(term) },
          { company: ILike(term) },
        ],
        order: { createdAt: 'DESC' },
      });
    }
    return this.leadRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id },
      relations: { appointments: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async findByPhone(phone: string): Promise<Lead | null> {
    return this.leadRepo.findOne({ where: { phone } });
  }

  async create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadRepo.create({
      name: dto.name,
      phone: this.normalizePhone(dto.phone),
      email: dto.email ?? null,
      company: dto.company ?? null,
      interest: dto.interest ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.leadRepo.save(lead);
    this.events.emit({ type: 'lead.changed', data: { id: saved.id } });
    return saved;
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);
    if (dto.name !== undefined) lead.name = dto.name;
    if (dto.phone !== undefined) lead.phone = this.normalizePhone(dto.phone);
    if (dto.email !== undefined) lead.email = dto.email;
    if (dto.company !== undefined) lead.company = dto.company;
    if (dto.interest !== undefined) lead.interest = dto.interest;
    if (dto.notes !== undefined) lead.notes = dto.notes;
    const saved = await this.leadRepo.save(lead);
    this.events.emit({ type: 'lead.changed', data: { id: saved.id } });
    return saved;
  }

  async remove(id: string): Promise<void> {
    const lead = await this.findOne(id);
    await this.leadRepo.remove(lead);
    this.events.emit({ type: 'lead.changed', data: { id } });
  }

  /**
   * Finds a lead by phone or creates one. Used by the WhatsApp webhook so an
   * inbound message from an unknown number becomes a lead automatically.
   */
  async upsertByPhone(phone: string, name?: string): Promise<Lead> {
    const normalized = this.normalizePhone(phone);
    const existing = await this.findByPhone(normalized);
    if (existing) return existing;
    return this.create({ name: name?.trim() || normalized, phone: normalized });
  }

  private normalizePhone(phone: string): string {
    // Keep a leading + and digits only.
    const trimmed = phone.trim();
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : digits;
  }
}

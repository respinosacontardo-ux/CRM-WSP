import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationChannel } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { EventsService } from '../events/events.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly events: EventsService,
  ) {}

  /** All threads, most recently active first. */
  async listThreads(): Promise<Conversation[]> {
    return this.conversationRepo.find({
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async getThread(id: string): Promise<Conversation & { messages: Message[] }> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
    return { ...conversation, messages } as Conversation & { messages: Message[] };
  }

  /** Finds an open thread for a lead+channel, or creates one. */
  async getOrCreate(
    channel: ConversationChannel,
    leadId: string | null,
    title: string,
  ): Promise<Conversation> {
    if (leadId) {
      const existing = await this.conversationRepo.findOne({
        where: { channel, leadId },
      });
      if (existing) return existing;
    }
    const conversation = this.conversationRepo.create({ channel, leadId, title });
    const saved = await this.conversationRepo.save(conversation);
    this.events.emit({ type: 'conversation.changed', data: { id: saved.id } });
    return saved;
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
  ): Promise<Message> {
    const message = this.messageRepo.create({ conversationId, role, content });
    const saved = await this.messageRepo.save(message);

    await this.conversationRepo.update(conversationId, {
      lastMessageAt: saved.createdAt,
    });

    this.events.emit({ type: 'message.created', data: { conversationId } });
    this.events.emit({ type: 'conversation.changed', data: { id: conversationId } });
    return saved;
  }

  /** Recent messages for a conversation, oldest first (for agent context). */
  async recentMessages(conversationId: string, limit = 20): Promise<Message[]> {
    const rows = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return rows.reverse();
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AgentService } from './agent.service';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadsService } from '../leads/leads.service';

class PlaygroundMessageDto {
  @IsString()
  @MinLength(1)
  message: string;
}

/** Fixed identity for the in-app Playground so bookings can be tested end-to-end. */
const PLAYGROUND_PHONE = 'playground';
const PLAYGROUND_TITLE = 'Playground';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agent: AgentService,
    private readonly conversations: ConversationsService,
    private readonly leads: LeadsService,
  ) {}

  /** GET /api/agent/playground — the current playground thread. */
  @Get('playground')
  async getThread() {
    const conversation = await this.getPlaygroundConversation();
    return this.conversations.getThread(conversation.id);
  }

  /** POST /api/agent/playground — send a message to the agent from the app. */
  @Post('playground')
  async sendMessage(@Body() dto: PlaygroundMessageDto) {
    const lead = await this.leads.upsertByPhone(PLAYGROUND_PHONE, PLAYGROUND_TITLE);
    const conversation = await this.conversations.getOrCreate('playground', lead.id, PLAYGROUND_TITLE);

    await this.conversations.addMessage(conversation.id, 'user', dto.message);

    const history = await this.conversations.recentMessages(conversation.id, 20);
    // Exclude the just-added user message from history (it is passed separately).
    const priorHistory = history
      .slice(0, -1)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const reply = await this.agent.generateReply({
      leadId: lead.id,
      history: priorHistory,
      userText: dto.message,
    });

    if (reply.text) {
      await this.conversations.addMessage(conversation.id, 'assistant', reply.text);
    }

    return { reply: reply.text, ok: reply.ok, reason: reply.reason };
  }

  private async getPlaygroundConversation() {
    const lead = await this.leads.upsertByPhone(PLAYGROUND_PHONE, PLAYGROUND_TITLE);
    return this.conversations.getOrCreate('playground', lead.id, PLAYGROUND_TITLE);
  }
}

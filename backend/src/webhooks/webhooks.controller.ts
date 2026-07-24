import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { YCloudService } from './ycloud.service';
import { LeadsService } from '../leads/leads.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AgentService } from '../agent/agent.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly ycloud: YCloudService,
    private readonly leads: LeadsService,
    private readonly conversations: ConversationsService,
    private readonly agent: AgentService,
  ) {}

  /**
   * Single WhatsApp webhook: POST /api/webhooks/ycloud
   * Flow: verify signature -> 200 fast -> upsert lead -> agent replies ->
   * send via YCloud -> emit SSE. There is only one agent, so no :agentKey.
   */
  @Post('ycloud')
  @HttpCode(200)
  async handleYCloud(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: true }> {
    // FAIL-CLOSED: no secret configured or bad signature => reject.
    const valid = this.ycloud.verifySignature(req.rawBody, headers);
    if (!valid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const inbound = this.parseInbound(req.body);
    if (inbound) {
      // Respond 200 quickly; process the reply without blocking the ack.
      void this.processInbound(inbound);
    }

    return { received: true };
  }

  /** Extracts { from, text } from a YCloud inbound-message webhook payload. */
  private parseInbound(body: any): { from: string; text: string } | null {
    const msg = body?.whatsappInboundMessage ?? body?.data ?? body;
    const from = msg?.from ?? msg?.customerProfile?.phoneNumber;
    const text = msg?.text?.body ?? msg?.body;
    const type = msg?.type;
    if (!from || !text || (type && type !== 'text')) return null;
    return { from: String(from), text: String(text) };
  }

  private async processInbound(inbound: { from: string; text: string }): Promise<void> {
    try {
      const lead = await this.leads.upsertByPhone(inbound.from);
      const conversation = await this.conversations.getOrCreate(
        'whatsapp',
        lead.id,
        lead.name || inbound.from,
      );

      await this.conversations.addMessage(conversation.id, 'user', inbound.text);

      const history = await this.conversations.recentMessages(conversation.id, 20);
      const priorHistory = history
        .slice(0, -1)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const reply = await this.agent.generateReply({
        leadId: lead.id,
        history: priorHistory,
        userText: inbound.text,
      });

      if (reply.text) {
        await this.conversations.addMessage(conversation.id, 'assistant', reply.text);
        await this.ycloud.sendText(inbound.from, reply.text);
      }
    } catch (err) {
      // Never log message content (PII).
      this.logger.error(`Failed to process inbound message: ${(err as Error).message}`);
    }
  }
}

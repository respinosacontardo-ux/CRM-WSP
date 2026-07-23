import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { PostgresStore } from '@mastra/pg';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ConfigService } from '../config/config.service';
import { LeadsService } from '../leads/leads.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { buildAgentTools } from './agent.tools';
import { buildInstructions } from './agent.instructions';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentReply {
  ok: boolean;
  text: string;
  /** Reason the agent could not run (e.g. not configured / disabled). */
  reason?: 'disabled' | 'not_configured' | 'error';
}

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private agent!: Agent;
  // Mastra instance keeps its own storage in the SAME Postgres as TypeORM.
  private mastra!: Mastra;

  constructor(
    private readonly config: ConfigService,
    private readonly leads: LeadsService,
    private readonly appointments: AppointmentsService,
  ) {}

  onModuleInit(): void {
    const tools = buildAgentTools({
      leads: this.leads,
      appointments: this.appointments,
      config: this.config,
    });

    // Dynamic model + instructions: re-resolved from saved config on every run,
    // so changes made in the UI take effect without a restart.
    this.agent = new Agent({
      name: 'sales-agent',
      instructions: async () => {
        const cfg = await this.config.getSanitizedConfig();
        return buildInstructions(cfg, new Date().toISOString());
      },
      model: async () => {
        const { apiKey, model } = await this.config.resolveModelCredentials();
        if (!apiKey || !model) {
          throw new Error('AI model not configured');
        }
        const openrouter = createOpenRouter({ apiKey });
        return openrouter.chat(model);
      },
      tools,
    });

    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      try {
        this.mastra = new Mastra({
          agents: { salesAgent: this.agent },
          // Cast to satisfy a minor version skew between @mastra/core and
          // @mastra/pg; the store is API-compatible at runtime.
          storage: new PostgresStore({ connectionString }) as any,
          // Silence Mastra's own logger; we never want PII in logs.
          logger: false,
        });
      } catch (err) {
        this.logger.warn(`Mastra storage not initialized: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Generates the agent's reply for a conversation turn.
   * `history` is the prior messages (oldest first); `userText` is the new one.
   * `leadId` scopes the tools to the current contact.
   */
  async generateReply(params: {
    leadId: string | null;
    history: ChatTurn[];
    userText: string;
  }): Promise<AgentReply> {
    const cfg = await this.config.getSanitizedConfig();

    if (!cfg.agentEnabled) {
      return { ok: false, reason: 'disabled', text: '' };
    }
    if (!cfg.hasAnyApiKey || !cfg.agentModel) {
      return {
        ok: false,
        reason: 'not_configured',
        text: 'El agente todavía no está configurado. Añade una API key de OpenRouter y elige un modelo en la pantalla del Agente.',
      };
    }

    const runtimeContext = new RuntimeContext();
    runtimeContext.set('leadId', params.leadId);

    const messages = [
      ...params.history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: params.userText },
    ];

    try {
      const result = await this.agent.generate(messages as any, {
        runtimeContext,
        maxSteps: 6,
      });
      return { ok: true, text: result.text?.trim() || '' };
    } catch (err) {
      // Never log the message content (PII). Log only the error class/message.
      this.logger.error(`Agent generation failed: ${(err as Error).message}`);
      return {
        ok: false,
        reason: 'error',
        text: 'Ahora mismo no puedo responder. En breve te contactará una persona del equipo.',
      };
    }
  }
}

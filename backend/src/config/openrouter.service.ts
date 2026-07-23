import { Injectable, Logger } from '@nestjs/common';

export interface OpenRouterModel {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: string | null;
  curated: boolean;
}

/** A short, curated shortlist shown first in the model dropdown. */
const CURATED_MODEL_IDS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.1-70b-instruct',
];

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private cache: { at: number; models: OpenRouterModel[] } | null = null;
  private readonly cacheTtlMs = 10 * 60 * 1000;

  /**
   * Returns the live OpenRouter catalogue, flagging the curated shortlist.
   * Falls back to the curated list alone if the network call fails.
   */
  async listModels(): Promise<OpenRouterModel[]> {
    if (this.cache && Date.now() - this.cache.at < this.cacheTtlMs) {
      return this.cache.models;
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`OpenRouter responded ${res.status}`);
      const body = (await res.json()) as { data: any[] };

      const models: OpenRouterModel[] = (body.data ?? []).map((m) => ({
        id: m.id,
        name: m.name ?? m.id,
        contextLength: m.context_length ?? null,
        promptPrice: m.pricing?.prompt ?? null,
        curated: CURATED_MODEL_IDS.includes(m.id),
      }));

      models.sort((a, b) => Number(b.curated) - Number(a.curated) || a.name.localeCompare(b.name));
      this.cache = { at: Date.now(), models };
      return models;
    } catch (err) {
      this.logger.warn(`Could not fetch OpenRouter catalogue: ${(err as Error).message}`);
      return CURATED_MODEL_IDS.map((id) => ({
        id,
        name: id,
        contextLength: null,
        promptPrice: null,
        curated: true,
      }));
    }
  }
}

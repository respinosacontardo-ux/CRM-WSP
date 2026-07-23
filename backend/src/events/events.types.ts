/**
 * Names of the realtime events broadcast over SSE (GET /api/events).
 * The frontend listens for these to refresh the relevant views live.
 */
export type AppEventType =
  | 'lead.changed'
  | 'appointment.changed'
  | 'conversation.changed'
  | 'message.created'
  | 'agent.status';

export interface AppEvent {
  type: AppEventType;
  /** Optional payload (e.g. the affected id). Never include secrets or PII. */
  data?: Record<string, unknown>;
}

'use client';

import { useEffect, useRef } from 'react';
import { API_URL } from './api';

type AppEventType =
  | 'lead.changed'
  | 'appointment.changed'
  | 'conversation.changed'
  | 'message.created'
  | 'agent.status';

interface AppEvent {
  type: AppEventType | 'heartbeat';
  data?: Record<string, unknown>;
}

/**
 * Subscribes to the backend's single SSE endpoint (GET /api/events) using the
 * native EventSource. Calls `onEvent` for every app event (heartbeats ignored).
 */
export function useSSE(onEvent: (event: AppEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const source = new EventSource(`${API_URL}/api/events`);
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AppEvent;
        if (event.type === 'heartbeat') return;
        handlerRef.current(event);
      } catch {
        // ignore malformed frames
      }
    };
    source.onerror = () => {
      // EventSource auto-reconnects; nothing to do.
    };
    return () => source.close();
  }, []);
}

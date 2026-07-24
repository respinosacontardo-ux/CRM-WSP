/**
 * Tiny fetch wrapper around the backend API.
 * The base URL is baked at build time from NEXT_PUBLIC_API_URL.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Error ${res.status}`);
  }
  // Some endpoints (204) have no body.
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ---- Shared domain types (mirror the backend) ----

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  interest: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  appointments?: Appointment[];
}

export interface Appointment {
  id: string;
  leadId: string;
  lead?: Lead;
  meetingTypeName: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  source: 'manual' | 'agent';
  notes: string | null;
}

export interface MeetingType {
  id: string;
  name: string;
  durationMinutes: number;
  active: boolean;
}

export interface BusinessHour {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AppConfig {
  id: string;
  companyName: string;
  companyDescription: string;
  tone: string;
  timezone: string;
  agentEnabled: boolean;
  welcomeMessage: string | null;
  agentModel: string | null;
  hasOpenRouterApiKey: boolean;
  hasAnyApiKey: boolean;
  meetingTypes: MeetingType[];
  businessHours: BusinessHour[];
}

export interface Conversation {
  id: string;
  title: string;
  channel: 'whatsapp' | 'playground';
  lastMessageAt: string | null;
  leadId: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  appointmentsToday: number;
  upcomingAppointments: number;
  agentEnabled: boolean;
  agentConfigured: boolean;
  recentConversations: {
    id: string;
    title: string;
    channel: string;
    lastMessageAt: string | null;
  }[];
}

export interface OpenRouterModel {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: string | null;
  curated: boolean;
}

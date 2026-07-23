'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, DashboardMetrics } from '@/lib/api';
import { useSSE } from '@/lib/useSSE';
import { PageHeader, StatCard, Card, Badge, EmptyState } from '@/components/ui';
import { relativeFromNow } from '@/lib/format';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMetrics(await api.get<DashboardMetrics>('/dashboard'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh on any relevant change.
  useSSE(() => load());

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader title="Panel" subtitle="Resumen en tiempo real de tu CRM" />

      {error && <Card className="mb-4 text-red-600">No se pudo cargar: {error}</Card>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Leads" value={metrics?.totalLeads ?? '—'} hint="Contactos totales" />
        <StatCard label="Reuniones hoy" value={metrics?.appointmentsToday ?? '—'} />
        <StatCard label="Próximas reuniones" value={metrics?.upcomingAppointments ?? '—'} hint="Próximos 30 días" />
        <StatCard
          label="Estado del agente"
          value={
            metrics ? (
              metrics.agentEnabled && metrics.agentConfigured ? (
                <Badge color="green">Activo</Badge>
              ) : metrics.agentEnabled ? (
                <Badge color="amber">Sin configurar</Badge>
              ) : (
                <Badge color="slate">Apagado</Badge>
              )
            ) : (
              '—'
            )
          }
          hint={metrics && !metrics.agentConfigured ? 'Falta modelo de IA' : undefined}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">Conversaciones recientes</h2>
          <Link href="/conversaciones" className="text-sm text-brand hover:underline">
            Ver todas
          </Link>
        </div>
        {metrics && metrics.recentConversations.length === 0 && (
          <EmptyState>Todavía no hay conversaciones.</EmptyState>
        )}
        <ul className="divide-y divide-slate-100">
          {metrics?.recentConversations.map((c) => (
            <li key={c.id}>
              <Link
                href="/conversaciones"
                className="flex items-center justify-between py-3 hover:bg-slate-50 rounded-lg px-2 -mx-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.channel === 'whatsapp' ? '🟢' : '🧪'}</span>
                  <span className="font-medium text-slate-700">{c.title}</span>
                  <Badge color={c.channel === 'whatsapp' ? 'green' : 'violet'}>
                    {c.channel === 'whatsapp' ? 'WhatsApp' : 'Playground'}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">{relativeFromNow(c.lastMessageAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

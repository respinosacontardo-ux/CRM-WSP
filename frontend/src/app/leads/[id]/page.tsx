'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, Lead } from '@/lib/api';
import { useSSE } from '@/lib/useSSE';
import { PageHeader, Card, Badge, EmptyState } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, 'green' | 'slate' | 'red'> = {
  scheduled: 'green',
  completed: 'slate',
  cancelled: 'red',
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLead(await api.get<Lead>(`/leads/${params.id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useSSE((e) => {
    if (e.type === 'appointment.changed' || e.type === 'lead.changed') load();
  });

  if (error) return <div className="p-8 text-red-600">No se encontró el lead.</div>;
  if (!lead) return <div className="p-8 text-slate-400">Cargando…</div>;

  const appointments = (lead.appointments ?? []).sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/leads" className="text-sm text-brand hover:underline">
        ← Volver a leads
      </Link>
      <PageHeader title={lead.name} subtitle={lead.company ?? undefined} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">Datos de contacto</h3>
          <dl className="space-y-2 text-sm">
            <Row label="Teléfono (WhatsApp)" value={lead.phone} />
            <Row label="Email" value={lead.email ?? '—'} />
            <Row label="Empresa" value={lead.company ?? '—'} />
            <Row
              label="Interés"
              value={lead.interest ? <Badge color="violet">{lead.interest}</Badge> : '—'}
            />
          </dl>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-700 mb-3">Notas</h3>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes || 'Sin notas.'}</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold text-slate-700 mb-4">Reuniones / demos</h3>
        {appointments.length === 0 ? (
          <EmptyState>Este lead todavía no tiene reuniones.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {appointments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-slate-700">{a.meetingTypeName}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(a.startsAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {a.source === 'agent' && <Badge color="violet">Agendada por IA</Badge>}
                  <Badge color={STATUS_COLOR[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-700 text-right">{value}</dd>
    </div>
  );
}

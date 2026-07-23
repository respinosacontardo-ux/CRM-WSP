'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, Appointment } from '@/lib/api';
import { useSSE } from '@/lib/useSSE';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { AppointmentForm } from '@/components/AppointmentForm';
import { formatTime, formatDateTime } from '@/lib/format';

type View = 'month' | 'week';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
/** Monday of the week containing d. */
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}
function startOfMonthGrid(d: Date) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return startOfWeek(first);
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [creating, setCreating] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const range = useMemo(() => {
    if (view === 'week') {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7), days: 7, gridStart: from };
    }
    const gridStart = startOfMonthGrid(anchor);
    return { from: gridStart, to: addDays(gridStart, 42), days: 42, gridStart };
  }, [view, anchor]);

  const load = useCallback(async () => {
    const from = range.from.toISOString();
    const to = range.to.toISOString();
    setAppointments(await api.get<Appointment[]>(`/appointments?from=${from}&to=${to}`));
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  useSSE((e) => {
    if (e.type === 'appointment.changed') load();
  });

  const days = useMemo(
    () => Array.from({ length: range.days }, (_, i) => addDays(range.gridStart, i)),
    [range],
  );

  function apptsForDay(day: Date) {
    return appointments
      .filter((a) => a.status !== 'cancelled' && sameDay(new Date(a.startsAt), day))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  const monthLabel = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(anchor);

  async function cancelAppointment(a: Appointment) {
    await api.put(`/appointments/${a.id}`, { status: 'cancelled' });
    setSelected(null);
    load();
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Calendario"
        subtitle="Reuniones y demos"
        action={<Button onClick={() => setCreating(new Date())}>+ Nueva reunión</Button>}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAnchor(view === 'week' ? addDays(anchor, -7) : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}>
            ‹
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(new Date())}>
            Hoy
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(view === 'week' ? addDays(anchor, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}>
            ›
          </Button>
          <span className="ml-2 font-semibold text-slate-700 capitalize">{monthLabel}</span>
        </div>
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-1.5 ${view === 'month' ? 'bg-brand text-white' : 'bg-white text-slate-600'}`}
          >
            Mes
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-4 py-1.5 ${view === 'week' ? 'bg-brand text-white' : 'bg-white text-slate-600'}`}
          >
            Semana
          </button>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 text-xs font-medium text-slate-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 ${view === 'week' ? 'min-h-[400px]' : ''}`}>
          {days.map((day) => {
            const isToday = sameDay(day, new Date());
            const inMonth = view === 'week' || day.getMonth() === anchor.getMonth();
            const items = apptsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={`border-b border-r border-slate-100 p-1.5 ${view === 'week' ? 'min-h-[400px]' : 'min-h-[96px]'} ${
                  inMonth ? '' : 'bg-slate-50/50'
                }`}
                onClick={() => setCreating(day)}
              >
                <div
                  className={`text-xs mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                    isToday ? 'bg-brand text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(a);
                      }}
                      className="w-full truncate rounded bg-brand-light/15 px-1.5 py-1 text-left text-[11px] text-brand-dark hover:bg-brand-light/25"
                    >
                      {formatTime(a.startsAt)} · {a.lead?.name ?? a.meetingTypeName}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal open={!!creating} onClose={() => setCreating(null)} title="Nueva reunión">
        {creating && (
          <AppointmentForm
            initialDate={creating}
            onSaved={() => {
              setCreating(null);
              load();
            }}
            onCancel={() => setCreating(null)}
          />
        )}
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de la reunión">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Tipo</span>
              <span className="font-medium">{selected.meetingTypeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Lead</span>
              <span className="font-medium">{selected.lead?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cuándo</span>
              <span className="font-medium">{formatDateTime(selected.startsAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Origen</span>
              {selected.source === 'agent' ? <Badge color="violet">Agendada por IA</Badge> : <Badge>Manual</Badge>}
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="danger" onClick={() => cancelAppointment(selected)}>
                Cancelar reunión
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

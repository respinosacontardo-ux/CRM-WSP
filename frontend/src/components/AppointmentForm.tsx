'use client';

import { useEffect, useState } from 'react';
import { api, Appointment, Lead, MeetingType } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';
import { toDateInput, formatTime } from '@/lib/format';

interface Slot {
  startsAt: string;
  endsAt: string;
  label: string;
}

export function AppointmentForm({
  initialDate,
  onSaved,
  onCancel,
}: {
  initialDate?: Date;
  onSaved: (appointment: Appointment) => void;
  onCancel: () => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [leadId, setLeadId] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [date, setDate] = useState(toDateInput(initialDate ?? new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Lead[]>('/leads').then(setLeads);
    api.get<{ meetingTypes: MeetingType[] }>('/config').then((c: any) => {
      const types: MeetingType[] = c.meetingTypes.filter((t: MeetingType) => t.active);
      setMeetingTypes(types);
      if (types[0]) setMeetingType(types[0].name);
    });
  }, []);

  useEffect(() => {
    if (!meetingType || !date) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    api
      .get<Slot[]>(`/appointments/availability?date=${date}&meetingType=${encodeURIComponent(meetingType)}`)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [meetingType, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId || !meetingType || !selectedSlot) {
      setError('Elige un lead, un tipo de reunión y un horario.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.post<Appointment>('/appointments', {
        leadId,
        meetingTypeName: meetingType,
        startsAt: selectedSlot,
      });
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Lead *">
        <select
          value={leadId}
          onChange={(e) => setLeadId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="">Selecciona un lead…</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} · {l.phone}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo de reunión *">
          <select
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {meetingTypes.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name} ({t.durationMinutes} min)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha *">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Horario disponible *">
        {loadingSlots ? (
          <p className="text-sm text-slate-400">Buscando huecos…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-400">No hay huecos ese día (revisa los horarios de atención).</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto thin-scroll">
            {slots.map((s) => (
              <button
                type="button"
                key={s.startsAt}
                onClick={() => setSelectedSlot(s.startsAt)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  selectedSlot === s.startsAt
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-300 hover:border-brand'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !selectedSlot}>
          {saving ? 'Reservando…' : 'Reservar'}
        </Button>
      </div>
    </form>
  );
}

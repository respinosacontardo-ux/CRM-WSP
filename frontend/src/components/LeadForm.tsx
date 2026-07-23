'use client';

import { useState } from 'react';
import { api, Lead } from '@/lib/api';
import { Button, Field, Input, Textarea } from '@/components/ui';

const INTERESTS = ['Instagram', 'Facebook', 'YouTube', 'TikTok', 'WhatsApp Pro', 'Otro'];

export function LeadForm({
  lead,
  onSaved,
  onCancel,
}: {
  lead?: Lead;
  onSaved: (lead: Lead) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(lead?.name ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [company, setCompany] = useState(lead?.company ?? '');
  const [interest, setInterest] = useState(lead?.interest ?? '');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name, phone, email, company, interest, notes };
      const saved = lead
        ? await api.put<Lead>(`/leads/${lead.id}`, payload)
        : await api.post<Lead>('/leads', payload);
      onSaved(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre *">
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nombre del contacto" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Teléfono (WhatsApp) *">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+549..." />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@..." />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Empresa / negocio">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nombre del negocio" />
        </Field>
        <Field label="Producto de interés">
          <select
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">—</option>
            {INTERESTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Notas">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas internas" />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

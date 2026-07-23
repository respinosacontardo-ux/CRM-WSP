'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Lead } from '@/lib/api';
import { useSSE } from '@/lib/useSSE';
import { PageHeader, Card, Button, Input, Badge, EmptyState } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { LeadForm } from '@/components/LeadForm';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const load = useCallback(async (term: string) => {
    const query = term ? `?search=${encodeURIComponent(term)}` : '';
    setLeads(await api.get<Lead[]>(`/leads${query}`));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  useSSE((e) => {
    if (e.type === 'lead.changed') load(search);
  });

  async function handleDelete(lead: Lead) {
    if (!confirm(`¿Borrar a ${lead.name}? Esto también borra sus reuniones.`)) return;
    await api.del(`/leads/${lead.id}`);
    load(search);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Leads"
        subtitle="Contactos interesados en tu software"
        action={<Button onClick={() => setCreating(true)}>+ Nuevo lead</Button>}
      />

      <Card className="mb-4">
        <Input
          placeholder="Buscar por nombre, teléfono, email o empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="!p-0 overflow-hidden">
        {leads.length === 0 ? (
          <EmptyState>No hay leads que coincidan.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Interés</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-brand hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{lead.phone}</td>
                  <td className="px-5 py-3 text-slate-600">{lead.company ?? '—'}</td>
                  <td className="px-5 py-3">{lead.interest ? <Badge color="violet">{lead.interest}</Badge> : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => setEditing(lead)}>
                        Editar
                      </Button>
                      <Button variant="ghost" className="text-red-500" onClick={() => handleDelete(lead)}>
                        Borrar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo lead">
        <LeadForm
          onSaved={() => {
            setCreating(false);
            load(search);
          }}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar lead">
        {editing && (
          <LeadForm
            lead={editing}
            onSaved={() => {
              setEditing(null);
              load(search);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

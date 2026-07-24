'use client';

import { useEffect, useState } from 'react';
import { api, AppConfig, BusinessHour, MeetingType, OpenRouterModel } from '@/lib/api';
import { PageHeader, Card, Button, Input, Field, Textarea, Badge } from '@/components/ui';
import { Playground } from '@/components/Playground';

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export default function AgentPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [showAllModels, setShowAllModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AppConfig>('/config').then(setConfig);
    api.get<OpenRouterModel[]>('/config/models').then(setModels).catch(() => setModels([]));
  }, []);

  if (!config) return <div className="p-8 text-slate-400">Cargando…</div>;

  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  function updateMeetingType(index: number, patch: Partial<MeetingType>) {
    setConfig((c) => {
      if (!c) return c;
      const meetingTypes = [...c.meetingTypes];
      meetingTypes[index] = { ...meetingTypes[index], ...patch };
      return { ...c, meetingTypes };
    });
  }

  function addMeetingType() {
    setConfig((c) =>
      c
        ? {
            ...c,
            meetingTypes: [
              ...c.meetingTypes,
              { id: `new-${Date.now()}`, name: '', durationMinutes: 30, active: true },
            ],
          }
        : c,
    );
  }

  function removeMeetingType(index: number) {
    setConfig((c) =>
      c ? { ...c, meetingTypes: c.meetingTypes.filter((_, i) => i !== index) } : c,
    );
  }

  function addBusinessHour(day: number) {
    setConfig((c) =>
      c
        ? { ...c, businessHours: [...c.businessHours, { dayOfWeek: day, startTime: '09:00', endTime: '14:00' }] }
        : c,
    );
  }

  function updateBusinessHour(index: number, patch: Partial<BusinessHour>) {
    setConfig((c) => {
      if (!c) return c;
      const businessHours = [...c.businessHours];
      businessHours[index] = { ...businessHours[index], ...patch };
      return { ...c, businessHours };
    });
  }

  function removeBusinessHour(index: number) {
    setConfig((c) =>
      c ? { ...c, businessHours: c.businessHours.filter((_, i) => i !== index) } : c,
    );
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        companyName: config.companyName,
        companyDescription: config.companyDescription,
        tone: config.tone,
        timezone: config.timezone,
        agentEnabled: config.agentEnabled,
        welcomeMessage: config.welcomeMessage ?? '',
        agentModel: config.agentModel,
        meetingTypes: config.meetingTypes
          .filter((m) => m.name.trim())
          .map((m) => ({ name: m.name, durationMinutes: Number(m.durationMinutes), active: m.active })),
        businessHours: config.businessHours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      };
      // Only send the API key if the user typed a new one.
      if (apiKey.trim()) payload.openRouterApiKey = apiKey.trim();

      const updated = await api.put<AppConfig>('/config', payload);
      setConfig(updated);
      setApiKey('');
      setSavedAt(new Date().toLocaleTimeString('es-ES'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const visibleModels = showAllModels ? models : models.filter((m) => m.curated);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Agente"
        subtitle="Configura tu asistente de WhatsApp"
        action={
          <div className="flex items-center gap-3">
            {savedAt && <span className="text-xs text-green-600">Guardado a las {savedAt}</span>}
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        }
      />

      {error && <Card className="mb-4 text-red-600">{error}</Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Persona */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700">Persona de la empresa</h2>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Agente</span>
                <button
                  onClick={() => update('agentEnabled', !config.agentEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    config.agentEnabled ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      config.agentEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <Badge color={config.agentEnabled ? 'green' : 'slate'}>
                  {config.agentEnabled ? 'Activado' : 'Apagado'}
                </Badge>
              </label>
            </div>
            <div className="space-y-4">
              <Field label="Nombre">
                <Input value={config.companyName} onChange={(e) => update('companyName', e.target.value)} />
              </Field>
              <Field label="Descripción">
                <Textarea
                  rows={3}
                  value={config.companyDescription}
                  onChange={(e) => update('companyDescription', e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Tono">
                  <Input value={config.tone} onChange={(e) => update('tone', e.target.value)} />
                </Field>
                <Field label="Zona horaria">
                  <Input value={config.timezone} onChange={(e) => update('timezone', e.target.value)} />
                </Field>
              </div>
              <Field label="Mensaje de bienvenida automático">
                <Textarea
                  rows={6}
                  value={config.welcomeMessage ?? ''}
                  onChange={(e) => update('welcomeMessage', e.target.value)}
                  placeholder="Si lo rellenas, este mensaje se envía tal cual cuando alguien te escribe por primera vez. Déjalo vacío para que responda directamente el agente."
                />
                <p className="text-xs text-slate-400 mt-1">
                  Se envía solo en el PRIMER mensaje de cada persona. Luego responde el agente. Déjalo vacío para desactivarlo.
                </p>
              </Field>
            </div>
          </Card>

          {/* AI model */}
          <Card>
            <h2 className="font-semibold text-slate-700 mb-4">Modelo de IA (OpenRouter)</h2>
            <div className="space-y-4">
              <Field label="API key de OpenRouter">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={config.hasOpenRouterApiKey ? '•••••••• (ya configurada, escribe para cambiarla)' : 'sk-or-...'}
                />
              </Field>
              <Field label="Modelo">
                <select
                  value={config.agentModel ?? ''}
                  onChange={(e) => update('agentModel', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  <option value="">Selecciona un modelo…</option>
                  {visibleModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-500">
                <input type="checkbox" checked={showAllModels} onChange={(e) => setShowAllModels(e.target.checked)} />
                Ver todos los modelos ({models.length})
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Meeting types */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700">Tipos de reunión</h2>
              <Button variant="secondary" onClick={addMeetingType}>
                + Añadir
              </Button>
            </div>
            <div className="space-y-2">
              {config.meetingTypes.map((m, i) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Input value={m.name} onChange={(e) => updateMeetingType(i, { name: e.target.value })} placeholder="Nombre" />
                  <Input
                    type="number"
                    value={m.durationMinutes}
                    onChange={(e) => updateMeetingType(i, { durationMinutes: Number(e.target.value) })}
                    className="w-20"
                  />
                  <span className="text-xs text-slate-400">min</span>
                  <button onClick={() => removeMeetingType(i)} className="text-red-400 hover:text-red-600 px-1">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Business hours */}
          <Card>
            <h2 className="font-semibold text-slate-700 mb-4">Horarios de atención</h2>
            <div className="space-y-3">
              {DAYS.map((day) => {
                const dayHours = config.businessHours
                  .map((h, i) => ({ h, i }))
                  .filter(({ h }) => h.dayOfWeek === day.value);
                return (
                  <div key={day.value} className="flex items-start gap-3">
                    <div className="w-24 text-sm text-slate-600 pt-2">{day.label}</div>
                    <div className="flex-1 space-y-2">
                      {dayHours.length === 0 && <div className="text-xs text-slate-300 pt-2">Cerrado</div>}
                      {dayHours.map(({ h, i }) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={h.startTime}
                            onChange={(e) => updateBusinessHour(i, { startTime: e.target.value })}
                            className="w-28"
                          />
                          <span className="text-slate-400">–</span>
                          <Input
                            type="time"
                            value={h.endTime}
                            onChange={(e) => updateBusinessHour(i, { endTime: e.target.value })}
                            className="w-28"
                          />
                          <button onClick={() => removeBusinessHour(i)} className="text-red-400 hover:text-red-600 px-1">
                            ×
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addBusinessHour(day.value)} className="text-xs text-brand hover:underline">
                        + Añadir franja
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <Playground />
      </div>
    </div>
  );
}

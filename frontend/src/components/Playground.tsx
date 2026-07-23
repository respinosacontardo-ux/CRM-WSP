'use client';

import { useEffect, useRef, useState } from 'react';
import { api, Message } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { formatTime } from '@/lib/format';

export function Playground() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ messages: Message[] }>('/agent/playground')
      .then((t) => setMessages(t.messages ?? []))
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    setNotice(null);
    // Optimistic user message.
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() },
    ]);
    try {
      const res = await api.post<{ reply: string; ok: boolean; reason?: string }>('/agent/playground', {
        message: text,
      });
      if (res.reply) {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: res.reply, createdAt: new Date().toISOString() },
        ]);
      }
      if (!res.ok && res.reason === 'disabled') setNotice('El agente está apagado. Actívalo arriba para probarlo.');
      if (!res.ok && res.reason === 'not_configured')
        setNotice('Falta configurar el modelo de IA (API key de OpenRouter + modelo).');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px] rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="font-semibold text-slate-700">🧪 Playground</div>
        <div className="text-xs text-slate-400">Chatea con el agente sin usar WhatsApp</div>
      </div>
      <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-10">
            Escribe un mensaje para empezar. Por ejemplo: “Hola, ¿qué demos ofrecéis?”
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.role === 'user' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {sending && <div className="text-xs text-slate-400">El agente está escribiendo…</div>}
        <div ref={bottomRef} />
      </div>
      {notice && <div className="px-4 py-2 text-xs text-amber-600 bg-amber-50">{notice}</div>}
      <div className="border-t border-slate-100 p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe un mensaje…"
        />
        <Button onClick={send} disabled={sending}>
          Enviar
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, Conversation, Message } from '@/lib/api';
import { useSSE } from '@/lib/useSSE';
import { PageHeader, Badge, EmptyState } from '@/components/ui';
import { relativeFromNow, formatTime } from '@/lib/format';

export default function ConversationsPage() {
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const list = await api.get<Conversation[]>('/conversations');
    setThreads(list);
    setActiveId((prev) => prev ?? list[0]?.id ?? null);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const thread = await api.get<Conversation & { messages: Message[] }>(`/conversations/${id}`);
    setMessages(thread.messages ?? []);
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  useSSE((e) => {
    if (e.type === 'conversation.changed') loadThreads();
    if (e.type === 'message.created') {
      loadThreads();
      if (activeId && e.data?.conversationId === activeId) loadMessages(activeId);
    }
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const active = threads.find((t) => t.id === activeId);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader title="Conversaciones" subtitle="Mensajes de WhatsApp y del Playground" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
        {/* Thread list */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-y-auto thin-scroll">
          {threads.length === 0 ? (
            <EmptyState>No hay conversaciones todavía.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                      activeId === t.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 truncate">{t.title}</span>
                      <span className="text-[11px] text-slate-400">{relativeFromNow(t.lastMessageAt)}</span>
                    </div>
                    <Badge color={t.channel === 'whatsapp' ? 'green' : 'violet'}>
                      {t.channel === 'whatsapp' ? 'WhatsApp' : 'Playground'}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Message panel */}
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white flex flex-col">
          {active ? (
            <>
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="font-semibold text-slate-700">{active.title}</div>
              </div>
              <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-3">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                <div ref={bottomRef} />
              </div>
            </>
          ) : (
            <EmptyState>Selecciona una conversación.</EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? 'bg-slate-100 text-slate-700' : 'bg-brand text-white'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className={`mt-1 text-[10px] ${isUser ? 'text-slate-400' : 'text-white/70'}`}>
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

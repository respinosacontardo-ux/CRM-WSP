'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Panel', icon: '📊' },
  { href: '/leads', label: 'Leads', icon: '👥' },
  { href: '/calendario', label: 'Calendario', icon: '📅' },
  { href: '/conversaciones', label: 'Conversaciones', icon: '💬' },
  { href: '/agente', label: 'Agente', icon: '🤖' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="text-lg font-bold text-brand">MKT BATTISTON</div>
        <div className="text-xs text-slate-400">CRM · Agente IA</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-[11px] text-slate-400 border-t border-slate-100">
        Herramienta interna. No exponer a internet sin autenticación.
      </div>
    </aside>
  );
}

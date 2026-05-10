'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function RuntimeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[240px_1fr_220px]">
      <aside className="border-r border-zinc-800 p-3">
        <h2 className="mb-3 text-sm uppercase text-zinc-500">Threads</h2>
        <Link className="block rounded bg-zinc-900 p-2 text-sm" href="/runtime">New session</Link>
      </aside>
      <section className="min-h-0 overflow-auto">{children}</section>
      <aside className="hidden border-l border-zinc-800 p-3 md:block">
        <h2 className="text-sm uppercase text-zinc-500">Runtime</h2>
        <p className="mt-2 text-xs text-zinc-400">Model: gpt-4.1-mini</p>
        <p className="text-xs text-zinc-400">State: connected</p>
        <p className="text-xs text-zinc-400">Route: {pathname}</p>
      </aside>
    </div>
  );
}

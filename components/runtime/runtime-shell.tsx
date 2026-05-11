'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface Thread {
  id: string;
  title: string | null;
  updated_at: string;
}

export function RuntimeShell({
  children,
  threads,
}: {
  children: React.ReactNode;
  threads: Thread[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function newThread() {
    setCreating(true);
    try {
      const res = await fetch('/api/threads', { method: 'POST' });
      const { id } = await res.json();
      router.push(`/runtime/${id}`);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  const activeThreadId = pathname.startsWith('/runtime/')
    ? pathname.split('/')[2]
    : null;

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[240px_1fr_220px]">

      {/* ── Left sidebar — threads ── */}
      <aside className="flex flex-col border-r border-zinc-800 overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-zinc-500">Threads</span>
          <button
            onClick={newThread}
            disabled={creating}
            className="text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-40 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
          >
            {creating ? '…' : '+ New'}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {threads.length === 0 && (
            <p className="text-xs text-zinc-600 p-2">No threads yet.</p>
          )}
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/runtime/${t.id}`}
              className={`block rounded px-2 py-1.5 text-xs truncate transition-colors ${
                activeThreadId === t.id
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {t.title ?? 'Untitled thread'}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Center — content ── */}
      <section className="min-h-0 overflow-auto">{children}</section>

      {/* ── Right sidebar — runtime info ── */}
      <aside className="hidden border-l border-zinc-800 p-3 md:flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Runtime</p>
          <p className="text-xs text-zinc-400">Model: gpt-4.1-mini</p>
          <p className="text-xs text-zinc-400">State: connected</p>
        </div>
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Memory</p>
          <p className="text-xs text-zinc-400">pgvector active</p>
          <p className="text-xs text-zinc-400">AKBs: retrieval on</p>
          <p className="text-xs text-zinc-500 mt-1">/remember &lt;text&gt;</p>
        </div>
      </aside>

    </div>
  );
}

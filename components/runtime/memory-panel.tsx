'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Akb {
  id: string;
  title: string;
  content: string;
  scope: string;
  truth_rank: number;
  governance_status: string;
  created_at: string;
}

const SCOPE_ORDER = ['global', 'canonical_akb', 'project', 'entity', 'thread', 'session'];

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function MemoryPanel({ initial }: { initial: Akb[] }) {
  const router = useRouter();
  const [akbs, setAkbs] = useState<Akb[]>(initial);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState('project');
  const [truthRank, setTruthRank] = useState(3);
  const [creating, setCreating] = useState(false);

  async function deleteAkb(id: string) {
    setAkbs((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/akbs/${id}`, { method: 'DELETE' });
    startTransition(() => router.refresh());
  }

  async function createAkb(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/akbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), scope, truth_rank: truthRank }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setScope('project');
        setTruthRank(3);
        setShowCreate(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setCreating(false);
    }
  }

  const grouped = SCOPE_ORDER.reduce<Record<string, Akb[]>>((acc, s) => {
    const items = akbs.filter((a) => a.scope === s);
    if (items.length) acc[s] = items;
    return acc;
  }, {});

  // Also catch any scopes not in the order
  const otherScopes = akbs
    .filter((a) => !SCOPE_ORDER.includes(a.scope))
    .map((a) => a.scope);
  for (const s of [...new Set(otherScopes)]) {
    grouped[s] = akbs.filter((a) => a.scope === s);
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Operational Memory</p>
          <p className="text-xs text-zinc-600 mt-0.5">{akbs.length} AKB{akbs.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded transition-colors"
        >
          {showCreate ? 'cancel' : '+ New AKB'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createAkb} className="border border-zinc-700 rounded p-4 mb-6 space-y-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">New AKB</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-zinc-900 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content"
            rows={3}
            className="w-full bg-zinc-900 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 resize-none"
          />
          <div className="flex gap-3">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="bg-zinc-900 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none border border-zinc-700"
            >
              {SCOPE_ORDER.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={truthRank}
              onChange={(e) => setTruthRank(Number(e.target.value))}
              className="bg-zinc-900 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none border border-zinc-700"
            >
              {[1, 2, 3, 4, 5, 6].map((r) => (
                <option key={r} value={r}>rank {r}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creating || !title.trim() || !content.trim()}
              className="ml-auto rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
            >
              {creating ? 'saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {akbs.length === 0 && (
        <p className="text-xs text-zinc-600 text-center mt-12">
          No memory yet. Use /remember &lt;text&gt; in any thread, or create an AKB above.
        </p>
      )}

      {/* AKBs grouped by scope */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([scopeKey, items]) => (
          <div key={scopeKey}>
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">{scopeKey}</p>
            <div className="space-y-2">
              {items
                .sort((a, b) => a.truth_rank - b.truth_rank)
                .map((akb) => (
                  <div
                    key={akb.id}
                    className="border border-zinc-800 rounded p-3 group hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-zinc-500 border border-zinc-700 px-1">
                            rank {akb.truth_rank}
                          </span>
                          <span className="text-xs text-zinc-600">{formatAge(akb.created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-200 font-medium truncate">{akb.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {akb.content}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteAkb(akb.id)}
                        disabled={isPending}
                        className="text-zinc-700 hover:text-zinc-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0"
                        aria-label="Delete AKB"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

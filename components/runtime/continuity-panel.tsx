'use client';

import { useCompletion } from 'ai/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STALE_MS = 4 * 60 * 60 * 1000;

interface Snapshot {
  id: string;
  content: string;
  generated_at: string;
}

export function ContinuityPanel({ initial }: { initial: Snapshot | null }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(initial);

  const { completion, complete, isLoading } = useCompletion({
    api: '/api/continuity/snapshot',
    onFinish: () => {
      // Refresh to pick up the persisted snapshot from DB
      router.refresh();
    },
  });

  const isStale =
    !snapshot ||
    Date.now() - new Date(snapshot.generated_at).getTime() > STALE_MS;

  // Auto-generate on mount if no fresh snapshot
  useEffect(() => {
    if (isStale && !isLoading) {
      complete('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While streaming, show the live completion; once done, show the snapshot
  const displayContent = isLoading ? completion : snapshot?.content ?? completion;

  function regenerate() {
    setSnapshot(null);
    complete('');
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">Operational State</p>
          {snapshot?.generated_at && !isLoading && (
            <p className="text-xs text-zinc-600 mt-0.5">{formatAge(snapshot.generated_at)}</p>
          )}
        </div>
        <button
          onClick={regenerate}
          disabled={isLoading}
          className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40 transition-colors border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded"
        >
          {isLoading ? 'generating…' : 'regenerate'}
        </button>
      </div>

      {/* Content */}
      {!displayContent && !isLoading && (
        <p className="text-xs text-zinc-600">No snapshot yet.</p>
      )}

      {isLoading && !completion && (
        <div className="space-y-2">
          <div className="h-2 bg-zinc-800 rounded animate-pulse w-3/4" />
          <div className="h-2 bg-zinc-800 rounded animate-pulse w-1/2" />
          <div className="h-2 bg-zinc-800 rounded animate-pulse w-5/6" />
        </div>
      )}

      {displayContent && (
        <div className="space-y-5">
          {parseSnapshot(displayContent).map(({ label, body }) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{body}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// Parse the snapshot text into labeled sections
function parseSnapshot(text: string): { label: string; body: string }[] {
  const sectionHeaders = ['ACTIVE', 'RECENT', 'UNRESOLVED', 'MEMORY IN PLAY', 'NEXT'];
  const result: { label: string; body: string }[] = [];

  let remaining = text.trim();

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    const idx = remaining.indexOf(header);
    if (idx === -1) continue;

    // Find where this section's body ends (at the next header or end of string)
    let bodyStart = idx + header.length;
    while (bodyStart < remaining.length && remaining[bodyStart] === '\n') bodyStart++;

    let bodyEnd = remaining.length;
    for (let j = i + 1; j < sectionHeaders.length; j++) {
      const nextIdx = remaining.indexOf(sectionHeaders[j], bodyStart);
      if (nextIdx !== -1 && nextIdx < bodyEnd) bodyEnd = nextIdx;
    }

    const body = remaining.slice(bodyStart, bodyEnd).trim();
    if (body) result.push({ label: header, body });
  }

  // If parsing found nothing (model formatted differently), show raw
  if (result.length === 0 && text.trim()) {
    result.push({ label: 'STATE', body: text.trim() });
  }

  return result;
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

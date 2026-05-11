import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';

const STALE_HOURS = 4;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('continuity_snapshots')
    .select('id, content, generated_at, context_summary')
    .eq('user_id', user.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  return Response.json(data ?? null);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // ── Gather operational context ─────────────────────────────────────────────

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: threads }, { data: recentMessages }, { data: akbs }] = await Promise.all([
    supabase
      .from('threads')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('messages')
      .select('role, content, created_at, thread_id')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('akbs')
      .select('title, content, scope, truth_rank')
      .eq('user_id', user.id)
      .eq('governance_status', 'approved')
      .order('truth_rank', { ascending: true })
      .limit(10),
  ]);

  // ── Build context string ───────────────────────────────────────────────────

  const contextParts: string[] = [];

  if (threads?.length) {
    contextParts.push('RECENT THREADS:');
    for (const t of threads) {
      const age = formatAge(t.updated_at);
      contextParts.push(`- "${t.title ?? 'Untitled'}" (${age})`);
    }
  }

  if (akbs?.length) {
    contextParts.push('\nOPERATIONAL MEMORY (AKBs):');
    for (const a of akbs) {
      contextParts.push(`- [rank ${a.truth_rank}] ${a.title}: ${a.content.slice(0, 200)}`);
    }
  }

  if (recentMessages?.length) {
    contextParts.push('\nRECENT MESSAGES (last 7 days, newest first):');
    for (const m of recentMessages.slice(0, 20)) {
      contextParts.push(`[${m.role}]: ${m.content.slice(0, 150)}`);
    }
  }

  const context = contextParts.length
    ? contextParts.join('\n')
    : 'No threads or messages yet. This is a fresh runtime.';

  const contextSummary = {
    thread_count: threads?.length ?? 0,
    message_count: recentMessages?.length ?? 0,
    akb_count: akbs?.length ?? 0,
  };

  // ── Stream snapshot ────────────────────────────────────────────────────────

  const result = streamText({
    model: openai('gpt-4.1-mini'),
    system: `You are TELA One's continuity engine. Generate a terse operational state brief for Jon Hartman.
Be direct. No padding. Each section: 1-3 lines max. Use plain text, not markdown headers with #.
If a section has nothing to report, omit it entirely.`,
    messages: [
      {
        role: 'user',
        content: `Generate an operational continuity snapshot from this runtime context:\n\n${context}\n\nFormat exactly as:\n\nACTIVE\n[what's currently in play]\n\nRECENT\n[what happened lately]\n\nUNRESOLVED\n[open threads, unanswered questions, pending decisions]\n\nMEMORY IN PLAY\n[relevant AKBs that apply]\n\nNEXT\n[what likely needs attention]`,
      },
    ],
    async onFinish({ text }) {
      await supabase.from('continuity_snapshots').insert({
        user_id: user.id,
        content: text,
        context_summary: contextSummary,
      });
    },
  });

  return result.toDataStreamResponse({ sendUsage: false });
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export { STALE_HOURS };

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, embeddingToSql } from '@/lib/embeddings';
import { retrieveContext, buildSystemPrompt } from '@/lib/retrieval';

export async function POST(req: Request) {
  const { messages, threadId } = await req.json();
  const latest = messages.at(-1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // ── /remember command ──────────────────────────────────────────────────────
  if (latest?.content?.startsWith('/remember ')) {
    const content = (latest.content as string).slice(10).trim();
    if (content) {
      const embedding = await generateEmbedding(content).catch(() => null);
      await supabase.from('akbs').insert({
        user_id: user.id,
        title: content.slice(0, 80),
        content,
        scope: 'project',
        truth_rank: 3,
        governance_status: 'approved',
        ...(embedding ? { embedding: embeddingToSql(embedding) } : {}),
      });
      await supabase.from('messages').insert([
        { thread_id: threadId, role: 'user', content: latest.content },
        { thread_id: threadId, role: 'assistant', content: `Saved to operational memory.` },
      ]);
    }
    const result = streamText({
      model: openai('gpt-4.1-mini'),
      messages: [{ role: 'user', content: 'Say exactly: "Saved to operational memory."' }],
    });
    return result.toDataStreamResponse({ sendUsage: false });
  }

  // ── Embedding + retrieval ──────────────────────────────────────────────────
  let systemPrompt = "You are TELA One — Jon Hartman's sovereign operational runtime. Be direct and operationally focused.";
  let queryEmbedding: number[] | null = null;

  try {
    queryEmbedding = await generateEmbedding(latest?.content ?? '');
    const context = await retrieveContext(supabase, user.id, queryEmbedding);
    systemPrompt = buildSystemPrompt(context);
  } catch {
    // retrieval failure is non-fatal — proceed without memory injection
  }

  // ── Persist user message ───────────────────────────────────────────────────
  if (latest?.content) {
    await supabase.from('messages').insert({
      thread_id: threadId,
      role: 'user',
      content: latest.content,
      ...(queryEmbedding ? { embedding: embeddingToSql(queryEmbedding) } : {}),
    });
  }

  // ── Set thread title from first message ───────────────────────────────────
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId);

  if (count === 1 && latest?.content) {
    const title = (latest.content as string).slice(0, 60);
    await supabase.from('threads').update({ title, updated_at: new Date().toISOString() }).eq('id', threadId);
  } else {
    await supabase.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
  }

  // ── Stream ─────────────────────────────────────────────────────────────────
  const result = streamText({
    model: openai('gpt-4.1-mini'),
    system: systemPrompt,
    messages,
    async onFinish({ text }) {
      const assistantEmbedding = await generateEmbedding(text).catch(() => null);
      await supabase.from('messages').insert({
        thread_id: threadId,
        role: 'assistant',
        content: text,
        ...(assistantEmbedding ? { embedding: embeddingToSql(assistantEmbedding) } : {}),
      });
    },
  });

  return result.toDataStreamResponse({ sendUsage: true });
}

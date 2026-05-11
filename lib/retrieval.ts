import type { SupabaseClient } from '@supabase/supabase-js';

export interface AkbResult {
  id: string;
  title: string;
  content: string;
  scope: string;
  truth_rank: number;
  similarity: number;
}

export interface MessageResult {
  id: string;
  content: string;
  role: string;
  thread_id: string;
  similarity: number;
}

export interface RetrievedContext {
  akbs: AkbResult[];
  messages: MessageResult[];
}

export async function retrieveContext(
  supabase: SupabaseClient,
  userId: string,
  queryEmbedding: number[],
): Promise<RetrievedContext> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const [akbResult, msgResult] = await Promise.all([
    supabase.rpc('search_akbs', {
      query_embedding: embeddingStr,
      match_user_id: userId,
      match_threshold: 0.5,
      match_count: 5,
    }),
    supabase.rpc('search_messages', {
      query_embedding: embeddingStr,
      match_user_id: userId,
      match_threshold: 0.6,
      match_count: 5,
    }),
  ]);

  return {
    akbs: (akbResult.data as AkbResult[]) ?? [],
    messages: (msgResult.data as MessageResult[]) ?? [],
  };
}

export function buildSystemPrompt(context: RetrievedContext): string {
  const parts: string[] = [
    "You are TELA One — Jon Hartman's sovereign operational runtime. You have persistent memory across sessions. Be direct, useful, and operationally focused.",
  ];

  if (context.akbs.length > 0) {
    parts.push('\n## Operational Memory');
    for (const akb of context.akbs) {
      parts.push(`### ${akb.title}\n${akb.content}`);
    }
  }

  if (context.messages.length > 0) {
    parts.push('\n## Relevant Past Context');
    for (const msg of context.messages) {
      parts.push(`[${msg.role}]: ${msg.content}`);
    }
  }

  return parts.join('\n');
}

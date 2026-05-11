import { createClient } from '@/lib/supabase/server';
import { ChatPanel } from '@/components/runtime/chat-panel';
import type { Message } from 'ai';

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('messages')
    .select('id, role, content')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const initialMessages: Message[] = (data ?? []).map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  return <ChatPanel threadId={threadId} initialMessages={initialMessages} />;
}

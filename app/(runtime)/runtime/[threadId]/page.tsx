import { ChatPanel } from '@/components/runtime/chat-panel';

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  return <ChatPanel threadId={threadId} />;
}

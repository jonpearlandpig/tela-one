'use client';

import { useChat } from 'ai/react';

export function ChatPanel({ threadId }: { threadId: string }) {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/chat',
    body: { threadId }
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {messages.map((m) => <div key={m.id} className="rounded bg-zinc-900 p-3 text-sm"><strong>{m.role}:</strong> {m.content}</div>)}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3">
        <input value={input} onChange={handleInputChange} className="w-full rounded bg-zinc-900 p-3" placeholder="Continue thread..." />
        <p className="mt-1 text-xs text-zinc-500">{status}</p>
      </form>
    </div>
  );
}

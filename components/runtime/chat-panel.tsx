'use client';

import { useChat } from 'ai/react';
import type { Message, JSONValue } from 'ai';
import { useEffect, useRef } from 'react';

interface RoutingSummary {
  constitutional: Array<{ id: string; name: string }>;
  active: Array<{ id: string; name: string; title: string }>;
}

function extractRouting(data: JSONValue[] | undefined): RoutingSummary | null {
  if (!data) return null;
  for (let i = data.length - 1; i >= 0; i--) {
    const d = data[i];
    if (d && typeof d === 'object' && !Array.isArray(d) && 'routing' in d) {
      return (d as unknown as { routing: RoutingSummary }).routing;
    }
  }
  return null;
}

export function ChatPanel({
  threadId,
  initialMessages = [],
}: {
  threadId: string;
  initialMessages?: Message[];
}) {
  const { messages, input, handleInputChange, handleSubmit, status, data } = useChat({
    api: '/api/chat',
    body: { threadId },
    initialMessages,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isStreaming = status === 'streaming' || status === 'submitted';
  const routing = extractRouting(data);

  return (
    <div className="flex h-full flex-col">

      {/* Routing indicator — visible when active */}
      {routing && routing.active.length > 0 && (
        <div className="border-b border-zinc-800 px-4 py-1.5 flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-widest text-zinc-600">Routing</span>
          {routing.active.map((op) => (
            <span key={op.id} className="text-xs font-mono text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded">
              {op.name} <span className="text-zinc-600">·</span> <span className="text-zinc-600">{op.id}</span>
            </span>
          ))}
          <span className="text-xs text-zinc-700 ml-auto">
            {routing.constitutional.map((o) => o.name).join(' · ')}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-600 text-center mt-8">
            Begin thread. Use /remember &lt;text&gt; to save to memory.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded px-3 py-2 text-sm max-w-2xl ${
              m.role === 'user'
                ? 'bg-zinc-800 text-zinc-200 ml-auto'
                : 'bg-zinc-900 text-zinc-300'
            }`}
          >
            <p className={`text-xs uppercase tracking-widest mb-1 ${m.role === 'user' ? 'text-zinc-500' : 'text-zinc-600'}`}>
              {m.role === 'user' ? 'you' : 'tela'}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
          </div>
        ))}
        {isStreaming && (
          <div className="bg-zinc-900 rounded px-3 py-2 text-sm text-zinc-500 max-w-2xl">
            <p className="text-xs uppercase tracking-widest mb-1 text-zinc-600">tela</p>
            <span className="animate-pulse">···</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          disabled={isStreaming}
          className="flex-1 rounded bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
          placeholder={isStreaming ? 'Streaming…' : 'Continue thread…'}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded bg-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </form>

    </div>
  );
}

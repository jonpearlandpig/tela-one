import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { messages, threadId } = await req.json();
  const result = streamText({ model: openai('gpt-4.1-mini'), messages });

  const supabase = await createClient();
  const latest = messages.at(-1);
  if (latest?.content) {
    await supabase.from('messages').insert({ thread_id: threadId, role: 'user', content: latest.content });
  }

  return result.toDataStreamResponse({
    sendUsage: true
  });
}

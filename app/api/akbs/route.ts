import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, embeddingToSql } from '@/lib/embeddings';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('akbs')
    .select('id, title, content, scope, truth_rank, governance_status, freshness_score, created_at, updated_at')
    .eq('user_id', user.id)
    .order('truth_rank', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, content, scope = 'project', truth_rank = 3, provenance } = body;

  if (!title || !content) {
    return Response.json({ error: 'title and content required' }, { status: 400 });
  }

  const embedding = await generateEmbedding(`${title}\n${content}`).catch(() => null);

  const { data, error } = await supabase
    .from('akbs')
    .insert({
      user_id: user.id,
      title,
      content,
      scope,
      truth_rank,
      governance_status: 'approved',
      provenance: provenance ?? null,
      ...(embedding ? { embedding: embeddingToSql(embedding) } : {}),
    })
    .select('id, title, scope, truth_rank')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

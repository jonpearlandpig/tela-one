import { createClient } from '@/lib/supabase/server';
import { MemoryPanel } from '@/components/runtime/memory-panel';

export default async function MemoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = user
    ? await supabase
        .from('akbs')
        .select('id, title, content, scope, truth_rank, governance_status, created_at')
        .eq('user_id', user.id)
        .order('truth_rank', { ascending: true })
        .order('created_at', { ascending: false })
    : { data: [] };

  return <MemoryPanel initial={data ?? []} />;
}

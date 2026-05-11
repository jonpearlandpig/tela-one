import { createClient } from '@/lib/supabase/server';
import { ContinuityPanel } from '@/components/runtime/continuity-panel';

const STALE_MS = 4 * 60 * 60 * 1000;

export default async function RuntimePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let initial = null;
  if (user) {
    const { data } = await supabase
      .from('continuity_snapshots')
      .select('id, content, generated_at')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const age = Date.now() - new Date(data.generated_at).getTime();
      initial = age < STALE_MS ? data : null;
    }
  }

  return <ContinuityPanel initial={initial} />;
}

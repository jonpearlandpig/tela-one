import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RuntimeShell } from '@/components/runtime/runtime-shell';

export default async function RuntimeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  const { data: threads } = await supabase
    .from('threads')
    .select('id, title, updated_at')
    .eq('user_id', data.user.id)
    .order('updated_at', { ascending: false })
    .limit(30);

  return <RuntimeShell threads={threads ?? []}>{children}</RuntimeShell>;
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RuntimeShell } from '@/components/runtime/runtime-shell';

export default async function RuntimeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  return <RuntimeShell>{children}</RuntimeShell>;
}

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  async function signIn() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/runtime` } });
    setStatus(error ? error.message : 'Magic link sent.');
  }

  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
    <h1 className="text-2xl font-semibold">TELA One</h1>
    <input className="rounded border border-zinc-700 bg-zinc-900 p-3" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
    <button className="rounded bg-zinc-100 p-3 text-zinc-950" onClick={signIn}>Send magic link</button>
    <p className="text-sm text-zinc-400">{status}</p>
  </main>;
}

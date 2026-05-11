# TELA One

**Continuity-first operational runtime shell.**

TELA One is a minimal, stable, mobile-reliable AI chat runtime built with Next.js and Supabase. It prioritises staying connected and preserving your threads over feature density. There is no dashboard. There is no orchestration layer. There is a runtime, and it works.

---

## What it is

TELA One is a personal AI runtime shell — a persistent, authenticated environment where you carry on threaded conversations with a language model. Threads and messages are stored in your own Supabase database. Sessions survive page refreshes, reconnects, and device switches.

It is deliberately narrow in scope. Phase 1 is the runtime shell only: authentication, thread persistence, and streaming chat. Everything else comes later, if at all.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Auth & Database | Supabase (magic link OTP + Postgres + RLS) |
| AI | OpenAI `gpt-4.1-mini` via Vercel AI SDK |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## Features

- **Magic link authentication** — no passwords. Enter your email, click the link, you're in.
- **Persistent threads** — conversations are stored in Supabase and tied to your user account.
- **Streaming responses** — model output streams token-by-token using the Vercel AI SDK.
- **Row-level security** — users can only read and write their own threads and messages.
- **3-column shell layout** — thread sidebar, chat area, runtime status panel. Collapses gracefully on mobile.
- **Mobile-first** — designed to work on a phone as the primary device.
- **Protected routes** — `/runtime` and all sub-routes redirect to `/login` if unauthenticated.

---

## Project structure

```
app/
  (auth)/
    login/page.tsx          # Magic link sign-in
  (runtime)/
    runtime/
      layout.tsx            # Auth guard + shell wrapper
      page.tsx              # Thread selection placeholder
      [threadId]/page.tsx   # Active thread chat view
  api/
    chat/route.ts           # Streaming chat endpoint (POST)
  globals.css
  layout.tsx
  page.tsx                  # Redirects to /runtime

components/
  runtime/
    runtime-shell.tsx       # 3-column layout
    chat-panel.tsx          # Chat UI + message streaming

lib/
  supabase/
    client.ts               # Browser Supabase client
    server.ts               # Server-side Supabase client
    middleware.ts           # Session refresh for Edge runtime

middleware.ts               # Matches /runtime/:path*, refreshes session
supabase.sql                # Database schema + RLS policies
```

---

## Database schema

Run `supabase.sql` against your Supabase project to create the required tables and policies.

```sql
-- Threads belong to users
create table threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages belong to threads
create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Row-level security: users only see their own data
alter table threads enable row level security;
alter table messages enable row level security;

create policy "users manage own threads"
  on threads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own messages"
  on messages for all
  using (
    exists (
      select 1 from threads
      where threads.id = messages.thread_id
        and threads.user_id = auth.uid()
    )
  );
```

Messages cascade-delete when a thread is deleted. No orphaned rows.

---

## Auth flow

1. User visits `/login` and enters their email.
2. Supabase sends a magic link to that address.
3. Clicking the link sets a session cookie and redirects to `/runtime`.
4. The runtime layout server component checks for a valid session on every render. No session → redirect to `/login`.
5. The Next.js middleware runs on every `/runtime/:path*` request and refreshes the session cookie, keeping it alive across the user's visit.

---

## Chat flow

1. User navigates to `/runtime/[threadId]` (or creates a new thread).
2. `ChatPanel` initialises a `useChat` hook pointed at `/api/chat`, passing the `threadId`.
3. On submit, the hook POSTs `{ messages, threadId }` to the API route.
4. The API route persists the user's message to Supabase, then streams a response from `gpt-4.1-mini`.
5. The streaming response is consumed by the `useChat` hook and rendered token-by-token in the UI.

---

## Local development

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

### Setup

```bash
git clone https://github.com/jonpearlandpig/tela-one.git
cd tela-one
npm install
```

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

Run the database schema against your Supabase project (via the SQL editor in the Supabase dashboard or the CLI):

```bash
# Using Supabase CLI
supabase db push --db-url your-database-url < supabase.sql
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

### Useful commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (no emit)
npm run lint         # ESLint
```

---

## Deploying to Vercel

1. Push to GitHub and import the repository in the [Vercel dashboard](https://vercel.com/new).
2. Set the following environment variables under **Settings → Environment Variables**:

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |
   | `OPENAI_API_KEY` | Your OpenAI API key |

3. Deploy. Vercel will run `npm run build` automatically.

> **Note:** If you see `MIDDLEWARE_INVOCATION_FAILED` at runtime, the Supabase env vars are almost certainly missing. The middleware will skip session refresh gracefully if they are absent, but auth will not work until they are set.

> **Note:** If your deployment shows a `403 Forbidden` error, check **Vercel → Settings → Deployment Protection** and disable it, or configure it to allow public access.

---

## Design principles

TELA One follows a small set of non-negotiable rules inherited from its mission:

**Stability over features.** The runtime must not break. A degraded experience is better than a broken one.

**Persistence.** Threads and messages survive. Nothing is ephemeral unless the user deletes it.

**Mobile reliability.** The UI works on a phone. Auth, chat, and navigation all function without a keyboard or large screen.

**Calm UX.** No dashboards, no status indicators beyond what's necessary, no visual noise. The interface gets out of the way.

**Low complexity.** No abstractions that don't earn their place. The folder structure is flat. The components are small. The data model is two tables.

---

## What is not built yet

The following are deliberately out of scope for Phase 1 and will not be added until the runtime shell is proven stable:

- **MOSE** — automated task execution
- **AKBs** — automated knowledge bases
- **Retrieval systems** — semantic search over threads
- **Governance engines** — rule-based decision making
- **Continuity snapshots** — session state serialisation
- **Orchestration systems** — multi-agent coordination
- **Vector memory** — embedding-based context retrieval

---

## Security notes

- All user data is isolated by Supabase Row-Level Security. Even if the anon key is exposed, users cannot read each other's threads or messages.
- The OpenAI API key is server-side only — it is never sent to the browser.
- The Supabase anon key is safe to expose in the browser. It has no elevated privileges.
- Session cookies are managed by `@supabase/ssr` and refreshed on every request via Next.js middleware.
- Next.js is kept up to date. The project requires ≥ 15.5.18, which resolves known CVEs in earlier 15.x releases.

---

## License

Private. All rights reserved.

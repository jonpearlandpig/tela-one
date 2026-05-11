-- ── CORE TABLES ──────────────────────────────────────────────────────────────

create extension if not exists vector;

create table threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  role text not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ── AKBs ─────────────────────────────────────────────────────────────────────
-- Adaptive Knowledge Base objects. Runtime truth artifacts with authority rank.

create table akbs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  content text not null,
  scope text not null default 'project',        -- global | canonical_akb | project | entity | thread | session
  truth_rank integer not null default 3,        -- 1 = highest authority
  governance_status text not null default 'approved',
  freshness_score float default 1.0,
  provenance text,
  retrieval_priority integer default 5,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table threads enable row level security;
alter table messages enable row level security;
alter table akbs enable row level security;

create policy "users manage own threads" on threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own messages" on messages
  for all using (
    exists(select 1 from threads where threads.id = messages.thread_id and threads.user_id = auth.uid())
  );

create policy "users manage own akbs" on akbs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── VECTOR INDEXES ────────────────────────────────────────────────────────────

create index on messages using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on akbs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── RETRIEVAL FUNCTIONS ───────────────────────────────────────────────────────

create or replace function search_akbs(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  scope text,
  truth_rank int,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    a.id,
    a.title,
    a.content,
    a.scope,
    a.truth_rank,
    1 - (a.embedding <=> query_embedding) as similarity
  from akbs a
  where a.user_id = match_user_id
    and a.governance_status = 'approved'
    and a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.truth_rank asc, a.embedding <=> query_embedding asc
  limit match_count;
end;
$$;

create or replace function search_messages(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float default 0.6,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  role text,
  thread_id uuid,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.content,
    m.role,
    m.thread_id,
    1 - (m.embedding <=> query_embedding) as similarity
  from messages m
  join threads t on t.id = m.thread_id
  where t.user_id = match_user_id
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding asc
  limit match_count;
end;
$$;

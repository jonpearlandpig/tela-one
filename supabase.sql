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
  created_at timestamptz default now()
);

alter table threads enable row level security;
alter table messages enable row level security;

create policy "users manage own threads" on threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own messages" on messages for all using (
  exists(select 1 from threads where threads.id = messages.thread_id and threads.user_id = auth.uid())
);

-- =====================================================
-- Extensions
-- =====================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- =====================================================
-- Profiles
-- Mirrors auth.users
-- =====================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  last_seen timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =====================================================
-- Workspaces
-- =====================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  tab_count integer default 0,
  folders jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- Tab Embeddings
-- =====================================================

create table if not exists public.tab_embeddings (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tab_id integer not null,
  title text not null,
  url text not null,
  content text,
  embedding vector(384),
  updated_at timestamptz default now(),
  unique (user_id, tab_id)
);

-- =====================================================
-- Custom Folders
-- =====================================================

create table if not exists public.custom_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  icon text,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- Folder Tabs
-- =====================================================

create table if not exists public.folder_tabs (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.custom_folders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text not null,
  favicon_url text,
  added_at timestamptz default now(),
  unique (folder_id, url)
);

-- =====================================================
-- User Settings
-- =====================================================

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  max_active_tabs integer default 10,
  discard_whitelist text[] default '{}',
  default_prompt text,
  theme text default 'dark',
  updated_at timestamptz default now()
);

-- =====================================================
-- Indexes
-- =====================================================

create index if not exists idx_workspace_user_created
on public.workspaces(user_id, created_at desc);

create index if not exists idx_embedding_user
on public.tab_embeddings(user_id);

create index if not exists idx_folder_position
on public.custom_folders(user_id, position);

create index if not exists idx_folder_tabs
on public.folder_tabs(folder_id);

create index if not exists idx_embedding_vector
on public.tab_embeddings
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- =====================================================
-- Row Level Security
-- =====================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.tab_embeddings enable row level security;
alter table public.custom_folders enable row level security;
alter table public.folder_tabs enable row level security;
alter table public.user_settings enable row level security;

-- =====================================================
-- Policies
-- =====================================================

drop policy if exists "Own profile" on public.profiles;
create policy "Own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Own workspaces" on public.workspaces;
create policy "Own workspaces"
on public.workspaces
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Own embeddings" on public.tab_embeddings;
create policy "Own embeddings"
on public.tab_embeddings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Own folders" on public.custom_folders;
create policy "Own folders"
on public.custom_folders
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Own folder tabs" on public.folder_tabs;
create policy "Own folder tabs"
on public.folder_tabs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Own settings" on public.user_settings;
create policy "Own settings"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

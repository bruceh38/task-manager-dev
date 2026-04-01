-- ============================================================================
-- Flowboard Supabase Schema
-- ============================================================================
-- This SQL file is intentionally idempotent as much as possible:
-- - `create ... if not exists`
-- - guarded `alter` and `do $$` blocks
-- - safe policy drops/recreates
--
-- Why idempotent matters:
-- You can re-run this file during development without manually resetting
-- the entire database for most schema/policy changes.
-- ============================================================================

-- Needed for UUID generation via `gen_random_uuid()`.
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- One row per auth user.
-- Stores public-facing display metadata used throughout UI.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  avatar_url text,
  color text not null default '#db2777',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
-- Core business entity for the board.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  status text not null check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- team_members
-- ----------------------------------------------------------------------------
-- Owner-local roster.
-- `user_id` = team owner
-- `profile_user_id` = optional link to a real user profile
--                    (used to prevent duplicate logical members even if names change)
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  avatar_url text,
  color text not null default '#ec4899',
  profile_user_id uuid references public.profiles(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Migration safety: add missing column if older DB version lacks it.
alter table public.team_members
  add column if not exists profile_user_id uuid;

-- Migration safety: add FK only if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_members_profile_user_id_fkey'
      and conrelid = 'public.team_members'::regclass
  ) then
    alter table public.team_members
      add constraint team_members_profile_user_id_fkey
      foreign key (profile_user_id)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- labels
-- ----------------------------------------------------------------------------
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#db2777',
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- task_assignees
-- ----------------------------------------------------------------------------
-- Join table: task <-> owner-local team member.
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id)
);

-- ----------------------------------------------------------------------------
-- task_labels
-- ----------------------------------------------------------------------------
-- Join table: task <-> label.
create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

-- ----------------------------------------------------------------------------
-- task_user_assignees
-- ----------------------------------------------------------------------------
-- Join table: task <-> real user profile.
-- This drives cross-user task visibility.
create table if not exists public.task_user_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  assignee_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, assignee_user_id)
);

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- task_activities
-- ----------------------------------------------------------------------------
-- Audit-style event timeline for task changes.
create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'status_changed', 'edited', 'assignment_added', 'assignment_removed')),
  message text not null,
  metadata jsonb,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- indexes
-- ----------------------------------------------------------------------------
-- Performance + uniqueness constraints.
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
drop index if exists idx_team_members_user_profile_unique;
create unique index if not exists idx_team_members_user_profile_unique
  on public.team_members(user_id, profile_user_id);
create index if not exists idx_labels_user_id on public.labels(user_id);
create index if not exists idx_profiles_created_at on public.profiles(created_at);
create index if not exists idx_task_assignees_user_id on public.task_assignees(user_id);
create index if not exists idx_task_assignees_task_id on public.task_assignees(task_id);
create index if not exists idx_task_labels_user_id on public.task_labels(user_id);
create index if not exists idx_task_labels_task_id on public.task_labels(task_id);
create index if not exists idx_task_user_assignees_task_id on public.task_user_assignees(task_id);
create index if not exists idx_task_user_assignees_assignee on public.task_user_assignees(assignee_user_id);
create index if not exists idx_task_user_assignees_assigned_by on public.task_user_assignees(assigned_by_user_id);
create index if not exists idx_comments_user_id on public.comments(user_id);
create index if not exists idx_comments_task_id on public.comments(task_id);
create index if not exists idx_comments_created_at on public.comments(created_at);
create index if not exists idx_task_activities_user_id on public.task_activities(user_id);
create index if not exists idx_task_activities_task_id on public.task_activities(task_id);
create index if not exists idx_task_activities_created_at on public.task_activities(created_at);

-- ----------------------------------------------------------------------------
-- RLS enablement
-- ----------------------------------------------------------------------------
alter table public.tasks enable row level security;
alter table public.team_members enable row level security;
alter table public.labels enable row level security;
alter table public.profiles enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_user_assignees enable row level security;
alter table public.comments enable row level security;
alter table public.task_activities enable row level security;

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
-- Grants allow query attempts; RLS policies still decide actual row access.
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.team_members to authenticated;
grant select, insert, update, delete on table public.labels to authenticated;
grant select, insert, update, delete on table public.task_assignees to authenticated;
grant select, insert, update, delete on table public.task_labels to authenticated;
grant select, insert, delete on table public.task_user_assignees to authenticated;
grant select, insert, update, delete on table public.comments to authenticated;
grant select, insert, update, delete on table public.task_activities to authenticated;

-- ----------------------------------------------------------------------------
-- Helper access functions
-- ----------------------------------------------------------------------------
-- These are SECURITY DEFINER so they can check related tables safely within RLS.
create or replace function public.is_task_owner(task_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = task_uuid
      and t.user_id = auth.uid()
  );
$$;

create or replace function public.is_task_assignee(task_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_user_assignees tua
    where tua.task_id = task_uuid
      and tua.assignee_user_id = auth.uid()
  );
$$;

create or replace function public.can_access_task(task_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_task_owner(task_uuid) or public.is_task_assignee(task_uuid);
$$;

-- Lock down direct function access and re-grant only to authenticated role.
revoke all on function public.is_task_owner(uuid) from public;
revoke all on function public.is_task_assignee(uuid) from public;
revoke all on function public.can_access_task(uuid) from public;
grant execute on function public.is_task_owner(uuid) to authenticated;
grant execute on function public.is_task_assignee(uuid) to authenticated;
grant execute on function public.can_access_task(uuid) to authenticated;

-- Team-level access helper:
-- true when user is team owner OR appears as member in that team's roster.
create or replace function public.can_access_team(team_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() = team_owner_id
    or exists (
      select 1
      from public.team_members tm
      where tm.user_id = team_owner_id
        and tm.profile_user_id = auth.uid()
    );
$$;

revoke all on function public.can_access_team(uuid) from public;
grant execute on function public.can_access_team(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Profile bootstrap RPC + auth trigger
-- ----------------------------------------------------------------------------
-- `ensure_my_profile` is called from frontend bootstrap to avoid 409 insert races.
create or replace function public.ensure_my_profile(
  p_display_name text,
  p_avatar_url text,
  p_color text default '#db2777'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, display_name, avatar_url, color)
  values (auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'User'), p_avatar_url, coalesce(p_color, '#db2777'))
  on conflict (id)
  do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    color = excluded.color;
end;
$$;

revoke all on function public.ensure_my_profile(text, text, text) from public;
grant execute on function public.ensure_my_profile(text, text, text) to authenticated;

-- Trigger helper to auto-create profile row when auth user is created.
create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, color)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'User-' || left(new.id::text, 6)),
    new.raw_user_meta_data ->> 'avatar_url',
    '#db2777'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Ensure trigger exists with fresh definition.
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user_profile();

-- Backfill existing auth users into profiles table.
insert into public.profiles (id, display_name, avatar_url, color)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'name'), ''), 'User-' || left(u.id::text, 6)),
  u.raw_user_meta_data ->> 'avatar_url',
  '#db2777'
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Policy reset
-- ----------------------------------------------------------------------------
-- Drop then recreate policies to keep this file deterministic over time.
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "team_members_select_own" on public.team_members;
drop policy if exists "team_members_insert_own" on public.team_members;
drop policy if exists "team_members_update_own" on public.team_members;
drop policy if exists "team_members_delete_own" on public.team_members;
drop policy if exists "labels_select_own" on public.labels;
drop policy if exists "labels_insert_own" on public.labels;
drop policy if exists "labels_update_own" on public.labels;
drop policy if exists "labels_delete_own" on public.labels;
drop policy if exists "task_assignees_select_own" on public.task_assignees;
drop policy if exists "task_assignees_insert_own" on public.task_assignees;
drop policy if exists "task_assignees_update_own" on public.task_assignees;
drop policy if exists "task_assignees_delete_own" on public.task_assignees;
drop policy if exists "task_labels_select_own" on public.task_labels;
drop policy if exists "task_labels_insert_own" on public.task_labels;
drop policy if exists "task_labels_update_own" on public.task_labels;
drop policy if exists "task_labels_delete_own" on public.task_labels;
drop policy if exists "task_user_assignees_select_access" on public.task_user_assignees;
drop policy if exists "task_user_assignees_insert_owner" on public.task_user_assignees;
drop policy if exists "task_user_assignees_delete_owner" on public.task_user_assignees;
drop policy if exists "comments_select_own" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
drop policy if exists "task_activities_select_own" on public.task_activities;
drop policy if exists "task_activities_insert_own" on public.task_activities;
drop policy if exists "task_activities_update_own" on public.task_activities;
drop policy if exists "task_activities_delete_own" on public.task_activities;

-- ----------------------------------------------------------------------------
-- tasks policies
-- ----------------------------------------------------------------------------
create policy "tasks_select_own"
  on public.tasks
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_task_assignee(id));

create policy "tasks_insert_own"
  on public.tasks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------------------
create policy "profiles_select_all"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- team_members policies
-- ----------------------------------------------------------------------------
create policy "team_members_select_own"
  on public.team_members
  for select
  to authenticated
  using (public.can_access_team(user_id));

create policy "team_members_insert_own"
  on public.team_members
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "team_members_update_own"
  on public.team_members
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "team_members_delete_own"
  on public.team_members
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- labels policies
-- ----------------------------------------------------------------------------
create policy "labels_select_own"
  on public.labels
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "labels_insert_own"
  on public.labels
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "labels_update_own"
  on public.labels
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "labels_delete_own"
  on public.labels
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- task_assignees policies
-- ----------------------------------------------------------------------------
create policy "task_assignees_select_own"
  on public.task_assignees
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "task_assignees_insert_own"
  on public.task_assignees
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.team_members tm
      where tm.id = member_id and tm.user_id = auth.uid()
    )
  );

create policy "task_assignees_update_own"
  on public.task_assignees
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_assignees_delete_own"
  on public.task_assignees
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- task_labels policies
-- ----------------------------------------------------------------------------
create policy "task_labels_select_own"
  on public.task_labels
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "task_labels_insert_own"
  on public.task_labels
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
    and exists (
      select 1 from public.labels l
      where l.id = label_id and l.user_id = auth.uid()
    )
  );

create policy "task_labels_update_own"
  on public.task_labels
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_labels_delete_own"
  on public.task_labels
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- task_user_assignees policies
-- ----------------------------------------------------------------------------
create policy "task_user_assignees_select_access"
  on public.task_user_assignees
  for select
  to authenticated
  using (
    auth.uid() = assignee_user_id
    or auth.uid() = assigned_by_user_id
    or public.is_task_owner(task_id)
  );

create policy "task_user_assignees_insert_owner"
  on public.task_user_assignees
  for insert
  to authenticated
  with check (
    auth.uid() = assigned_by_user_id
    and public.is_task_owner(task_id)
  );

create policy "task_user_assignees_delete_owner"
  on public.task_user_assignees
  for delete
  to authenticated
  using (
    auth.uid() = assigned_by_user_id
    or public.is_task_owner(task_id)
  );

-- ----------------------------------------------------------------------------
-- comments policies
-- ----------------------------------------------------------------------------
create policy "comments_select_own"
  on public.comments
  for select
  to authenticated
  using (auth.uid() = user_id or public.can_access_task(task_id));

create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.can_access_task(task_id)
  );

create policy "comments_update_own"
  on public.comments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "comments_delete_own"
  on public.comments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- task_activities policies
-- ----------------------------------------------------------------------------
create policy "task_activities_select_own"
  on public.task_activities
  for select
  to authenticated
  using (auth.uid() = user_id or public.can_access_task(task_id));

create policy "task_activities_insert_own"
  on public.task_activities
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  );

create policy "task_activities_update_own"
  on public.task_activities
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_activities_delete_own"
  on public.task_activities
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Realtime publication safety
-- ----------------------------------------------------------------------------
-- Add each table to `supabase_realtime` only when not already present.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'labels'
  ) then
    alter publication supabase_realtime add table public.labels;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_activities'
  ) then
    alter publication supabase_realtime add table public.task_activities;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_user_assignees'
  ) then
    alter publication supabase_realtime add table public.task_user_assignees;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_labels'
  ) then
    alter publication supabase_realtime add table public.task_labels;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_members'
  ) then
    alter publication supabase_realtime add table public.team_members;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'task_assignees'
  ) then
    alter publication supabase_realtime add table public.task_assignees;
  end if;
end
$$;

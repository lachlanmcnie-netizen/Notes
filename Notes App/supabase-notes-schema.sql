create extension if not exists pgcrypto;

drop policy if exists "users can read own notes" on public.notes_items;
drop policy if exists "users can insert own notes" on public.notes_items;
drop policy if exists "users can update own notes" on public.notes_items;
drop policy if exists "users can delete own notes" on public.notes_items;
drop policy if exists "public can read notes" on public.notes_items;
drop policy if exists "public can insert notes" on public.notes_items;
drop policy if exists "public can update notes" on public.notes_items;
drop policy if exists "public can delete notes" on public.notes_items;

create table if not exists public.notes_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  body text not null default '',
  priority text not null default 'medium',
  due_date date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_items_priority_check check (priority in ('high', 'medium', 'low'))
);

alter table public.notes_items add column if not exists title text;
alter table public.notes_items add column if not exists body text not null default '';
alter table public.notes_items add column if not exists priority text not null default 'medium';
alter table public.notes_items add column if not exists due_date date;
alter table public.notes_items add column if not exists is_completed boolean not null default false;
alter table public.notes_items add column if not exists created_at timestamptz not null default now();
alter table public.notes_items add column if not exists updated_at timestamptz not null default now();
alter table public.notes_items drop column if exists user_id;
alter table public.notes_items alter column title set default '';
update public.notes_items set title = '' where title is null;
alter table public.notes_items alter column title set not null;
alter table public.notes_items alter column body set default '';
alter table public.notes_items alter column body set not null;
alter table public.notes_items alter column priority set default 'medium';
alter table public.notes_items alter column priority set not null;
alter table public.notes_items alter column is_completed set default false;
alter table public.notes_items alter column is_completed set not null;
alter table public.notes_items alter column created_at set default now();
alter table public.notes_items alter column created_at set not null;
alter table public.notes_items alter column updated_at set default now();
alter table public.notes_items alter column updated_at set not null;

alter table public.notes_items drop constraint if exists notes_items_priority_check;
alter table public.notes_items add constraint notes_items_priority_check check (priority in ('high', 'medium', 'low'));

create or replace function public.set_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_items_set_updated_at on public.notes_items;
create trigger notes_items_set_updated_at
before update on public.notes_items
for each row
execute function public.set_notes_updated_at();

alter table public.notes_items enable row level security;

create policy "public can read notes"
on public.notes_items
for select
to anon, authenticated
using (true);

create policy "public can insert notes"
on public.notes_items
for insert
to anon, authenticated
with check (true);

create policy "public can update notes"
on public.notes_items
for update
to anon, authenticated
using (true)
with check (true);

create policy "public can delete notes"
on public.notes_items
for delete
to anon, authenticated
using (true);

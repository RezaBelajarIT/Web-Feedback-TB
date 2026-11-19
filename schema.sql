create table if not exists public.aspirations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('saran', 'kritik', 'apresiasi')),
  category text not null check (char_length(category) between 1 and 60),
  title text not null check (char_length(title) between 1 and 70),
  message text not null check (char_length(message) between 1 and 500),
  anonymous boolean not null default true,
  name text check (name is null or char_length(name) <= 40),
  visibility text not null check (visibility in ('public', 'private')),
  status text not null default 'new' check (status in ('new', 'in_review', 'in_progress', 'done')),
  created_at timestamptz not null default now()
);

create table if not exists public.osis_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.aspirations enable row level security;
alter table public.osis_admins enable row level security;

create or replace function public.is_osis_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.osis_admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_osis_admin() from public;
grant execute on function public.is_osis_admin() to authenticated;

grant select, insert on public.aspirations to anon;
grant select, insert on public.aspirations to authenticated;
grant update (status) on public.aspirations to authenticated;
grant select on public.osis_admins to authenticated;

create policy "public can read public aspirations"
on public.aspirations for select to anon, authenticated
using (visibility = 'public');

create policy "anyone can submit aspirations"
on public.aspirations for insert to anon, authenticated
with check (
  status = 'new'
  and (anonymous = true or name is not null)
);

create policy "OSIS admins can read all aspirations"
on public.aspirations for select to authenticated
using ((select public.is_osis_admin()));

create policy "OSIS admins can update statuses"
on public.aspirations for update to authenticated
using ((select public.is_osis_admin()))
with check ((select public.is_osis_admin()));

create policy "admins can read their own admin membership"
on public.osis_admins for select to authenticated
using (user_id = (select auth.uid()));

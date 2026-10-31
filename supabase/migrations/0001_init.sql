-- The Working Atlas — initial schema. Run in the Supabase SQL editor.
create extension if not exists "pgcrypto";

-- Admins: only rows inserted by the setup script (service role). No public signup path.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create type project_status as enum ('live','in_progress','concept','archived');
create type publish_state  as enum ('draft','published');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  index_no int generated always as identity,          -- persistent atlas number
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  category text not null default '',
  role text not null default '',
  contribution text not null default '',
  status project_status not null default 'in_progress',
  publish publish_state not null default 'draft',
  featured boolean not null default false,
  sort_order int not null default 0,
  start_date date, end_date date,
  external_url text check (external_url is null or external_url ~ '^https?://'),
  tags text[] not null default '{}',
  cover_asset_id uuid,
  case_study jsonb not null default '[]'::jsonb,     -- ordered optional sections [{type, heading, body, assets[]}]
  case_study_enabled boolean not null default false,
  seo_title text, seo_description text, og_asset_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_public_idx on public.projects (publish, sort_order);

create table public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  caption text not null default '',
  asset_type text not null default 'image' check (asset_type in ('image','video','embed')),
  sort_order int not null default 0,
  width int, height int,
  created_at timestamptz not null default now()
);
create index project_assets_project_idx on public.project_assets (project_id, sort_order);

create table public.site_profile (
  id int primary key default 1 check (id = 1),       -- single row
  display_name text not null default 'Desmond Odeyemi',
  descriptor text not null default 'Product Engineer & Product Designer',
  headline text not null default 'I turn complex, real-world problems into thoughtful digital products.',
  intro text not null default '',
  biography text not null default '',
  portrait_path text, portrait_alt text not null default '',
  email text not null default 'midecancode@gmail.com',
  cv_path text,                                       -- downloadable CV in storage
  socials jsonb not null default '{}'::jsonb,
  available boolean not null default false,
  availability_note text not null default '',
  footer_copy text not null default '',
  seo_title text, seo_description text,
  capabilities jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_profile (id) values (1) on conflict do nothing;

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null, excerpt text not null default '', content text not null default '',
  cover_path text, cover_alt text not null default '',
  publish publish_state not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_projects before update on public.projects for each row execute function public.touch_updated_at();
create trigger t_profile  before update on public.site_profile for each row execute function public.touch_updated_at();
create trigger t_journal  before update on public.journal_entries for each row execute function public.touch_updated_at();

-- Row level security: public reads published only; admin does everything; nobody else writes.
alter table public.admin_users     enable row level security;
alter table public.projects        enable row level security;
alter table public.project_assets  enable row level security;
alter table public.site_profile    enable row level security;
alter table public.journal_entries enable row level security;

create policy admin_self on public.admin_users for select using (user_id = auth.uid());

create policy projects_public_read on public.projects for select using (publish = 'published');
create policy projects_admin_all   on public.projects for all using (public.is_admin()) with check (public.is_admin());

create policy assets_public_read on public.project_assets for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.publish = 'published'));
create policy assets_admin_all on public.project_assets for all using (public.is_admin()) with check (public.is_admin());

create policy profile_public_read on public.site_profile for select using (true);
create policy profile_admin_write on public.site_profile for update using (public.is_admin()) with check (public.is_admin());

create policy journal_public_read on public.journal_entries for select using (publish = 'published');
create policy journal_admin_all   on public.journal_entries for all using (public.is_admin()) with check (public.is_admin());

-- Storage: public bucket for optimized display files, admin-only writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media','media',true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

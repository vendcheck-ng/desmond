-- 0003 — private media, public read views, integrity constraints.
-- Safe to run after 0001/0002. It does not rewrite earlier migrations.

-- 1) Close the old public bucket immediately. Its objects stay in place but become unreachable.
--    (Re-upload images in the new admin; then you may delete the empty old bucket in the dashboard.)
update storage.buckets set public = false where id = 'media';
drop policy if exists media_admin_insert on storage.objects;
drop policy if exists media_admin_update on storage.objects;
drop policy if exists media_admin_delete on storage.objects;

-- 2) Two buckets.
--    media-private: every project upload lands here. Never public. Admin-only; drafts previewed via signed URLs.
--    media-public : receives COPIES of assets that are meant to be public (published projects, portrait, CV).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media-private','media-private', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('media-public','media-public',  true,  10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists private_admin_all on storage.objects;
drop policy if exists public_admin_all on storage.objects;
create policy private_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'media-private' and public.is_admin()) with check (bucket_id = 'media-private' and public.is_admin());
-- Public bucket: anyone can fetch a known URL (that is what "public" means); only admins can list/write.
create policy public_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'media-public' and public.is_admin()) with check (bucket_id = 'media-public' and public.is_admin());

-- 3) Anonymous visitors read through views, never the base tables.
--    The views hide case-study text for projects whose case study is disabled, and expose only the
--    assets that are meant to be public (all assets if the case study is on; otherwise cover/OG only).
drop policy if exists projects_public_read on public.projects;
drop policy if exists assets_public_read on public.project_assets;
revoke select on public.projects from anon;
revoke select on public.project_assets from anon;

create or replace view public.public_projects as
select id, index_no, slug, title, summary, category, role,
       case when case_study_enabled then contribution else '' end as contribution,
       status, publish, featured, sort_order, start_date, end_date, external_url, tags, cover_asset_id,
       case when case_study_enabled then case_study else '[]'::jsonb end as case_study,
       case_study_enabled, seo_title, seo_description, og_asset_id, published_at, created_at, updated_at
from public.projects where publish = 'published';

create or replace view public.public_assets as
select a.id, a.project_id, a.storage_path, a.alt_text, a.caption, a.asset_type, a.sort_order
from public.project_assets a join public.projects p on p.id = a.project_id
where p.publish = 'published' and (p.case_study_enabled or a.id = p.cover_asset_id or a.id = p.og_asset_id);

grant select on public.public_projects, public.public_assets to anon, authenticated;

-- 4) Integrity: cover/OG must be an asset of the same project.
alter table public.projects drop constraint if exists projects_cover_fk;
alter table public.projects drop constraint if exists projects_og_fk;
alter table public.projects add constraint projects_cover_fk foreign key (cover_asset_id) references public.project_assets(id) on delete set null;
alter table public.projects add constraint projects_og_fk    foreign key (og_asset_id)    references public.project_assets(id) on delete set null;

create or replace function public.check_project_assets() returns trigger language plpgsql as $$
begin
  if new.cover_asset_id is not null and not exists
     (select 1 from public.project_assets where id = new.cover_asset_id and project_id = new.id) then
    raise exception 'cover asset must belong to this project';
  end if;
  if new.og_asset_id is not null and not exists
     (select 1 from public.project_assets where id = new.og_asset_id and project_id = new.id) then
    raise exception 'og asset must belong to this project';
  end if;
  return new;
end $$;
drop trigger if exists t_projects_assets on public.projects;
create trigger t_projects_assets before insert or update on public.projects
  for each row execute function public.check_project_assets();

-- 5) Atomic reordering (one statement = one transaction). RLS applies (security invoker): admins only.
create or replace function public.reorder_projects(ids uuid[]) returns void
language sql security invoker set search_path = public as $$
  update public.projects p set sort_order = o.n - 1 from unnest(ids) with ordinality as o(id, n) where p.id = o.id;
$$;
create or replace function public.reorder_assets(pid uuid, ids uuid[]) returns void
language sql security invoker set search_path = public as $$
  update public.project_assets a set sort_order = o.n - 1
  from unnest(ids) with ordinality as o(id, n) where a.id = o.id and a.project_id = pid;
$$;
revoke execute on function public.reorder_projects(uuid[]), public.reorder_assets(uuid, uuid[]) from public, anon;
grant  execute on function public.reorder_projects(uuid[]), public.reorder_assets(uuid, uuid[]) to authenticated;

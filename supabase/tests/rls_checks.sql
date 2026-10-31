-- MANUAL integration checks. Run in the Supabase SQL editor AFTER the migrations. Each block should
-- print the expected result. Not executed by the author (no database available when written).
-- Setup: make sure at least one project is published and one is a draft.

-- A. Anonymous cannot read base tables (expect: permission denied).
begin; set local role anon;
  select * from public.projects;          -- EXPECT: ERROR permission denied
rollback;

-- B. Anonymous sees only published projects through the view (expect: 0 draft rows).
begin; set local role anon;
  select count(*) as draft_rows_visible from public.public_projects where publish <> 'published'; -- EXPECT 0
rollback;

-- C. Case study text is blanked when the case study is disabled (expect: 0).
begin; set local role anon;
  select count(*) as leaked from public.public_projects
   where not case_study_enabled and (contribution <> '' or case_study <> '[]'::jsonb);            -- EXPECT 0
rollback;

-- D. Anonymous cannot write anything (each EXPECT: ERROR).
begin; set local role anon; insert into public.projects (slug, title) values ('x','x'); rollback;
begin; set local role anon; update public.site_profile set display_name = 'x'; rollback;

-- E. Anonymous cannot read private storage or list it (expect: 0 rows).
begin; set local role anon;
  select count(*) as private_objects_visible from storage.objects where bucket_id = 'media-private'; -- EXPECT 0
rollback;

-- F. Cover must belong to the same project (expect: ERROR 'cover asset must belong to this project').
--    update public.projects set cover_asset_id = '<asset id of ANOTHER project>' where id = '<project id>';

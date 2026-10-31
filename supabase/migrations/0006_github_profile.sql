update public.site_profile
set socials = coalesce(socials, '{}'::jsonb) || jsonb_build_object('github', 'https://github.com/vendcheck-ng')
where id = 1;
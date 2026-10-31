insert into public.projects (slug, title, summary, role, status, external_url, sort_order, featured, publish, published_at) values
  ('vendcheck', 'Vendcheck', 'Founder-led product. Details are under verification.', 'Founder', 'live', 'https://www.vendcheck.ng/', 0, false, 'published', now()),
  ('abiomax', 'Abiomax', 'Project details and owner relationship are under verification.', '', 'live', 'https://abiomax.com/', 1, false, 'published', now()),
  ('dropbas', 'DropBas', 'Co-founder project currently in development.', 'Co-founder', 'in_progress', 'https://www.dropbas.com/', 2, false, 'published', now()),
  ('kompyn', 'Kompyn', 'Founder-led product currently in development.', 'Founder', 'in_progress', 'https://kompyn.ng/', 3, false, 'published', now())
on conflict (slug) do nothing;

update public.projects
set summary = 'Founder-led product. Details are under verification.',
    category = '', role = 'Founder', status = 'live',
    external_url = 'https://www.vendcheck.ng/', featured = false,
    publish = 'published', published_at = coalesce(published_at, now())
where slug = 'vendcheck' and status <> 'archived'
  and summary in (
    'Verified vendor profiles with a shareable link, a verification seal and buyer reviews.',
    'Founder-led product. Product scope and individual contributions need confirmation.'
  );

update public.projects
set summary = 'Project details and owner relationship are under verification.',
    category = '', role = '', status = 'live',
    external_url = 'https://abiomax.com/', featured = false,
    publish = 'published', published_at = coalesce(published_at, now())
where slug = 'abiomax' and status <> 'archived'
  and summary in (
    'Website for Abiomax Sah-T General Enterprise, a Lagos-based general merchandise import and export business.',
    'Project scope and owner relationship need confirmation.'
  );

update public.projects
set summary = 'Co-founder project currently in development.',
    category = '', role = 'Co-founder', status = 'in_progress',
    external_url = 'https://www.dropbas.com/', featured = false,
    publish = 'published', published_at = coalesce(published_at, now())
where slug = 'dropbas' and status <> 'archived'
  and summary in (
    'A product currently in development.',
    'Co-founder project currently in development.'
  );

update public.projects
set summary = 'Founder-led product currently in development.',
    category = '', role = 'Founder', status = 'in_progress',
    external_url = 'https://kompyn.ng/', featured = false,
    publish = 'published', published_at = coalesce(published_at, now())
where slug = 'kompyn' and status <> 'archived'
  and summary in (
    'A product currently in development.',
    'Founder-led product currently in development.'
  );
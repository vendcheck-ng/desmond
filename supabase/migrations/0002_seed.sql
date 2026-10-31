-- Starter content. Projects are DRAFTS: verify each claim, add images, then publish from /admin.
insert into public.projects (slug, title, summary, role, status, external_url, sort_order, featured, publish, published_at) values
 ('vendcheck','Vendcheck','Founder-led product. Details are under verification.','Founder','live','https://www.vendcheck.ng/',0,false,'published',now()),
 ('abiomax','Abiomax','Project details and owner relationship are under verification.','','live','https://abiomax.com/',1,false,'published',now()),
 ('dropbas','DropBas','Co-founder project currently in development.','Co-founder','in_progress','https://www.dropbas.com/',2,false,'published',now()),
 ('kompyn','Kompyn','Founder-led product currently in development.','Founder','in_progress','https://kompyn.ng/',3,false,'published',now())
on conflict (slug) do nothing;

update public.site_profile set
  socials = '{"linkedin":"https://www.linkedin.com/in/desmondodeyemi","x":"https://twitter.com/midey_coder","github":"https://github.com/vendcheck-ng","location":"Lagos, Nigeria","timezone":"WAT / UTC+1","building":["VendCheck","Kompyn"],"founder":["AppVantage Solution LTD","Vendcheck","Kompyn","DropBas"],"open_to":["Contract work","Product Developments & Product Designs","Technical co-founder"],"alternate_email":"desmond@vendcheck.ng"}'::jsonb,
  intro = 'Product thinking, thoughtful interfaces, and working software — grounded in how people actually use things.'
where id = 1;

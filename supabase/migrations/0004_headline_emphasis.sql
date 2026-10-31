-- Highlights the second half of the default headline (only if you have not changed it).
update public.site_profile
set headline = 'I turn complex, real-world problems into *thoughtful digital products.*'
where id = 1 and headline = 'I turn complex, real-world problems into thoughtful digital products.';

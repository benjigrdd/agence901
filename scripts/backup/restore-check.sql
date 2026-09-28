-- Controles apres restauration (restore-test.yml) : echec si une verification ne passe pas.
do $$
declare
  v_tenants integer := (select count(*) from public.tenants);
  v_posts integer := (select count(*) from public.posts);
  v_reports integer := (select count(*) from public.reports);
  v_no_rls text := (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity);
begin
  raise notice 'communes=% actualites=% signalements=%', v_tenants, v_posts, v_reports;
  if v_tenants = 0 then raise exception 'Aucune commune restauree'; end if;
  if v_posts = 0 then raise exception 'Aucune actualite restauree'; end if;
  if v_reports = 0 then raise exception 'Aucun signalement restaure'; end if;
  if v_no_rls is not null then raise exception 'Tables sans RLS apres restauration : %', v_no_rls; end if;
end $$;

-- Base cible fraiche (schema issu des migrations du depot, `supabase start` ou `supabase db push`) :
-- vidage des tables de donnees avant la restauration des donnees du dump. Les tables de suivi des
-- migrations (auth, storage) sont conservees.
do $$
declare
  v_tables text;
begin
  select string_agg(format('%I.%I', schemaname, tablename), ', ') into v_tables
  from pg_tables
  where schemaname in ('public', 'private', 'auth', 'storage')
    and not (schemaname = 'auth' and tablename = 'schema_migrations')
    and not (schemaname = 'storage' and tablename = 'migrations');
  if v_tables is not null then
    execute 'truncate table ' || v_tables || ' cascade';
  end if;
end $$;

-- Donnees par defaut a la creation d'une commune, et RLS partout (sans policy : tout est refuse, lot 12).

create or replace function private.on_tenant_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Desactivable pour le chargement des donnees de demonstration (qui fournissent leurs propres defauts).
  if coalesce(current_setting('app.skip_tenant_defaults', true), 'off') <> 'on' then
    perform private.seed_tenant_defaults(new.id);
  end if;
  return null;
end;
$$;

create trigger tenants_seed_defaults
  after insert on public.tenants
  for each row execute function private.on_tenant_created();

do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- Les fonctions internes ne sont pas appelables depuis l'API.
revoke execute on all functions in schema private from public, anon, authenticated;

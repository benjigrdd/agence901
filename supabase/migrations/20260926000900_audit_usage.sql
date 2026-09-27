-- Journal d'audit, usage quotidien, executions des taches planifiees.

create table public.audit_log (
  -- uuid (et non bigint) : identifiant commun avec le schema zod `AuditEntry`.
  id uuid primary key default gen_random_uuid(),
  -- null pour une action de la plateforme.
  tenant_id uuid references public.tenants (id) on delete restrict,
  actor_id uuid,
  action public.audit_action not null,
  entity text not null,
  entity_id uuid,
  diff jsonb not null default '{}'::jsonb,
  ip inet,
  at timestamptz not null default now()
);

create table public.usage_daily (
  id uuid not null unique default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  date date not null,
  installs integer not null default 0 check (installs >= 0),
  active_users integer not null default 0 check (active_users >= 0),
  reports_created integer not null default 0 check (reports_created >= 0),
  posts_published integer not null default 0 check (posts_published >= 0),
  primary key (tenant_id, date)
);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  details jsonb not null default '{}'::jsonb
);

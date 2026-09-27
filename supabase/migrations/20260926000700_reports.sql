-- Signalements des habitants et leur traitement.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 80),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.report_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  label text not null check (length(trim(label)) between 1 and 60),
  icon text not null check (icon ~ '^[a-z0-9-]+$'),
  default_service_id uuid,
  sla_days integer not null default 7 check (sla_days between 1 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, default_service_id) references public.services (tenant_id, id) on delete set null (default_service_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  -- AAAA-NNNNN, attribuee par trigger (compteur par commune et par annee).
  reference text not null check (reference ~ '^\d{4}-\d{5}$'),
  category_id uuid not null,
  description text not null check (length(trim(description)) between 1 and 1000),
  point extensions.geography(Point, 4326) not null,
  address text not null check (length(trim(address)) between 1 and 300),
  status public.report_status not null default 'new',
  priority public.report_priority not null default 'normal',
  service_id uuid,
  duplicate_of_id uuid,
  reporter_id uuid references auth.users (id) on delete set null,
  -- Present uniquement si l'habitant a demande a etre recontacte.
  contact_email text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Idempotence des envois depuis l'app (file hors ligne).
  client_request_id uuid,
  ai_suggestion jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, reference),
  unique (tenant_id, client_request_id),
  foreign key (tenant_id, category_id) references public.report_categories (tenant_id, id) on delete restrict,
  foreign key (tenant_id, service_id) references public.services (tenant_id, id) on delete set null (service_id),
  foreign key (tenant_id, duplicate_of_id) references public.reports (tenant_id, id) on delete restrict,
  check (status <> 'duplicate' or duplicate_of_id is not null),
  check (duplicate_of_id is null or duplicate_of_id <> id)
);

create table public.report_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  report_id uuid not null,
  -- Chemin dans le bucket prive `report-photos` (URL signee a la lecture).
  path text not null,
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, report_id) references public.reports (tenant_id, id) on delete cascade
);

create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  report_id uuid not null,
  kind public.report_event_kind not null,
  from_status public.report_status,
  to_status public.report_status,
  message text check (length(message) <= 1000),
  visibility public.visibility not null default 'internal',
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, report_id) references public.reports (tenant_id, id) on delete cascade,
  -- Une note (commentaire) reste interne.
  check (kind <> 'comment' or visibility = 'internal')
);

create table public.tenant_counters (
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  key text not null,
  year integer not null,
  value integer not null default 0,
  primary key (tenant_id, key, year)
);

-- Communes (tenants) et configuration par commune.

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 40),
  name text not null check (length(trim(name)) between 1 and 120),
  type public.tenant_type not null default 'commune',
  parent_id uuid references public.tenants (id) on delete restrict,
  insee_code text not null check (insee_code ~ '^(\d{5}|2[AB]\d{3})$'),
  population integer not null default 0 check (population >= 0),
  status public.tenant_status not null default 'onboarding',
  plan public.tenant_plan not null default 'pilot',
  timezone text not null default 'Europe/Paris',
  center extensions.geography(Point, 4326) not null,
  contour extensions.geography(MultiPolygon, 4326),
  settings jsonb not null default '{}'::jsonb,
  renewal_date date,
  internal_notes text check (length(internal_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.tenants.internal_notes is 'Notes de l''editeur, jamais visibles par la commune.';

create table public.tenant_branding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete restrict,
  app_name text not null check (length(trim(app_name)) between 1 and 30),
  short_name text not null check (length(trim(short_name)) between 1 and 12),
  -- primary, onPrimary, secondary, background, surface, text : #rrggbb
  colors jsonb not null check (
    jsonb_typeof(colors) = 'object'
    and colors ?& array['primary', 'onPrimary', 'secondary', 'background', 'surface', 'text']
  ),
  logo_url text,
  icon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.tenant_modules (
  id uuid not null unique default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  module public.module_key not null check (module not in ('settings', 'audit')),
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module),
  unique (tenant_id, id)
);

create table public.tenant_app_config (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete restrict,
  home_layout jsonb not null check (jsonb_typeof(home_layout) = 'array'),
  links jsonb not null check (jsonb_typeof(links) = 'object'),
  contact jsonb not null check (jsonb_typeof(contact) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.tenant_store_info (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete restrict,
  ios_bundle_id text not null check (ios_bundle_id ~ '^[a-zA-Z][\w-]*(\.[a-zA-Z][\w-]*)+$'),
  android_package text not null check (android_package ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  eas_project_id uuid,
  app_store_id text check (app_store_id ~ '^\d+$'),
  url_scheme text not null check (url_scheme ~ '^[a-z][a-z0-9]*$'),
  play_store_url text check (play_store_url ~ '^https://'),
  ios_status public.store_publication_status not null default 'not_started',
  android_status public.store_publication_status not null default 'not_started',
  ios_rejection_reason text check (length(ios_rejection_reason) <= 500),
  android_rejection_reason text check (length(android_rejection_reason) <= 500),
  onboarding_checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(onboarding_checklist) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

-- Personnel, droits, habitants, themes et jetons push.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  invited_at timestamptz,
  accepted_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (user_id, tenant_id)
);

create table public.membership_permissions (
  id uuid not null unique default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  membership_id uuid not null,
  module public.module_key not null,
  level public.permission_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (membership_id, module),
  unique (tenant_id, id),
  foreign key (tenant_id, membership_id) references public.memberships (tenant_id, id) on delete cascade
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  label text not null check (length(trim(label)) between 1 and 40),
  -- `order` cote TypeScript : mot reserve SQL et parametre de tri de PostgREST.
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.citizen_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  id uuid not null unique default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  district_ids uuid[] not null default '{}',
  topic_ids uuid[] not null default '{}',
  notification_prefs jsonb not null default '{"alerts": true, "news": true, "events": false, "wasteReminder": false, "reportUpdates": true}'::jsonb,
  waste_zone_id uuid,
  contact_email text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, waste_zone_id) references public.waste_zones (tenant_id, id) on delete set null (waste_zone_id)
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform public.push_platform not null,
  locale text not null default 'fr',
  last_seen_at timestamptz not null default now(),
  invalid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

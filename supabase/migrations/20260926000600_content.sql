-- Contenus : mediatheque, lieux, actualites, agenda, validation, demarches, tri.

create table public.media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  -- Chemin dans le bucket `public-media` ; l'URL est calculee par l'adaptateur.
  path text not null,
  mime text not null check (mime ~ '^image/(jpeg|png|webp|gif|svg\+xml)$'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt_text text not null default '' check (length(alt_text) <= 250),
  decorative boolean not null default false,
  credit text check (length(credit) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, path),
  -- Texte alternatif obligatoire sauf image decorative (qui a un texte vide).
  check ((decorative and alt_text = '') or (not decorative and length(trim(alt_text)) > 0))
);

create table public.place_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  key text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(trim(label)) between 1 and 60),
  icon text not null check (icon ~ '^[a-z0-9-]+$'),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_default boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, key)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  category_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 120),
  point extensions.geography(Point, 4326) not null,
  address text not null check (length(trim(address)) between 1 and 300),
  opening_hours text check (length(opening_hours) <= 500),
  phone text,
  website text check (website ~ '^https://'),
  description text check (length(description) <= 1000),
  accessibility jsonb not null default '{"wheelchair": "unknown", "toilets": false}'::jsonb,
  photo_media_id uuid,
  source public.place_source not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, source, external_id),
  foreign key (tenant_id, category_id) references public.place_categories (tenant_id, id) on delete restrict,
  foreign key (tenant_id, photo_media_id) references public.media (tenant_id, id) on delete set null (photo_media_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  type public.post_type not null default 'news',
  title text not null check (length(trim(title)) between 1 and 120),
  summary text not null check (length(trim(summary)) between 1 and 280),
  body jsonb not null default '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb,
  cover_media_id uuid,
  status public.content_status not null default 'draft',
  publish_at timestamptz,
  unpublish_at timestamptz,
  district_ids uuid[] not null default '{}',
  topic_ids uuid[] not null default '{}',
  pinned boolean not null default false,
  alert_level public.alert_level,
  send_push boolean not null default false,
  author_id uuid not null references auth.users (id) on delete restrict,
  reviewer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, cover_media_id) references public.media (tenant_id, id) on delete set null (cover_media_id),
  check ((type = 'alert') = (alert_level is not null)),
  check (unpublish_at is null or publish_at is null or unpublish_at > publish_at)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 120),
  description jsonb not null default '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb,
  category public.event_category not null default 'municipal',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  rrule text,
  place_id uuid,
  -- `location` cote TypeScript : { label, point }.
  location_label text check (length(location_label) <= 200),
  location_point extensions.geography(Point, 4326),
  organizer text check (length(organizer) <= 120),
  price jsonb,
  registration_url text check (registration_url ~ '^https://'),
  cover_media_id uuid,
  accessible boolean not null default false,
  status public.content_status not null default 'draft',
  publish_at timestamptz,
  author_id uuid not null references auth.users (id) on delete restrict,
  reviewer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, place_id) references public.places (tenant_id, id) on delete set null (place_id),
  foreign key (tenant_id, cover_media_id) references public.media (tenant_id, id) on delete set null (cover_media_id),
  check (ends_at >= starts_at),
  check ((location_label is null) = (location_point is null))
);

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  entity_type public.reviewable_entity not null,
  entity_id uuid not null,
  action public.review_action not null,
  comment text check (length(comment) <= 1000),
  author_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (action <> 'rejected' or length(trim(comment)) > 0)
);

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  category public.procedure_category not null default 'other',
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null check (length(trim(description)) between 1 and 300),
  kind public.procedure_kind not null,
  value text not null check (length(trim(value)) between 1 and 500),
  -- `order` cote TypeScript.
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (kind <> 'link' or value ~ '^https://')
);

create table public.sorting_guide_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 80),
  bin public.sorting_bin not null,
  advice text not null check (length(trim(advice)) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

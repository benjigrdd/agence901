-- Notifications push : envois cibles, livraisons, file individuelle.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 50),
  body text not null check (length(trim(body)) between 1 and 150),
  -- { "type": "all" | "districts" | "topics", "ids": [...] }
  target jsonb not null check (target ? 'type' and target ? 'ids'),
  linked_entity jsonb,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status public.notification_status not null default 'scheduled',
  stats jsonb not null default '{"recipients": 0, "opened": 0}'::jsonb,
  urgent boolean not null default false,
  justification text check (length(justification) <= 300),
  author_id uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  notification_id uuid not null,
  push_token_id uuid not null,
  ticket_id text,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (notification_id, push_token_id),
  foreign key (tenant_id, notification_id) references public.notifications (tenant_id, id) on delete cascade,
  foreign key (tenant_id, push_token_id) references public.push_tokens (tenant_id, id) on delete cascade
);

create table public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (tenant_id, id)
);

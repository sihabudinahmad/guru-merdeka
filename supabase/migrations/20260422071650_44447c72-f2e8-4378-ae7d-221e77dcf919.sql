
-- Roles enum and table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Access codes
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  max_devices integer not null default 2,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.access_codes enable row level security;

-- Devices linked to a code
create table public.code_devices (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  device_fingerprint text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (code_id, device_fingerprint)
);

alter table public.code_devices enable row level security;

-- Sessions (server-issued tokens)
create table public.code_sessions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  device_fingerprint text not null,
  session_token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked boolean not null default false
);

alter table public.code_sessions enable row level security;

create index idx_code_sessions_token on public.code_sessions(session_token);

-- Generations (history of generated documents)
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  type text not null check (type in ('rpp','rkp','soal')),
  title text not null,
  input_payload jsonb not null,
  output_content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

create index idx_generations_code on public.generations(code_id, created_at desc);

-- RLS: deny by default. Server functions use service role to bypass.
-- Admin policies on user_roles
create policy "admins manage user_roles"
on public.user_roles for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "users read own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

-- Admin can manage access_codes via dashboard (future)
create policy "admins manage access_codes"
on public.access_codes for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "admins read code_devices"
on public.code_devices for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "admins read code_sessions"
on public.code_sessions for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "admins read generations"
on public.generations for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

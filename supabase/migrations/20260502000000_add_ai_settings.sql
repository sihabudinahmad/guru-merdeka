create table public.ai_settings (
  id text primary key default 'default' check (id = 'default'),
  provider_label text not null default 'Lovable AI Gateway',
  api_base_url text not null default 'https://ai.gateway.lovable.dev/v1/chat/completions',
  api_key text not null default '',
  active_model text not null default 'google/gemini-2.5-flash',
  active_tier text not null default 'free' check (active_tier in ('free', 'paid')),
  model_catalog jsonb not null default '[]'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_settings enable row level security;

create policy "admins manage ai_settings"
on public.ai_settings for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_ai_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_ai_settings_updated_at
before update on public.ai_settings
for each row
execute function public.touch_ai_settings_updated_at();

insert into public.ai_settings (
  id,
  provider_label,
  api_base_url,
  active_model,
  active_tier,
  model_catalog,
  is_enabled
)
values (
  'default',
  'Lovable AI Gateway',
  'https://ai.gateway.lovable.dev/v1/chat/completions',
  'google/gemini-2.5-flash',
  'free',
  '[
    {"id": "google/gemini-2.5-flash", "label": "Gemini 2.5 Flash", "tier": "free", "description": "Mode cepat dan hemat biaya untuk penggunaan harian.", "enabled": true},
    {"id": "openai/gpt-4.1-mini", "label": "GPT-4.1 Mini", "tier": "paid", "description": "Kualitas lebih tinggi untuk kebutuhan produksi.", "enabled": true},
    {"id": "anthropic/claude-3.5-haiku", "label": "Claude 3.5 Haiku", "tier": "paid", "description": "Alternatif cepat untuk automasi dan generation ringan.", "enabled": true}
  ]'::jsonb,
  true
)
on conflict (id) do nothing;

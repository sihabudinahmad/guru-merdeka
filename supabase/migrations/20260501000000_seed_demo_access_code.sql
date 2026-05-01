-- Seed demo access code used by login page placeholder/hint.
insert into public.access_codes (code, label, max_devices, is_active)
values ('DEMO-GURU-2026', 'Demo Guru AI', 20, true)
on conflict (code) do update
set
  label = excluded.label,
  max_devices = excluded.max_devices,
  is_active = true;
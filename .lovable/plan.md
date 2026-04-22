

# Generator RPP / RKP / Soal — Aplikasi Guru dengan Kode Akses

Aplikasi web untuk guru Indonesia yang dapat menghasilkan **RPP (Rencana Pelaksanaan Pembelajaran)**, **RKP (Rencana Kegiatan Pembelajaran)**, dan **Soal Latihan** secara otomatis menggunakan AI. Akses dikontrol melalui **kode akses** (bukan email/password) — mirip aplikasi referensi.

## Stack Teknologi

- **Frontend**: TanStack Start (React 19) + Tailwind v4 + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — database, auth anonymous, server functions
- **AI**: Lovable AI Gateway (model `google/gemini-2.5-flash` — gratis selama promo, hemat biaya)
- **Export**: Generate file `.docx` (via `docx` library) dan `.pdf` (via `jspdf`) yang bisa diunduh guru

## Alur Pengguna

```text
[Landing /]
   │
   ├─ Tombol "Masuk dengan Kode Akses"
   │
   ▼
[Login Kode /login]
   │  Input: kode akses (mis: SABAT-XXXX-1234)
   │  → Validasi server: cek kode, cek limit perangkat (max 2)
   │  → Simpan token sesi di localStorage + register device fingerprint
   ▼
[Dashboard /app]
   ├─ Generator RPP        → /app/rpp
   ├─ Generator RKP        → /app/rkp
   ├─ Generator Soal       → /app/soal
   └─ Riwayat Dokumen      → /app/riwayat
            │
            ▼
   [Form Input] → AI Generate → [Preview Hasil] → Download .docx / .pdf
```

## Halaman / Route

| Route | Fungsi |
|---|---|
| `/` | Landing page: hero, fitur, cara pakai, CTA login |
| `/login` | Form input kode akses |
| `/app` (layout terproteksi) | Dashboard dengan 3 kartu generator + riwayat |
| `/app/rpp` | Form RPP: mata pelajaran, kelas, KD, alokasi waktu, model pembelajaran → hasil terstruktur |
| `/app/rkp` | Form RKP (PAUD/TK): tema, sub-tema, usia, hari, kegiatan main → hasil terstruktur |
| `/app/soal` | Form Soal: mata pelajaran, kelas, materi, jumlah soal, tipe (PG/Esai/Campuran), tingkat kesulitan |
| `/app/riwayat` | Daftar dokumen yang pernah dibuat oleh sesi kode ini |
| `/admin` | (opsional, kode admin) buat & kelola kode akses |

## Skema Database (Lovable Cloud)

**`access_codes`** — kode yang bisa dipakai guru
- `id`, `code` (unik), `label`, `max_devices` (default 2), `expires_at`, `is_active`, `created_at`

**`code_devices`** — perangkat terdaftar per kode (untuk batas 2 device)
- `id`, `code_id` (FK), `device_fingerprint`, `last_seen_at`, `created_at`
- Unique constraint: `(code_id, device_fingerprint)`

**`generations`** — riwayat dokumen
- `id`, `code_id` (FK), `type` (`rpp` | `rkp` | `soal`), `title`, `input_payload` (jsonb), `output_content` (text/markdown), `created_at`

**`user_roles`** + enum `app_role` (`admin`, `user`) — untuk halaman admin (tabel terpisah, sesuai best practice).

**RLS**: semua tabel diaktifkan. Akses dilakukan melalui server functions yang memvalidasi token sesi kode — client tidak query langsung untuk operasi sensitif.

## Backend — Server Functions

1. **`redeemAccessCode(code, deviceFingerprint)`** — validasi kode aktif, cek/insert device, batasi max 2; kembalikan `sessionToken` (signed JWT-lite).
2. **`generateDocument({ type, input })`** — middleware verifikasi `sessionToken`; panggil Lovable AI Gateway dengan prompt khusus per tipe (RPP/RKP/Soal); simpan ke `generations`; kembalikan hasil.
3. **`listHistory()`** — daftar `generations` milik kode aktif.
4. **`exportDocument(generationId, format)`** — render hasil ke `.docx` atau `.pdf` di server, kembalikan file.
5. **Admin**: `createAccessCode`, `listAccessCodes`, `revokeAccessCode` — diproteksi `has_role(uid, 'admin')`.

## Prompt AI (per tipe)

- **RPP**: minta output terstruktur (Identitas, Tujuan Pembelajaran, Materi, Metode, Langkah Pembukaan/Inti/Penutup, Penilaian) sesuai Kurikulum Merdeka.
- **RKP**: format mingguan/harian PAUD — Tema, Tujuan, Kegiatan Pembuka/Inti/Penutup, Alat & Bahan, Penilaian Anak.
- **Soal**: array soal terstruktur dengan kunci jawaban + pembahasan singkat.

Semua memakai `response_format` JSON agar bisa dirender rapi di UI sebelum di-export.

## Sistem Kode Akses (mirip referensi)

- Kode dibuat oleh admin (mis: `SABAT-AB12-3456`).
- Saat login: simpan `device_fingerprint` (hash dari userAgent + canvas + timezone).
- Jika kode sudah dipakai 2 perangkat berbeda → tolak login di perangkat ke-3.
- Sesi disimpan di `localStorage` sebagai token bertanda tangan; route `/app/*` diproteksi via `beforeLoad` yang memverifikasi token ke server.
- Logout = hapus token (slot device tetap, bisa dipakai lagi di perangkat sama).

## Tampilan / Desain

- Tema bersih, ramah guru: warna utama biru-hijau pendidikan, font Inter.
- Mobile-first (banyak guru pakai HP) — viewport 499px sudah dipertimbangkan.
- Landing page: hero + 3 kartu fitur + testimoni + FAQ + CTA.
- Dashboard: kartu besar dengan ikon untuk tiap generator + tombol riwayat.
- Form generator: stepper ringkas → loading state dengan estimasi waktu → preview hasil dengan tombol Edit, Salin, Download .docx, Download .pdf.

## Yang Akan Dibangun (Tahap 1 — MVP)

1. Aktifkan Lovable Cloud + buat tabel di atas + RLS + seed 1 kode demo + 1 admin.
2. Landing page `/` + halaman `/login` (kode akses).
3. Layout terproteksi `/app` + dashboard.
4. Generator **RPP** & **Soal** (RKP menyusul tahap 2).
5. Server function AI + simpan riwayat.
6. Export `.docx` (PDF tahap 2).
7. Halaman riwayat sederhana.

Tahap 2 (setelah MVP berjalan): generator RKP, export PDF, halaman admin pengelolaan kode, dashboard statistik penggunaan.

## Catatan Biaya

- **Lovable AI Gateway** dengan `google/gemini-2.5-flash` saat ini **gratis** (promo) — setelah promo selesai, biaya per token sangat murah (~$0.075/1M input). Anda tidak perlu API key sendiri.
- **Lovable Cloud**: ada kuota gratis bulanan, cukup untuk pengujian dan pengguna awal.


## Fitur Rekomendasi AI untuk Form RPP

Ketika user sudah mengisi Mata Pelajaran, Kelas, dan Fase, mereka bisa klik tombol untuk mendapatkan rekomendasi otomatis dari AI untuk field **Materi Pokok** dan **Tujuan Pembelajaran**.

### Perubahan

#### 1. Server function baru: `suggestRppContent`
- File: `src/server/generate.functions.ts`
- Menerima input: `mataPelajaran`, `kelas`, `fase`, `token`
- Memanggil AI (Gemini Flash) dengan prompt singkat untuk menghasilkan 3-5 rekomendasi materi pokok dan 3-5 tujuan pembelajaran sesuai Kurikulum Merdeka
- Mengembalikan array `materi` dan array `tujuan` sebagai suggestions

#### 2. Update form RPP (`src/routes/app.rpp.tsx`)
- Ganti label "Catatan Tujuan (opsional)" menjadi **"Tujuan Pembelajaran"**
- Tambahkan tombol "Rekomendasikan" (ikon Sparkles) di samping field Materi Pokok dan Tujuan Pembelajaran
- Tombol aktif hanya jika Mata Pelajaran dan Kelas sudah diisi
- Saat diklik, panggil `suggestRppContent` dan tampilkan hasilnya sebagai chip/badge yang bisa diklik untuk mengisi field, atau langsung isi field dengan rekomendasi
- Loading state saat AI sedang memproses

#### 3. UX Flow
1. User isi Mata Pelajaran, Kelas, dan Fase (opsional)
2. Klik tombol "Rekomendasikan" di area Materi/Tujuan
3. AI menghasilkan beberapa opsi rekomendasi
4. Rekomendasi ditampilkan sebagai daftar yang bisa diklik untuk dipilih/dimasukkan ke field
5. User bisa mengedit hasil rekomendasi sebelum submit

### Detail Teknis

- Server function menggunakan `createServerFn` dengan tool calling (structured output) untuk mendapatkan JSON terstruktur dari AI
- Validasi session token sama seperti `generateDocument`
- Model: `google/gemini-2.5-flash` (cepat dan hemat)

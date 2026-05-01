
## Tujuan

Mengubah schema AI, prompt, form input, dan tampilan hasil RPP agar menghasilkan format yang lebih detail dan lengkap sesuai contoh dokumen "Perencanaan Pelaksanaan Pembelajaran" yang diunggah.

## Perbandingan Format Saat Ini vs Format Baru

| Saat Ini | Format Baru (sesuai contoh) |
|----------|-----------------------------|
| Identitas dasar (mapel, kelas, fase, waktu, materi) | + Satuan Pendidikan, Semester, Tahun Pelajaran, Nama Penyusun, Durasi |
| - | **Identifikasi**: Karakteristik, Minat Bakat, Latar Belakang, Kebutuhan Belajar peserta didik |
| - | Dimensi Profil Lulusan (checklist 8 dimensi) |
| Tujuan Pembelajaran | Capaian Pembelajaran + Tujuan Pembelajaran |
| - | Lintas Disiplin Ilmu |
| Model Pembelajaran | Praktik Pedagogis (Model + Metode) |
| - | Kemitraan |
| - | Lingkungan Pembelajaran (ruang fisik, virtual, budaya) |
| - | Pemanfaatan Digital |
| - | Sarana Prasarana |
| Media & Sumber | Sumber Belajar |
| Langkah: Pembukaan/Inti/Penutup (list sederhana) | Langkah detail: Awal + durasi, Inti + durasi (dengan sub-tahap Memahami/Mengaplikasi/Merefleksi), Penutup |
| Penilaian (sikap/pengetahuan/keterampilan) | Asesmen Awal, Asesmen Proses, Asesmen Akhir |
| Profil Pelajar Pancasila (list) | Terintegrasi di Dimensi Profil Lulusan |

## Perubahan Teknis

### 1. Form Input (`src/routes/app.rpp.tsx`)

Menambah field input baru:
- **Satuan Pendidikan** (text)
- **Semester** (select: Ganjil/Genap)
- **Tahun Pelajaran** (text, default tahun ini)
- **Nama Penyusun** (text, opsional)
- **Karakteristik Peserta Didik** (textarea, opsional — untuk konteks AI)

Field yang sudah ada tetap dipertahankan.

### 2. AI Schema & Prompt (`src/server/generate.functions.ts`)

**RPP_SCHEMA** diperluas menjadi:
- `identitas`: + satuanPendidikan, semester, tahunPelajaran, namaPenyusun, durasi
- `identifikasi` (baru): karakteristik, minatBakat, latarBelakang, kebutuhanBelajar (semua string deskriptif)
- `dimensiProfilLulusan`: array string (8 dimensi yang relevan)
- `desainPembelajaran`:
  - capaianPembelajaran (string)
  - lintasDisiplinIlmu (array string)
  - tujuanPembelajaran (array string)
  - praktikPedagogis: { model, metode } 
  - kemitraan (string)
- `lingkunganPembelajaran`: ruangFisik, ruangVirtual, budayaBelajar (string)
- `pemanfaatanDigital` (string)
- `saranaPrasarana` (array string)
- `sumberBelajar` (array string)
- `pengalamanPembelajaran`:
  - awal: { durasi, kegiatan: array string }
  - inti: { durasi, tahapan: array { nama, kegiatan: array string } }
  - penutup: { kegiatan: array string }
- `asesmen`: { awal, proses, akhir } (semua string)

**Prompt** diperkaya agar AI menghasilkan output sesuai format Perencanaan Pelaksanaan Pembelajaran yang lebih detail, termasuk menyusun identifikasi peserta didik, dimensi profil lulusan, tahapan inti (Memahami, Mengaplikasi, Merefleksi), dll.

### 3. Tampilan Hasil (`src/components/generator-shared.tsx`)

`RppView` diperbarui untuk merender semua bagian baru:
- Section Identitas (lengkap)
- Section Identifikasi (kesiapan peserta didik)
- Section Dimensi Profil Lulusan
- Section Desain Pembelajaran (CP, TP, lintas disiplin, praktik pedagogis, kemitraan)
- Section Lingkungan & Sarana
- Section Pengalaman Pembelajaran (dengan sub-tahapan di bagian inti)
- Section Asesmen

### 4. Export DOCX & PDF

File `src/lib/docx-export.ts` dan `src/lib/pdf-export.ts` diperbarui agar mencetak semua section baru ke dalam file yang diunduh.

### 5. Validasi Input

`RppInput` di server diperluas untuk menerima field baru (satuanPendidikan, semester, tahunPelajaran, namaPenyusun, karakteristikPesertaDidik) — semua opsional agar backward-compatible.

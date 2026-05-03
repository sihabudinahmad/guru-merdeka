import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { getAiRuntimeConfig } from "@/lib/ai-settings.server";

type AITool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

async function getCodeIdFromToken(token: string): Promise<{ codeId: string } | null> {
  const { data } = await supabaseAdmin
    .from("code_sessions")
    .select("code_id, expires_at, revoked, access_codes(is_active)")
    .eq("session_token", token)
    .maybeSingle();
  if (!data || data.revoked) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const ac = (data as { access_codes: { is_active: boolean } | null }).access_codes;
  if (!ac?.is_active) return null;
  return { codeId: data.code_id };
}

const RppInput = z.object({
  mataPelajaran: z.string().min(1).max(80),
  kelas: z.string().min(1).max(40),
  fase: z.string().max(20).optional().default(""),
  semester: z.string().max(20).optional().default(""),
  satuanPendidikan: z.string().max(120).optional().default(""),
  tahunPelajaran: z.string().max(20).optional().default(""),
  namaPenyusun: z.string().max(80).optional().default(""),
  alokasiWaktu: z.string().min(1).max(40),
  materi: z.string().min(1).max(500),
  tujuanPembelajaran: z.string().max(800).optional().default(""),
  modelPembelajaran: z.string().max(80).optional().default("Discovery Learning"),
  karakteristikPesertaDidik: z.string().max(600).optional().default(""),
});

const SoalInput = z.object({
  jenisUjian: z.string().max(80).optional().default(""),
  headerBaris1: z.string().max(120).optional().default(""),
  headerBaris2: z.string().max(120).optional().default(""),
  tahunPelajaran: z.string().max(20).optional().default(""),
  hariTanggalUjian: z.string().max(80).optional().default(""),
  fase: z.string().max(40).optional().default(""),
  kelas: z.string().min(1).max(40),
  mataPelajaran: z.string().min(1).max(80),
  mataPelajaranManual: z.string().max(500).optional().default(""),
  semester: z.string().max(20).optional().default(""),
  waktu: z.string().max(40).optional().default("60 menit"),
  topik: z.string().max(500).optional().default(""),
  tujuanPembelajaran: z.string().max(800).optional().default(""),
  sumberReferensi: z.string().max(1000).optional().default(""),
  jumlahSoal: z.number().int().min(1).max(30),
  tipeSoal: z.string().max(200).optional().default(""),
  formatSoal: z.enum(["pg", "pgkompleks", "menjodohkan", "benarSalah", "isianSingkat", "uraian", "campuran"]),
  jumlahPilihanPg: z.number().int().min(3).max(5).optional().default(4),
  tingkat: z.enum(["hots", "lots", "campuran"]),
  tambahkanIlustrasi: z.boolean().optional().default(false),
  petunjukPengerjaan: z.union([z.string().max(3000), z.array(z.string().max(300))]).optional(),
});

const RkpInput = z.object({
  tema: z.string().min(1).max(80),
  subTema: z.string().min(1).max(80),
  usia: z.string().min(1).max(20),
  hari: z.string().min(1).max(20),
  alokasiWaktu: z.string().min(1).max(40),
  fokus: z.string().max(400).optional().default(""),
});

const GenerateInput = z.object({
  token: z.string().min(16).max(256),
  type: z.enum(["rpp", "soal", "rkp"]),
  payload: z.unknown(),
});

const RPP_SCHEMA = {
  name: "tulis_rpp",
  description: "Menyusun RPP (Perencanaan Pelaksanaan Pembelajaran) terstruktur dan detail sesuai Kurikulum Merdeka.",
  parameters: {
    type: "object",
    properties: {
      identitas: {
        type: "object",
        properties: {
          namaPenyusun: { type: "string" },
          satuanPendidikan: { type: "string" },
          mataPelajaran: { type: "string" },
          kelas: { type: "string" },
          semester: { type: "string" },
          fase: { type: "string" },
          durasi: { type: "string" },
          tahunPelajaran: { type: "string" },
        },
        required: ["mataPelajaran", "kelas", "durasi"],
      },
      identifikasi: {
        type: "object",
        description: "Identifikasi kesiapan peserta didik",
        properties: {
          karakteristik: { type: "string", description: "Karakteristik umum peserta didik" },
          minatBakat: { type: "string", description: "Minat dan bakat peserta didik" },
          latarBelakang: { type: "string", description: "Latar belakang peserta didik" },
          kebutuhanBelajar: { type: "string", description: "Kebutuhan belajar peserta didik" },
          materiPelajaran: { type: "string", description: "Materi pelajaran yang akan diajarkan" },
        },
        required: ["karakteristik", "minatBakat", "latarBelakang", "kebutuhanBelajar", "materiPelajaran"],
      },
      dimensiProfilLulusan: {
        type: "array",
        items: { type: "string" },
        description: "Dimensi Profil Lulusan yang relevan",
      },
      desainPembelajaran: {
        type: "object",
        properties: {
          capaianPembelajaran: { type: "string" },
          lintasDisiplinIlmu: { type: "array", items: { type: "string" } },
          tujuanPembelajaran: { type: "array", items: { type: "string" } },
          praktikPedagogis: {
            type: "object",
            properties: {
              model: { type: "string" },
              metode: { type: "string" },
            },
            required: ["model", "metode"],
          },
          kemitraan: { type: "string" },
        },
        required: ["capaianPembelajaran", "tujuanPembelajaran", "praktikPedagogis"],
      },
      lingkunganPembelajaran: {
        type: "object",
        properties: {
          ruangFisik: { type: "string" },
          ruangVirtual: { type: "string" },
          budayaBelajar: { type: "string" },
        },
        required: ["ruangFisik", "ruangVirtual", "budayaBelajar"],
      },
      pemanfaatanDigital: { type: "string" },
      saranaPrasarana: { type: "array", items: { type: "string" } },
      sumberBelajar: { type: "array", items: { type: "string" } },
      pengalamanPembelajaran: {
        type: "object",
        properties: {
          awal: {
            type: "object",
            properties: {
              durasi: { type: "string" },
              kegiatan: { type: "array", items: { type: "string" } },
            },
            required: ["durasi", "kegiatan"],
          },
          inti: {
            type: "object",
            properties: {
              durasi: { type: "string" },
              tahapan: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nama: { type: "string" },
                    label: { type: "string" },
                    kegiatan: { type: "array", items: { type: "string" } },
                  },
                  required: ["nama", "kegiatan"],
                },
              },
            },
            required: ["durasi", "tahapan"],
          },
          penutup: {
            type: "object",
            properties: {
              kegiatan: { type: "array", items: { type: "string" } },
            },
            required: ["kegiatan"],
          },
        },
        required: ["awal", "inti", "penutup"],
      },
      asesmen: {
        type: "object",
        properties: {
          awal: { type: "string" },
          proses: { type: "string" },
          akhir: { type: "string" },
        },
        required: ["awal", "proses", "akhir"],
      },
    },
    required: [
      "identitas",
      "identifikasi",
      "dimensiProfilLulusan",
      "desainPembelajaran",
      "lingkunganPembelajaran",
      "pengalamanPembelajaran",
      "asesmen",
    ],
    additionalProperties: false,
  },
};

const SOAL_SCHEMA = {
  name: "tulis_soal",
  description: "Membuat kumpulan soal latihan beserta kisi-kisi, kunci jawaban, dan pembahasan sesuai format Kurikulum Merdeka.",
  parameters: {
    type: "object",
    properties: {
      judul: { type: "string" },
      jenisUjian: { type: "string" },
      headerBaris1: { type: "string" },
      headerBaris2: { type: "string" },
      tahunPelajaran: { type: "string" },
      hariTanggalUjian: { type: "string" },
      fase: { type: "string" },
      mataPelajaran: { type: "string" },
      kelas: { type: "string" },
      semester: { type: "string" },
      waktu: { type: "string" },
      topik: { type: "string" },
      tujuanPembelajaran: { type: "string" },
      sumberReferensi: { type: "string" },
      tipeSoal: { type: "string" },
      formatSoal: { type: "string" },
      tingkatKesulitan: { type: "string" },
      tambahkanIlustrasi: { type: "boolean" },
      petunjukPengerjaan: {
        type: "array",
        items: { type: "string" },
      },
      kisiKisi: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nomor: { type: "number" },
            kompetensiDasar: { type: "string" },
            indikator: { type: "string" },
            materi: { type: "string" },
            tingkatKognitif: { type: "string" },
            bentukSoal: { type: "string" },
            nomorSoal: { type: "string" },
          },
          required: ["nomor", "kompetensiDasar", "indikator", "materi", "tingkatKognitif", "bentukSoal", "nomorSoal"],
        },
      },
      soal: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nomor: { type: "number" },
            tipe: { type: "string" },
            format: { type: "string" },
            pertanyaan: { type: "string" },
            opsi: { type: "array", items: { type: "string" } },
            pasangan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  kiri: { type: "string" },
                  kanan: { type: "string" },
                },
              },
            },
            kunciJawaban: { type: "string" },
            pembahasan: { type: "string" },
            tingkat: { type: "string" },
            c_level: { type: "string" },
            ilustrasi: { type: "string", description: "Isi HANYA jika soal ini benar-benar membutuhkan gambar/diagram untuk dipahami. Jika diisi, WAJIB berupa kode SVG inline yang valid (dimulai dengan <svg) yang merepresentasikan gambar/diagram dimaksud. Kosongkan jika tidak perlu." },
          },
          required: ["nomor", "tipe", "pertanyaan", "kunciJawaban", "pembahasan", "tingkat"],
        },
      },
    },
    required: ["judul", "mataPelajaran", "kelas", "kisiKisi", "soal"],
    additionalProperties: false,
  },
};

function getSoalFormatLabel(format: string | undefined) {
  switch (format) {
    case "pg": return "Pilihan Ganda";
    case "pgkompleks": return "Pilihan Ganda Kompleks";
    case "menjodohkan": return "Menjodohkan";
    case "benarSalah": return "Benar/Salah";
    case "isianSingkat": return "Isian Singkat";
    case "uraian":
    case "esai": return "Uraian";
    default: return "Soal";
  }
}

function inferCLevel(source: Record<string, any>, soal: Record<string, any>) {
  if (typeof soal.c_level === "string" && soal.c_level.trim()) return soal.c_level.trim();
  if (typeof source.tipeSoal === "string") {
    const match = source.tipeSoal.match(/C[1-6]/i);
    if (match) return match[0].toUpperCase();
  }
  return "C2";
}

function deriveKisiKisiFromSoal(source: Record<string, any>) {
  const soalList = Array.isArray(source.soal) ? source.soal : [];
  const tujuan = typeof source.tujuanPembelajaran === "string" && source.tujuanPembelajaran.trim()
    ? source.tujuanPembelajaran.trim()
    : `Peserta didik memahami materi ${source.topik ?? source.mataPelajaran ?? "pembelajaran"}`;
  const materi = source.topik ?? source.materi ?? source.mataPelajaran ?? "-";

  return soalList.map((soal: any, index: number) => {
    const format = soal.format ?? soal.tipe;
    const nomor = Number(soal.nomor ?? index + 1);
    return {
      nomor: index + 1,
      kompetensiDasar: tujuan,
      indikator: `Peserta didik dapat menjawab soal nomor ${nomor} dengan benar sesuai materi yang diujikan.`,
      materi,
      tingkatKognitif: inferCLevel(source, soal),
      bentukSoal: getSoalFormatLabel(format),
      nomorSoal: String(nomor),
    };
  });
}

function canonicalizeFormat(raw: string | undefined): string {
  if (!raw) return "uraian";
  const v = raw.toLowerCase().trim();
  if (["pg", "pilihan ganda", "multiple choice", "pilihanganda", "pilihan_ganda"].includes(v)) return "pg";
  if (["pgkompleks", "pilihan ganda kompleks", "pg kompleks", "pg_kompleks"].includes(v)) return "pgkompleks";
  if (["menjodohkan", "matching", "jodoh"].includes(v)) return "menjodohkan";
  if (["benarsalah", "benar salah", "benar/salah", "true false", "truefalse"].includes(v)) return "benarSalah";
  if (["isiansingkat", "isian singkat", "isian", "fill in"].includes(v)) return "isianSingkat";
  if (["uraian", "esai", "essay", "uraian bebas"].includes(v)) return "uraian";
  return v;
}

function normalizeSoalContent(content: Json): Json {
  if (!content || typeof content !== "object" || Array.isArray(content)) return content;

  const normalized = { ...(content as Record<string, any>) };
  if (Array.isArray(normalized.kisi_kisi) && !Array.isArray(normalized.kisiKisi)) {
    normalized.kisiKisi = normalized.kisi_kisi;
  }

  if (Array.isArray(normalized.soal)) {
    normalized.soal = normalized.soal.map((soal: any, index: number) => {
      const rawFormat = soal.format ?? soal.tipe;
      const canonical = canonicalizeFormat(rawFormat);
      return {
        ...soal,
        nomor: soal.nomor ?? index + 1,
        format: canonical,
        tipe: canonical,
        c_level: inferCLevel(normalized, soal),
      };
    });
  }

  if (!Array.isArray(normalized.kisiKisi) || normalized.kisiKisi.length === 0) {
    normalized.kisiKisi = deriveKisiKisiFromSoal(normalized);
  }

  return normalized as Json;
}

function normalizePetunjukPayload(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function enrichSoalMetadata(content: Json, payload: z.infer<typeof SoalInput>): Json {
  if (!content || typeof content !== "object" || Array.isArray(content)) return content;
  const normalized = { ...(content as Record<string, any>) };
  const petunjuk = normalizePetunjukPayload(payload.petunjukPengerjaan);

  normalized.jenisUjian = normalized.jenisUjian ?? payload.jenisUjian;
  normalized.headerBaris1 = payload.headerBaris1 || normalized.headerBaris1 || payload.jenisUjian || "Sumatif Lingkup Materi";
  normalized.headerBaris2 = payload.headerBaris2 || normalized.headerBaris2 || `TAHUN PELAJARAN ${payload.tahunPelajaran || "20.../20..."}`;
  normalized.tahunPelajaran = payload.tahunPelajaran || normalized.tahunPelajaran || "";
  normalized.hariTanggalUjian = payload.hariTanggalUjian || normalized.hariTanggalUjian || "";
  normalized.petunjukPengerjaan = petunjuk.length > 0
    ? petunjuk
    : normalizePetunjukPayload(normalized.petunjukPengerjaan);

  return normalized as Json;
}

const RKP_SCHEMA = {
  name: "tulis_rkp",
  description: "Menyusun RKP harian PAUD/TK.",
  parameters: {
    type: "object",
    properties: {
      identitas: {
        type: "object",
        properties: {
          tema: { type: "string" },
          subTema: { type: "string" },
          usia: { type: "string" },
          hari: { type: "string" },
          alokasiWaktu: { type: "string" },
        },
        required: ["tema", "subTema", "usia", "hari", "alokasiWaktu"],
      },
      tujuanPembelajaran: { type: "array", items: { type: "string" } },
      kegiatan: {
        type: "object",
        properties: {
          pembukaan: { type: "array", items: { type: "string" } },
          inti: { type: "array", items: { type: "string" } },
          penutup: { type: "array", items: { type: "string" } },
        },
        required: ["pembukaan", "inti", "penutup"],
      },
      alatBahan: { type: "array", items: { type: "string" } },
      penilaian: { type: "array", items: { type: "string" } },
    },
    required: ["identitas", "tujuanPembelajaran", "kegiatan", "alatBahan", "penilaian"],
    additionalProperties: false,
  },
};

function buildPrompt(type: "rpp" | "soal" | "rkp", payload: unknown): { system: string; user: string; tool: AITool } {
  if (type === "rpp") {
    const p = RppInput.parse(payload);
    return {
      system:
        `Anda adalah perancang kurikulum berpengalaman di Indonesia. Buat Perencanaan Pelaksanaan Pembelajaran (RPP) yang sangat detail dan berkualitas sesuai Kurikulum Merdeka, dalam Bahasa Indonesia formal pendidikan.`,
      user: `Buat RPP detail untuk:
- Mata Pelajaran: ${p.mataPelajaran}
- Kelas: ${p.kelas}${p.fase ? ` (Fase ${p.fase})` : ""}${p.semester ? `\n- Semester: ${p.semester}` : ""}${p.satuanPendidikan ? `\n- Satuan Pendidikan: ${p.satuanPendidikan}` : ""}${p.tahunPelajaran ? `\n- Tahun Pelajaran: ${p.tahunPelajaran}` : ""}${p.namaPenyusun ? `\n- Nama Penyusun: ${p.namaPenyusun}` : ""}
- Alokasi Waktu / Durasi: ${p.alokasiWaktu}
- Materi Pokok: ${p.materi}
- Model Pembelajaran: ${p.modelPembelajaran}
${p.tujuanPembelajaran ? `- Tujuan Pembelajaran: ${p.tujuanPembelajaran}` : ""}
${p.karakteristikPesertaDidik ? `- Karakteristik Peserta Didik: ${p.karakteristikPesertaDidik}` : ""}
Sertakan minimal 3 tujuan pembelajaran terukur, langkah pembelajaran yang sangat detail dan konkret per tahapan, serta asesmen yang sesuai.`,
      tool: RPP_SCHEMA,
    };
  }
  if (type === "soal") {
    const p = SoalInput.parse(payload);
    return {
      system:
        "Anda adalah penulis soal ujian bermutu untuk guru Indonesia. Buat soal yang jelas, valid, lengkap dengan kisi-kisi, kunci jawaban, dan pembahasan sesuai format Kurikulum Merdeka.",
      user: `Buat ${p.jumlahSoal} soal format ${p.formatSoal === "campuran" ? "campuran (pilihan ganda, esai, dan lainnya)" : p.formatSoal} tingkat ${p.tingkat} untuk:
- Mata Pelajaran: ${p.mataPelajaran}
- Kelas: ${p.kelas}
${p.fase ? `- Fase: ${p.fase}` : ""}
    ${p.jenisUjian ? `- Jenis Ujian: ${p.jenisUjian}` : ""}
    ${p.headerBaris1 ? `- Header Baris 1: ${p.headerBaris1}` : ""}
    ${p.headerBaris2 ? `- Header Baris 2: ${p.headerBaris2}` : ""}
    ${p.tahunPelajaran ? `- Tahun Pelajaran: ${p.tahunPelajaran}` : ""}
    ${p.hariTanggalUjian ? `- Hari/Tanggal Ujian: ${p.hariTanggalUjian}` : ""}
${p.topik ? `- Topik: ${p.topik}` : ""}
${p.tujuanPembelajaran ? `- Tujuan Pembelajaran: ${p.tujuanPembelajaran}` : ""}
${p.tipeSoal ? `- Taksonomi: ${p.tipeSoal}` : ""}
${p.waktu ? `- Waktu: ${p.waktu}` : ""}
${p.sumberReferensi ? `- Referensi: ${p.sumberReferensi}` : ""}
    ${p.petunjukPengerjaan ? `- Petunjuk Pengerjaan:\n${normalizePetunjukPayload(p.petunjukPengerjaan).map((x, i) => `  ${i + 1}. ${x}`).join("\n")}` : ""}
${p.formatSoal === "pg" ? `- Jumlah opsi jawaban PG: ${p.jumlahPilihanPg} (gunakan ${p.jumlahPilihanPg === 3 ? "A-C" : p.jumlahPilihanPg === 4 ? "A-D" : "A-E"})` : ""}
${p.tambahkanIlustrasi ? "- Ilustrasi BOLEH ditambahkan HANYA pada soal yang memerlukan gambar/diagram (misalnya bangun ruang, grafik, peta). Jika soal memerlukan ilustrasi, isi field \"ilustrasi\" dengan kode SVG inline yang valid dan sederhana (dimulai dengan <svg xmlns=\"http://www.w3.org/2000/svg\"). Untuk soal teks biasa, kosongkan field ilustrasi." : "- Jangan isi field ilustrasi pada soal manapun."}
WAJIB sertakan field "kisiKisi" sebagai array dan isi untuk semua soal.
Setiap item kisi-kisi harus memiliki: nomor, kompetensiDasar, indikator, materi, tingkatKognitif, bentukSoal, dan nomorSoal.
    Sertakan juga metadata dokumen: "headerBaris1", "headerBaris2", "tahunPelajaran", "hariTanggalUjian", dan "petunjukPengerjaan" (array string).
Pastikan jawaban akurat, pembahasan jelas, dan sesuai dengan tingkat kesulitan yang diminta.
Jika format soal adalah "pg", setiap soal WAJIB memiliki tepat ${p.jumlahPilihanPg} opsi jawaban dalam field "opsi" berupa array string dan tidak boleh kosong.
Setiap item pada field "opsi" hanya boleh berisi isi jawaban, tanpa awalan label seperti A., B., C., atau D. karena label akan dibuat otomatis oleh aplikasi.
Jika format soal bukan pilihan ganda, jangan isi field "opsi" dengan data kosong yang tidak perlu.`,
      tool: SOAL_SCHEMA,
    };
  }
  const p = RkpInput.parse(payload);
  return {
    system:
      "Anda adalah ahli pendidikan anak usia dini (PAUD/TK) di Indonesia. Buat RKP harian yang menyenangkan, kontekstual, dan sesuai tahap perkembangan anak.",
    user: `Buat RKP harian untuk:
- Tema: ${p.tema} / Sub-tema: ${p.subTema}
- Usia: ${p.usia} tahun
- Hari: ${p.hari}
- Alokasi Waktu: ${p.alokasiWaktu}
${p.fokus ? `- Fokus: ${p.fokus}` : ""}`,
    tool: RKP_SCHEMA,
  };
}

function deriveTitle(type: "rpp" | "soal" | "rkp", payload: unknown): string {
  try {
    if (type === "rpp") {
      const p = RppInput.parse(payload);
      return `RPP ${p.mataPelajaran} — ${p.kelas}`;
    }
    if (type === "soal") {
      const p = SoalInput.parse(payload);
      return `Soal ${p.mataPelajaran} — ${p.kelas} (${p.jumlahSoal} soal)`;
    }
    const p = RkpInput.parse(payload);
    return `RKP ${p.tema} — ${p.usia} thn (${p.hari})`;
  } catch {
    return `Dokumen ${type.toUpperCase()}`;
  }
}

export const generateDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) {
      return { ok: false as const, error: "Sesi tidak valid. Silakan login ulang." };
    }

    const { url, apiKey, model, isEnabled } = await getAiRuntimeConfig();
    if (!isEnabled) {
      return { ok: false as const, error: "Layanan AI sedang dinonaktifkan oleh admin." };
    }
    if (!apiKey) {
      return { ok: false as const, error: "AI Gateway belum dikonfigurasi (API key kosong)." };
    }

    const { system, user, tool } = buildPrompt(data.type, data.payload);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    });

    if (res.status === 429) {
      return { ok: false as const, error: "Terlalu banyak permintaan. Coba lagi sebentar." };
    }
    if (res.status === 402) {
      return { ok: false as const, error: "Kredit AI habis. Hubungi admin untuk menambah kredit." };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI gateway error", res.status, text);
      return { ok: false as const, error: `Gagal menghubungi AI (${res.status}): ${text}` };
    }

    const json = await res.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return { ok: false as const, error: "AI tidak mengembalikan hasil terstruktur." };
    }
    let parsed: Json;
    try {
      parsed = JSON.parse(toolCall.function.arguments) as Json;
    } catch {
      return { ok: false as const, error: "Gagal mengurai hasil AI." };
    }

    if (data.type === "soal") {
      const soalInput = SoalInput.parse(data.payload);
      if (Array.isArray(parsed)) {
        parsed = { soal: parsed } as Json;
      }
      parsed = normalizeSoalContent(parsed);
      parsed = enrichSoalMetadata(parsed, soalInput);
    }

    const title = deriveTitle(data.type, data.payload);
    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("generations")
      .insert([
        {
          code_id: sess.codeId,
          type: data.type,
          title,
          input_payload: data.payload as Json,
          output_content: parsed,
        },
      ])
      .select("id")
      .single();
    if (saveErr) {
      console.error("save generation failed", saveErr);
    }

    return { ok: true as const, id: saved?.id ?? null, title, type: data.type, content: parsed };
  });

const ListInput = z.object({ token: z.string().min(16).max(256) });
export const listHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) return { ok: false as const, error: "Sesi tidak valid." };
    const { data: rows, error } = await supabaseAdmin
      .from("generations")
      .select("id, type, title, created_at")
      .eq("code_id", sess.codeId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: "Gagal memuat riwayat." };
    return { ok: true as const, items: rows ?? [] };
  });

const GetInput = z.object({ token: z.string().min(16).max(256), id: z.string().uuid() });
export const getGeneration = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GetInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) return { ok: false as const, error: "Sesi tidak valid." };
    const { data: row, error } = await supabaseAdmin
      .from("generations")
      .select("id, type, title, input_payload, output_content, created_at")
      .eq("code_id", sess.codeId)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) return { ok: false as const, error: "Dokumen tidak ditemukan." };
    return { ok: true as const, item: row };
  });

const SuggestInput = z.object({
  token: z.string().min(16).max(256),
  mataPelajaran: z.string().min(1).max(80),
  kelas: z.string().min(1).max(40),
  fase: z.string().max(20).optional().default(""),
});

const SuggestSoalInput = z.object({
  token: z.string().min(16).max(256),
  mataPelajaran: z.string().min(1).max(80),
  kelas: z.string().min(1).max(40),
  fase: z.string().max(20).optional().default(""),
  tipeSoal: z.string().max(200).optional().default(""),
});

const SuggestSoalTujuanInput = z.object({
  token: z.string().min(16).max(256),
  mataPelajaran: z.string().min(1).max(80),
  kelas: z.string().min(1).max(40),
  fase: z.string().max(20).optional().default(""),
  tipeSoal: z.string().max(200).optional().default(""),
  topik: z.string().min(1).max(500),
});

const SUGGEST_SCHEMA = {
  name: "suggest_rpp_content",
  description: "Memberikan rekomendasi materi pokok dan tujuan pembelajaran.",
  parameters: {
    type: "object",
    properties: {
      materi: {
        type: "array",
        items: { type: "string" },
        description: "3-5 rekomendasi materi pokok / kompetensi dasar",
      },
      tujuan: {
        type: "array",
        items: { type: "string" },
        description: "3-5 rekomendasi tujuan pembelajaran yang terukur",
      },
    },
    required: ["materi", "tujuan"],
    additionalProperties: false,
  },
};

const SUGGEST_SOAL_SCHEMA = {
  name: "suggest_soal_topik",
  description: "Memberikan rekomendasi topik pembelajaran untuk soal.",
  parameters: {
    type: "object",
    properties: {
      topik: {
        type: "array",
        items: { type: "string" },
        description: "3-5 rekomendasi topik pembelajaran yang relevan",
      },
    },
    required: ["topik"],
    additionalProperties: false,
  },
};

const SUGGEST_SOAL_TUJUAN_SCHEMA = {
  name: "suggest_soal_tujuan",
  description: "Memberikan rekomendasi tujuan pembelajaran untuk topik tertentu.",
  parameters: {
    type: "object",
    properties: {
      tujuan: {
        type: "array",
        items: { type: "string" },
        description: "3-5 rekomendasi tujuan pembelajaran yang terukur sesuai topik dan taksonomi Bloom",
      },
    },
    required: ["tujuan"],
    additionalProperties: false,
  },
};

export const suggestRppContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) return { ok: false as const, error: "Sesi tidak valid." };

    const { url, apiKey, model, isEnabled } = await getAiRuntimeConfig();
    if (!isEnabled) {
      return { ok: false as const, error: "Layanan AI sedang dinonaktifkan oleh admin." };
    }
    if (!apiKey) return { ok: false as const, error: "AI Gateway belum dikonfigurasi." };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Anda adalah ahli kurikulum pendidikan Indonesia (Kurikulum Merdeka). Berikan rekomendasi materi pokok dan tujuan pembelajaran yang relevan, konkret, dan terukur.",
          },
          {
            role: "user",
            content: `Berikan rekomendasi untuk:\n- Mata Pelajaran: ${data.mataPelajaran}\n- Kelas: ${data.kelas}${data.fase ? ` (Fase ${data.fase})` : ""}\n\nBerikan 3-5 materi pokok yang sesuai dan 3-5 tujuan pembelajaran yang terukur sesuai Kurikulum Merdeka.`,
          },
        ],
        tools: [{ type: "function", function: SUGGEST_SCHEMA }],
        tool_choice: { type: "function", function: { name: "suggest_rpp_content" } },
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "Terlalu banyak permintaan." };
    if (res.status === 402) return { ok: false as const, error: "Kredit AI habis." };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false as const, error: `Gagal menghubungi AI (${res.status}): ${text}` };
    }

    const json = await res.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return { ok: false as const, error: "AI tidak mengembalikan hasil." };
    }

    try {
      const parsed = JSON.parse(toolCall.function.arguments) as { materi: string[]; tujuan: string[] };
      return { ok: true as const, materi: parsed.materi, tujuan: parsed.tujuan };
    } catch {
      return { ok: false as const, error: "Gagal mengurai hasil AI." };
    }
  });

export const suggestSoalContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestSoalInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) return { ok: false as const, error: "Sesi tidak valid." };

    const { url, apiKey, model, isEnabled } = await getAiRuntimeConfig();
    if (!isEnabled) {
      return { ok: false as const, error: "Layanan AI sedang dinonaktifkan oleh admin." };
    }
    if (!apiKey) return { ok: false as const, error: "AI Gateway belum dikonfigurasi." };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Anda adalah penulis soal ujian bermutu untuk guru Indonesia. Berikan rekomendasi topik pembelajaran yang relevan, konkret, dan siap dipakai sebagai dasar penyusunan tujuan pembelajaran.",
          },
          {
            role: "user",
            content: `Berikan rekomendasi untuk:\n- Mata Pelajaran: ${data.mataPelajaran}\n- Kelas: ${data.kelas}${data.fase ? ` (Fase ${data.fase})` : ""}${data.tipeSoal ? `\n- Taksonomi: ${data.tipeSoal}` : ""}\n\nBerikan 3-5 topik pembelajaran yang sesuai.`,
          },
        ],
        tools: [{ type: "function", function: SUGGEST_SOAL_SCHEMA }],
        tool_choice: { type: "function", function: { name: "suggest_soal_topik" } },
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "Terlalu banyak permintaan." };
    if (res.status === 402) return { ok: false as const, error: "Kredit AI habis." };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false as const, error: `Gagal menghubungi AI (${res.status}): ${text}` };
    }

    const json = await res.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return { ok: false as const, error: "AI tidak mengembalikan hasil." };
    }

    try {
      const parsed = JSON.parse(toolCall.function.arguments) as { topik: string[] };
      return { ok: true as const, topik: parsed.topik };
    } catch {
      return { ok: false as const, error: "Gagal mengurai hasil AI." };
    }
  });

export const suggestSoalTujuan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestSoalTujuanInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) return { ok: false as const, error: "Sesi tidak valid." };

    const { url, apiKey, model, isEnabled } = await getAiRuntimeConfig();
    if (!isEnabled) {
      return { ok: false as const, error: "Layanan AI sedang dinonaktifkan oleh admin." };
    }
    if (!apiKey) return { ok: false as const, error: "AI Gateway belum dikonfigurasi." };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Anda adalah penulis soal ujian bermutu untuk guru Indonesia. Berikan rekomendasi tujuan pembelajaran yang terukur, relevan, dan langsung sesuai topik yang diberikan.",
          },
          {
            role: "user",
            content: `Berikan rekomendasi untuk:\n- Mata Pelajaran: ${data.mataPelajaran}\n- Kelas: ${data.kelas}${data.fase ? ` (Fase ${data.fase})` : ""}\n- Topik Terpilih: ${data.topik}${data.tipeSoal ? `\n- Taksonomi: ${data.tipeSoal}` : ""}\n\nBerikan 3-5 tujuan pembelajaran yang terukur dan selaras langsung dengan topik tersebut.`,
          },
        ],
        tools: [{ type: "function", function: SUGGEST_SOAL_TUJUAN_SCHEMA }],
        tool_choice: { type: "function", function: { name: "suggest_soal_tujuan" } },
      }),
    });

    if (res.status === 429) return { ok: false as const, error: "Terlalu banyak permintaan." };
    if (res.status === 402) return { ok: false as const, error: "Kredit AI habis." };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false as const, error: `Gagal menghubungi AI (${res.status}): ${text}` };
    }

    const json = await res.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return { ok: false as const, error: "AI tidak mengembalikan hasil." };
    }

    try {
      const parsed = JSON.parse(toolCall.function.arguments) as { tujuan: string[] };
      return { ok: true as const, tujuan: parsed.tujuan };
    } catch {
      return { ok: false as const, error: "Gagal mengurai hasil AI." };
    }
  });

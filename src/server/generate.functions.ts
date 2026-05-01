import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

type AITool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

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
  mataPelajaran: z.string().min(1).max(80),
  kelas: z.string().min(1).max(40),
  materi: z.string().min(1).max(500),
  jumlahSoal: z.number().int().min(1).max(30),
  tipe: z.enum(["pg", "esai", "campuran"]),
  tingkat: z.enum(["mudah", "sedang", "sulit", "campuran"]),
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
        description: "Dimensi Profil Lulusan yang relevan, pilih dari: Keimanan dan Ketaqwaan Terhadap Tuhan YME, Kewargaan, Kreativitas, Kemandirian, Komunikasi, Kesehatan, Kolaborasi, Penalaran Kritis",
      },
      desainPembelajaran: {
        type: "object",
        properties: {
          capaianPembelajaran: { type: "string", description: "Capaian Pembelajaran sesuai Kurikulum Merdeka" },
          lintasDisiplinIlmu: { type: "array", items: { type: "string" }, description: "Integrasi lintas disiplin ilmu" },
          tujuanPembelajaran: { type: "array", items: { type: "string" }, description: "Tujuan pembelajaran yang terukur" },
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
                    nama: { type: "string", description: "Nama tahapan, misal: Memahami, Mengaplikasi, Merefleksi" },
                    label: { type: "string", description: "Label pendekatan, misal: Berkesadaran, Bermakna, Menggembirakan" },
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
          awal: { type: "string", description: "Asesmen awal (diagnostik)" },
          proses: { type: "string", description: "Asesmen proses (formatif)" },
          akhir: { type: "string", description: "Asesmen akhir (sumatif)" },
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
  description: "Membuat kumpulan soal latihan beserta kunci jawaban dan pembahasan.",
  parameters: {
    type: "object",
    properties: {
      judul: { type: "string" },
      mataPelajaran: { type: "string" },
      kelas: { type: "string" },
      materi: { type: "string" },
      soal: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nomor: { type: "number" },
            tipe: { type: "string", enum: ["pg", "esai"] },
            pertanyaan: { type: "string" },
            opsi: { type: "array", items: { type: "string" } },
            kunciJawaban: { type: "string" },
            pembahasan: { type: "string" },
            tingkat: { type: "string", enum: ["mudah", "sedang", "sulit"] },
          },
          required: ["nomor", "tipe", "pertanyaan", "kunciJawaban", "pembahasan", "tingkat"],
        },
      },
    },
    required: ["judul", "mataPelajaran", "kelas", "materi", "soal"],
    additionalProperties: false,
  },
};

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
        `Anda adalah perancang kurikulum berpengalaman di Indonesia. Buat Perencanaan Pelaksanaan Pembelajaran (RPP) yang sangat detail dan berkualitas sesuai Kurikulum Merdeka, dalam Bahasa Indonesia formal pendidikan.

Format RPP harus mengikuti struktur:
1. IDENTITAS - data lengkap penyusun, satuan pendidikan, mapel, kelas, semester, durasi, tahun pelajaran
2. IDENTIFIKASI - kesiapan peserta didik: karakteristik, minat bakat, latar belakang, kebutuhan belajar, materi pelajaran
3. DIMENSI PROFIL LULUSAN - pilih yang relevan dari 8 dimensi
4. DESAIN PEMBELAJARAN - capaian pembelajaran, lintas disiplin ilmu, tujuan pembelajaran terukur, praktik pedagogis (model & metode), kemitraan
5. LINGKUNGAN PEMBELAJARAN - ruang fisik, virtual, budaya belajar
6. PEMANFAATAN DIGITAL - alat digital yang digunakan
7. SARANA PRASARANA - daftar alat dan bahan
8. SUMBER BELAJAR - referensi pembelajaran
9. PENGALAMAN PEMBELAJARAN - kegiatan Awal (dengan durasi), Inti (dengan durasi dan tahapan: Memahami, Mengaplikasi, Merefleksi), Penutup. Setiap kegiatan harus konkret, detail langkah demi langkah, dan kontekstual.
10. ASESMEN - asesmen awal (diagnostik), proses (formatif), akhir (sumatif)

Buat langkah pembelajaran yang sangat detail dan konkret seperti contoh RPP profesional guru Indonesia.`,
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
        "Anda adalah penulis soal ujian bermutu untuk guru Indonesia. Soal harus jelas, jawaban benar, dan pembahasan singkat tetapi padat.",
      user: `Buat ${p.jumlahSoal} soal (${p.tipe === "campuran" ? "campuran PG dan esai" : p.tipe === "pg" ? "pilihan ganda 4 opsi A-D" : "esai"}) tingkat ${p.tingkat} untuk:
- Mata Pelajaran: ${p.mataPelajaran}
- Kelas: ${p.kelas}
- Materi: ${p.materi}
Setiap soal pilihan ganda WAJIB memiliki array opsi 4 buah dan kunci jawaban berupa huruf A/B/C/D.`,
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI Gateway belum dikonfigurasi." };
    }

    const { system, user, tool } = buildPrompt(data.type, data.payload);

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
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
      return { ok: false as const, error: "Gagal menghubungi AI. Coba lagi." };
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

export const suggestRppContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SuggestInput.parse(d))
  .handler(async ({ data }) => {
    const sess = await getCodeIdFromToken(data.token);
    if (!sess) return { ok: false as const, error: "Sesi tidak valid." };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI Gateway belum dikonfigurasi." };

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
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
    if (!res.ok) return { ok: false as const, error: "Gagal menghubungi AI." };

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

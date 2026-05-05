import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Footer,
  PageNumber,
  PageBreak,
} from "docx";

function H(text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3 = HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 200, after: 120 },
  });
}
function P(text: string) {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 80 } });
}
function PCenter(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 80 },
    alignment: AlignmentType.CENTER,
  });
}
function KV(key: string, val: string) {
  return new Paragraph({
    children: [new TextRun({ text: `${key}: `, bold: true }), new TextRun(val)],
    spacing: { after: 60 },
  });
}
function Bullet(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
    bullet: { level: 0 },
    spacing: { after: 60 },
  });
}

function cleanOptionLabel(option: string) {
  return option.replace(/^\s*[A-Ea-e][\.)\-:]\s*/, "").trim();
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

function getSoalSectionConfig(format: string) {
  switch (format) {
    case "pg":
      return { questionHeader: "I. Pilihlah salah satu jawaban yang paling tepat!", answerHeader: "I. Pilihan Ganda" };
    case "pgkompleks":
      return { questionHeader: "II. Pilihlah jawaban yang benar! (Jawaban bisa lebih dari satu)", answerHeader: "II. Pilihan Ganda Kompleks" };
    case "isianSingkat":
      return { questionHeader: "III. Isilah titik-titik di bawah ini dengan jawaban yang tepat!", answerHeader: "III. Isian Singkat" };
    case "uraian":
      return { questionHeader: "IV. Jawablah pertanyaan berikut dengan jelas dan lengkap!", answerHeader: "IV. Uraian" };
    default:
      return { questionHeader: "Bagian Tambahan", answerHeader: "Bagian Tambahan" };
  }
}

function getPetunjukList(c: any): string[] {
  if (Array.isArray(c.petunjukPengerjaan) && c.petunjukPengerjaan.length > 0) {
    return c.petunjukPengerjaan.filter(Boolean).map((x: unknown) => String(x).trim()).filter(Boolean);
  }
  if (typeof c.petunjukPengerjaan === "string" && c.petunjukPengerjaan.trim()) {
    return c.petunjukPengerjaan
      .split(/\n+/)
      .map((x: string) => x.trim())
      .filter(Boolean);
  }
  return [
    "Isikan identitas Anda dalam lembar jawaban dengan teliti dan benar",
    `Tersedia waktu ${c.waktu ?? "60 menit"} untuk mengerjakan paket soal ini`,
    "Periksalah naskah soal yang Anda terima",
    "Baca dan pahamilah dengan baik pernyataan atau soal sebelum Anda menjawab",
    "Periksalah pekerjaan Anda sebelum diserahkan kepada pengawas ujian",
  ];
}

function groupSoal(c: any): Array<{ format: string; items: any[] }> {
  const orderedFormats = ["pg", "pgkompleks", "isianSingkat", "uraian", "menjodohkan", "benarSalah"];
  const buckets = new Map<string, any[]>();
  (c.soal ?? []).forEach((s: any, index: number) => {
    const format = canonicalizeFormat(s.format ?? s.tipe);
    const key = format || "uraian";
    const next = { ...s, nomor: s.nomor ?? index + 1, format: key, tipe: key };
    buckets.set(key, [...(buckets.get(key) ?? []), next]);
  });

  const used = Array.from(buckets.keys());
  const sorted = [
    ...orderedFormats.filter((f) => used.includes(f)),
    ...used.filter((f) => !orderedFormats.includes(f)),
  ];
  return sorted.map((format) => ({ format, items: buckets.get(format) ?? [] }));
}

function getKisiKisiRows(c: any) {
  if (Array.isArray(c.kisiKisi) && c.kisiKisi.length > 0) return c.kisiKisi;
  if (Array.isArray(c.kisi_kisi) && c.kisi_kisi.length > 0) return c.kisi_kisi;
  if (!Array.isArray(c.soal) || c.soal.length === 0) return [];

  const tujuan = typeof c.tujuanPembelajaran === "string" && c.tujuanPembelajaran.trim()
    ? c.tujuanPembelajaran.trim()
    : `Peserta didik memahami materi ${c.topik ?? c.mataPelajaran ?? "pembelajaran"}`;
  const materi = c.topik ?? c.materi ?? c.mataPelajaran ?? "-";

  return c.soal.map((s: any, index: number) => ({
    nomor: index + 1,
    kompetensiDasar: tujuan,
    indikator: `Peserta didik dapat menjawab soal nomor ${s.nomor ?? index + 1} dengan benar sesuai materi yang diujikan.`,
    materi,
    tingkatKognitif: s.c_level ?? "C2",
    bentukSoal: s.format ?? s.tipe ?? "Soal",
    nomorSoal: String(s.nomor ?? index + 1),
  }));
}

function rppDoc(c: any): Paragraph[] {
  const p: Paragraph[] = [];
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "PERENCANAAN PELAKSANAAN PEMBELAJARAN", bold: true })],
  }));

  // Identitas
  const id = c.identitas ?? {};
  if (id.namaPenyusun) p.push(KV("Nama Penyusun", id.namaPenyusun));
  if (id.satuanPendidikan) p.push(KV("Satuan Pendidikan", id.satuanPendidikan));
  p.push(KV("Mata Pelajaran", id.mataPelajaran ?? "-"));
  p.push(KV("Kelas/Semester", `${id.kelas ?? "-"}${id.semester ? ` / ${id.semester}` : ""}`));
  if (id.fase) p.push(KV("Fase", id.fase));
  p.push(KV("Durasi", id.durasi ?? id.alokasiWaktu ?? "-"));
  if (id.tahunPelajaran) p.push(KV("Tahun Pelajaran", id.tahunPelajaran));

  // Identifikasi
  const idf = c.identifikasi;
  if (idf) {
    p.push(H("IDENTIFIKASI — Kesiapan Peserta Didik"));
    p.push(KV("Karakteristik", idf.karakteristik ?? "-"));
    p.push(KV("Minat & Bakat", idf.minatBakat ?? "-"));
    p.push(KV("Latar Belakang", idf.latarBelakang ?? "-"));
    p.push(KV("Kebutuhan Belajar", idf.kebutuhanBelajar ?? "-"));
    p.push(KV("Materi Pelajaran", idf.materiPelajaran ?? "-"));
  }

  // Dimensi Profil Lulusan
  if (c.dimensiProfilLulusan?.length) {
    p.push(H("DIMENSI PROFIL LULUSAN"));
    c.dimensiProfilLulusan.forEach((d: string) => p.push(Bullet(d)));
  }

  // Desain Pembelajaran
  const ds = c.desainPembelajaran;
  if (ds) {
    p.push(H("DESAIN PEMBELAJARAN"));
    p.push(KV("Capaian Pembelajaran", ds.capaianPembelajaran ?? "-"));
    if (ds.lintasDisiplinIlmu?.length) {
      p.push(H("Lintas Disiplin Ilmu", HeadingLevel.HEADING_3));
      ds.lintasDisiplinIlmu.forEach((t: string) => p.push(Bullet(t)));
    }
    p.push(H("Tujuan Pembelajaran", HeadingLevel.HEADING_3));
    (ds.tujuanPembelajaran ?? []).forEach((t: string) => p.push(Bullet(t)));
    p.push(H("Praktik Pedagogis", HeadingLevel.HEADING_3));
    p.push(KV("Model", ds.praktikPedagogis?.model ?? "-"));
    p.push(KV("Metode", ds.praktikPedagogis?.metode ?? "-"));
    if (ds.kemitraan) p.push(KV("Kemitraan", ds.kemitraan));
  }

  // Lingkungan Pembelajaran
  const lp = c.lingkunganPembelajaran;
  if (lp) {
    p.push(H("LINGKUNGAN PEMBELAJARAN"));
    p.push(KV("Ruang Fisik", lp.ruangFisik ?? "-"));
    p.push(KV("Ruang Virtual", lp.ruangVirtual ?? "-"));
    p.push(KV("Budaya Belajar", lp.budayaBelajar ?? "-"));
  }

  if (c.pemanfaatanDigital) {
    p.push(H("PEMANFAATAN DIGITAL"));
    p.push(P(c.pemanfaatanDigital));
  }
  if (c.saranaPrasarana?.length) {
    p.push(H("SARANA PRASARANA"));
    c.saranaPrasarana.forEach((t: string) => p.push(Bullet(t)));
  }
  if (c.sumberBelajar?.length) {
    p.push(H("SUMBER BELAJAR"));
    c.sumberBelajar.forEach((t: string) => p.push(Bullet(t)));
  }

  // Pengalaman Pembelajaran
  const pp = c.pengalamanPembelajaran;
  if (pp) {
    p.push(H("PENGALAMAN PEMBELAJARAN"));
    p.push(H(`Awal ${pp.awal?.durasi ? `(${pp.awal.durasi})` : ""}`, HeadingLevel.HEADING_3));
    (pp.awal?.kegiatan ?? []).forEach((t: string) => p.push(Bullet(t)));

    p.push(H(`Inti ${pp.inti?.durasi ? `(${pp.inti.durasi})` : ""}`, HeadingLevel.HEADING_3));
    if (pp.inti?.tahapan?.length) {
      pp.inti.tahapan.forEach((t: any) => {
        p.push(new Paragraph({
          children: [new TextRun({ text: `${t.nama}${t.label ? ` — ${t.label}` : ""}`, bold: true, italics: true })],
          spacing: { before: 120, after: 60 },
        }));
        (t.kegiatan ?? []).forEach((k: string) => p.push(Bullet(k)));
      });
    }

    p.push(H("Penutup", HeadingLevel.HEADING_3));
    (pp.penutup?.kegiatan ?? []).forEach((t: string) => p.push(Bullet(t)));
  }

  // Asesmen
  if (c.asesmen) {
    p.push(H("ASESMEN"));
    p.push(KV("Asesmen Awal", c.asesmen.awal ?? "-"));
    p.push(KV("Asesmen Proses", c.asesmen.proses ?? "-"));
    p.push(KV("Asesmen Akhir", c.asesmen.akhir ?? "-"));
  }

  // Backward compat old format
  if (!ds && c.tujuanPembelajaran) {
    p.push(H("Tujuan Pembelajaran"));
    (c.tujuanPembelajaran ?? []).forEach((t: string) => p.push(Bullet(t)));
  }
  if (!c.dimensiProfilLulusan?.length && c.profilPelajarPancasila?.length) {
    p.push(H("Profil Pelajar Pancasila"));
    c.profilPelajarPancasila.forEach((t: string) => p.push(Bullet(t)));
  }
  if (!ds && c.modelPembelajaran) {
    p.push(H("Model Pembelajaran"));
    p.push(P(c.modelPembelajaran));
  }
  if (!ds && c.mediaDanSumber?.length) {
    p.push(H("Media & Sumber"));
    c.mediaDanSumber.forEach((t: string) => p.push(Bullet(t)));
  }
  if (!pp && c.langkahPembelajaran) {
    p.push(H("Langkah Pembelajaran"));
    p.push(H("Pembukaan", HeadingLevel.HEADING_3));
    (c.langkahPembelajaran?.pembukaan ?? []).forEach((t: string) => p.push(Bullet(t)));
    p.push(H("Inti", HeadingLevel.HEADING_3));
    (c.langkahPembelajaran?.inti ?? []).forEach((t: string) => p.push(Bullet(t)));
    p.push(H("Penutup", HeadingLevel.HEADING_3));
    (c.langkahPembelajaran?.penutup ?? []).forEach((t: string) => p.push(Bullet(t)));
  }
  if (!c.asesmen && c.penilaian) {
    p.push(H("Penilaian"));
    p.push(KV("Sikap", c.penilaian?.sikap ?? "-"));
    p.push(KV("Pengetahuan", c.penilaian?.pengetahuan ?? "-"));
    p.push(KV("Keterampilan", c.penilaian?.keterampilan ?? "-"));
  }

  return p;
}

function soalDoc(c: any): Array<Paragraph | Table> {
  const p: Array<Paragraph | Table> = [];
  const kisiKisiRows = getKisiKisiRows(c);
  const grouped = groupSoal(c);
  const headerBaris1 = c.headerBaris1?.trim() || c.jenisUjian || "Sumatif Lingkup Materi";
  const headerBaris2 = c.headerBaris2?.trim() || `TAHUN PELAJARAN ${c.tahunPelajaran || "20.../20..."}`;
  const petunjuk = getPetunjukList(c);

  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: headerBaris1, bold: true, font: "Times New Roman", size: 28 })],
    spacing: { after: 40 },
  }));

  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: headerBaris2, bold: true, font: "Times New Roman", size: 28 })],
    spacing: { after: 120 },
  }));

  const metaRows = [
    ["Mata Pelajaran", c.mataPelajaran ?? "-"],
    ["Kelas/Semester", `${c.kelas ?? "-"}${c.semester ? `/${c.semester}` : ""}`],
    ["Waktu", c.waktu ?? "60 menit"],
    ["Hari, Tanggal", c.hariTanggalUjian ?? "………., ……………. 20.."],
  ];
  metaRows.forEach(([k, v]) => {
    p.push(new Paragraph({
      children: [
        new TextRun({ text: k.padEnd(18, " "), font: "Times New Roman", size: 24 }),
        new TextRun({ text: ` : ${v}`, font: "Times New Roman", size: 24 }),
      ],
      spacing: { after: 40 },
    }));
  });

  p.push(new Paragraph({
    border: {
      top: { color: "333333", size: 12, style: BorderStyle.SINGLE },
      bottom: { color: "333333", size: 12, style: BorderStyle.SINGLE },
    },
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text: "PETUNJUK PENGERJAAN", bold: true, font: "Times New Roman", size: 24 })],
  }));

  petunjuk.forEach((item, i) => {
    p.push(new Paragraph({
      children: [new TextRun({ text: `${i + 1}. ${item}`, font: "Times New Roman", size: 24 })],
      indent: { left: 240 },
      spacing: { after: 40 },
    }));
  });

  grouped.forEach((group) => {
    if (!group.items.length) return;
    const section = getSoalSectionConfig(group.format);
    p.push(new Paragraph({
      children: [new TextRun({ text: section.questionHeader, bold: true, font: "Times New Roman", size: 24 })],
      spacing: { before: 120, after: 60 },
    }));

    group.items.forEach((s: any) => {
      p.push(new Paragraph({
        children: [
          new TextRun({ text: `${s.nomor}. `, bold: true, font: "Times New Roman", size: 24 }),
          new TextRun({ text: String(s.pertanyaan ?? ""), font: "Times New Roman", size: 24 }),
        ],
        spacing: { after: 50 },
      }));

      if ((group.format === "pg" || group.format === "pgkompleks") && Array.isArray(s.opsi)) {
        s.opsi.forEach((opt: string, i: number) => {
          const letter = String.fromCharCode(65 + i);
          p.push(new Paragraph({
            children: [new TextRun({ text: `${letter}. ${cleanOptionLabel(opt)}`, font: "Times New Roman", size: 24 })],
            indent: { left: 720 },
            spacing: { after: 30 },
          }));
        });
      } else if (group.format === "menjodohkan" && Array.isArray(s.pasangan)) {
        s.pasangan.forEach((pair: any, i: number) => {
          p.push(new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${pair.kiri} → ${pair.kanan}`, font: "Times New Roman", size: 24 })],
            indent: { left: 720 },
            spacing: { after: 30 },
          }));
        });
      }

      if (s.ilustrasi) {
        const iluText = s.ilustrasi.trimStart().startsWith("<svg")
          ? "[Lihat ilustrasi pada pratinjau web]"
          : `[Ilustrasi: ${s.ilustrasi}]`;
        p.push(new Paragraph({
          children: [new TextRun({ text: iluText, italics: true, font: "Times New Roman", size: 22 })],
          indent: { left: 720 },
          spacing: { after: 40 },
        }));
      }
    });
  });

  p.push(new Paragraph({
    children: [new PageBreak()],
  }));

  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "KISI-KISI SOAL", bold: true, font: "Times New Roman", size: 28 })],
    spacing: { after: 80 },
  }));
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: `${headerBaris1} - ${c.mataPelajaran ?? "-"}`, bold: true, font: "Times New Roman", size: 24 })],
    spacing: { after: 80 },
  }));

  [
    ["Mata Pelajaran", c.mataPelajaran ?? "-"],
    ["Kelas/Semester", `${c.kelas ?? "-"}${c.semester ? `/${c.semester}` : ""}`],
    ["Topik", c.topik ?? "-"],
  ].forEach(([k, v]) => {
    p.push(new Paragraph({
      children: [
        new TextRun({ text: k.padEnd(18, " "), font: "Times New Roman", size: 24 }),
        new TextRun({ text: ` : ${v}`, font: "Times New Roman", size: 24 }),
      ],
      spacing: { after: 30 },
    }));
  });

  if (kisiKisiRows.length > 0) {
    const kisiTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 6, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: "No", alignment: AlignmentType.CENTER })],
              shading: { fill: "F0F0F0" },
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: "Tujuan Pembelajaran", alignment: AlignmentType.CENTER })],
              shading: { fill: "F0F0F0" },
            }),
            new TableCell({
              width: { size: 34, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: "Indikator Soal", alignment: AlignmentType.CENTER })],
              shading: { fill: "F0F0F0" },
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: "Bentuk Soal", alignment: AlignmentType.CENTER })],
              shading: { fill: "F0F0F0" },
            }),
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: "Level Kognitif", alignment: AlignmentType.CENTER })],
              shading: { fill: "F0F0F0" },
            }),
            new TableCell({
              width: { size: 8, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: "No. Soal", alignment: AlignmentType.CENTER })],
              shading: { fill: "F0F0F0" },
            }),
          ],
        }),
        ...kisiKisiRows.map((kisi: any, idx: number) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: String(kisi.nomor ?? idx + 1), alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph(kisi.kompetensiDasar ?? "-")] }),
            new TableCell({ children: [new Paragraph(kisi.indikator ?? "-")] }),
            new TableCell({ children: [new Paragraph({ text: kisi.bentukSoal ?? "-", alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: kisi.tingkatKognitif ?? "-", alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: kisi.nomorSoal ?? "-", alignment: AlignmentType.CENTER })] }),
          ],
        })),
      ],
    });
    p.push(kisiTable);
  } else {
    p.push(P("Kisi-kisi tidak tersedia."));
  }

  p.push(new Paragraph({
    children: [new PageBreak()],
  }));

  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "KUNCI JAWABAN", bold: true, font: "Times New Roman", size: 28 })],
    spacing: { after: 120 },
  }));

  grouped.forEach((group) => {
    if (!group.items.length) return;
    const section = getSoalSectionConfig(group.format);
    p.push(new Paragraph({
      children: [new TextRun({ text: section.answerHeader, bold: true, font: "Times New Roman", size: 24 })],
      spacing: { before: 80, after: 40 },
    }));

    group.items.forEach((s: any) => {
      p.push(new Paragraph({
        children: [new TextRun({ text: `${s.nomor}. ${String(s.kunciJawaban ?? "-")}`, font: "Times New Roman", size: 22 })],
        indent: { left: 320 },
        spacing: { after: 20 },
      }));

      if (group.format === "uraian") {
        if (s.rubrik) {
          p.push(new Paragraph({
            children: [new TextRun({ text: `Rubrik: ${String(s.rubrik)}`, italics: true, font: "Times New Roman", size: 21 })],
            indent: { left: 420 },
            spacing: { after: 20 },
          }));
        }
        if (s.pembahasan) {
          p.push(new Paragraph({
            children: [new TextRun({ text: `Pembahasan: ${String(s.pembahasan)}`, italics: true, font: "Times New Roman", size: 21 })],
            indent: { left: 420 },
            spacing: { after: 20 },
          }));
        }
      } else if (s.pembahasan) {
        p.push(new Paragraph({
          children: [new TextRun({ text: `Pembahasan: ${String(s.pembahasan)}`, font: "Times New Roman", size: 21 })],
          indent: { left: 420 },
          spacing: { after: 20 },
        }));
      }
    });
  });

  return p;
}

function rkpDoc(c: any): Paragraph[] {
  const p: Paragraph[] = [];
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "Rencana Kegiatan Pembelajaran (RKP) Harian", bold: true })],
  }));
  const id = c.identitas ?? {};
  p.push(H("Identitas"));
  p.push(P(`Tema: ${id.tema ?? "-"} / Sub-tema: ${id.subTema ?? "-"}`));
  p.push(P(`Usia: ${id.usia ?? "-"} tahun`));
  p.push(P(`Hari: ${id.hari ?? "-"}`));
  p.push(P(`Alokasi Waktu: ${id.alokasiWaktu ?? "-"}`));
  p.push(H("Tujuan Pembelajaran"));
  (c.tujuanPembelajaran ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Kegiatan"));
  p.push(H("Pembukaan", HeadingLevel.HEADING_3));
  (c.kegiatan?.pembukaan ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Inti", HeadingLevel.HEADING_3));
  (c.kegiatan?.inti ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Penutup", HeadingLevel.HEADING_3));
  (c.kegiatan?.penutup ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Alat & Bahan"));
  (c.alatBahan ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Penilaian"));
  (c.penilaian ?? []).forEach((t: string) => p.push(Bullet(t)));
  return p;
}

export async function buildDocxBlob(type: "rpp" | "soal" | "rkp", content: any): Promise<Blob> {
  const children = type === "rpp" ? rppDoc(content) : type === "soal" ? soalDoc(content) : rkpDoc(content);
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
          },
          paragraph: {
            spacing: { line: 336 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 620, right: 570, bottom: 620, left: 570 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Halaman ", size: 20, font: "Times New Roman" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 20, font: "Times New Roman" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

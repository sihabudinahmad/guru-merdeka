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

function soalDoc(c: any): Paragraph[] {
  const p: Paragraph[] = [];
  const kisiKisiRows = getKisiKisiRows(c);
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: c.judul ?? "Lembar Soal", bold: true })],
  }));
  
  // Informasi umum
  if (c.jenisUjian) p.push(P(`Jenis Ujian: ${c.jenisUjian}`));
  if (c.fase) p.push(P(`Fase: ${c.fase}`));
  p.push(P(`Mata Pelajaran: ${c.mataPelajaran ?? "-"}`));
  p.push(P(`Kelas: ${c.kelas ?? "-"}`));
  if (c.semester) p.push(P(`Semester: ${c.semester}`));
  if (c.waktu) p.push(P(`Waktu: ${c.waktu}`));
  if (c.topik) p.push(P(`Topik: ${c.topik}`));
  if (c.tujuanPembelajaran) p.push(P(`Tujuan Pembelajaran: ${c.tujuanPembelajaran}`));
  
  p.push(H("Soal"));
  (c.soal ?? []).forEach((s: any) => {
    p.push(new Paragraph({
      children: [new TextRun({ text: `${s.nomor}. ${s.pertanyaan}`, bold: true })],
      spacing: { before: 160, after: 60 },
    }));
    
    // Handle different formats
    if ((s.format === "pg" || s.tipe === "pg") && Array.isArray(s.opsi)) {
      s.opsi.forEach((opt: string, i: number) => {
        const letter = String.fromCharCode(65 + i);
        p.push(P(`${letter}. ${cleanOptionLabel(opt)}`));
      });
    } else if (s.format === "pgkompleks" && Array.isArray(s.opsi)) {
      s.opsi.forEach((opt: string, i: number) => {
        const letter = String.fromCharCode(65 + i);
        p.push(P(`${letter}. ${cleanOptionLabel(opt)}`));
      });
    } else if (s.format === "menjodohkan" && Array.isArray(s.pasangan)) {
      s.pasangan.forEach((pair: any, i: number) => {
        p.push(P(`${i + 1}. ${pair.kiri} → ${pair.kanan}`));
      });
    } else if (s.format === "benarSalah") {
      p.push(P("Benar / Salah"));
    }
    
    if (s.ilustrasi) {
      {
        const iluText = s.ilustrasi.trimStart().startsWith("<svg")
          ? "[Lihat ilustrasi pada pratinjau web]"
          : `[Ilustrasi: ${s.ilustrasi}]`;
        p.push(P(iluText));
      }
    }
  });
  
  // Page break before Kisi-kisi
  p.push(new Paragraph({
    children: [new PageBreak()],
  }));
  
  // Kisi-kisi Section
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "KISI-KISI SOAL", bold: true })],
    spacing: { before: 200, after: 200 },
  }));
  
  if (kisiKisiRows.length > 0) {
    // Create table for kisi-kisi
    const kisiRows: TableRow[] = [];
    
    // Header row
    kisiRows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: "No", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "Kompetensi Dasar", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "Indikator", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "Materi", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "Tingkat Kognitif", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "Bentuk Soal", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
        new TableCell({
          children: [new Paragraph({ text: "No. Soal", alignment: AlignmentType.CENTER })],
          shading: { fill: "E0E0E0" },
        }),
      ],
    }));
    
    // Data rows
    kisiKisiRows.forEach((kisi: any) => {
      kisiRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(kisi.nomor ?? "-"))] }),
          new TableCell({ children: [new Paragraph(kisi.kompetensiDasar ?? "-")] }),
          new TableCell({ children: [new Paragraph(kisi.indikator ?? "-")] }),
          new TableCell({ children: [new Paragraph(kisi.materi ?? "-")] }),
          new TableCell({ children: [new Paragraph(kisi.tingkatKognitif ?? "-")] }),
          new TableCell({ children: [new Paragraph(kisi.bentukSoal ?? "-")] }),
          new TableCell({ children: [new Paragraph(kisi.nomorSoal ?? "-")] }),
        ],
      }));
    });
    
    // Note: docx library requires tables to be in a separate section
    // We'll add table info as paragraphs for now
    p.push(H("Tabel Kisi-kisi"));
    kisiKisiRows.forEach((kisi: any, idx: number) => {
      p.push(new Paragraph({
        children: [new TextRun({ text: `${idx + 1}. `, bold: true })],
        spacing: { before: 100 },
      }));
      p.push(KV("Kompetensi Dasar", kisi.kompetensiDasar ?? "-"));
      p.push(KV("Indikator", kisi.indikator ?? "-"));
      p.push(KV("Materi", kisi.materi ?? "-"));
      p.push(KV("Tingkat Kognitif", kisi.tingkatKognitif ?? "-"));
      p.push(KV("Bentuk Soal", kisi.bentukSoal ?? "-"));
      p.push(KV("No. Soal", kisi.nomorSoal ?? "-"));
    });
  } else {
    p.push(P("Kisi-kisi tidak tersedia."));
  }
  
  // Page break before Kunci Jawaban
  p.push(new Paragraph({
    children: [new PageBreak()],
  }));
  
  // Kunci Jawaban & Pembahasan Section
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: "KUNCI JAWABAN & PEMBAHASAN", bold: true })],
    spacing: { before: 200, after: 200 },
  }));
  
  (c.soal ?? []).forEach((s: any) => {
    p.push(new Paragraph({
      children: [new TextRun({ text: `${s.nomor}. Kunci Jawaban: ${s.kunciJawaban}`, bold: true })],
      spacing: { before: 100, after: 40 },
    }));
    p.push(P(`Pembahasan: ${s.pembahasan ?? "-"}`));
    if (s.c_level) p.push(P(`Taksonomi: ${s.c_level}`));
    if (s.tingkat) p.push(P(`Tingkat: ${s.tingkat.toUpperCase()}`));
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
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
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

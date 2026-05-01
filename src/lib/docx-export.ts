import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
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
  p.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: c.judul ?? "Lembar Soal", bold: true })],
  }));
  p.push(P(`Mata Pelajaran: ${c.mataPelajaran ?? "-"}`));
  p.push(P(`Kelas: ${c.kelas ?? "-"}`));
  p.push(P(`Materi: ${c.materi ?? "-"}`));
  p.push(H("Soal"));
  (c.soal ?? []).forEach((s: any) => {
    p.push(new Paragraph({
      children: [new TextRun({ text: `${s.nomor}. ${s.pertanyaan}`, bold: true })],
      spacing: { before: 160, after: 60 },
    }));
    if (s.tipe === "pg" && Array.isArray(s.opsi)) {
      s.opsi.forEach((opt: string, i: number) => {
        const letter = String.fromCharCode(65 + i);
        p.push(P(`${letter}. ${opt}`));
      });
    }
  });
  p.push(H("Kunci Jawaban & Pembahasan"));
  (c.soal ?? []).forEach((s: any) => {
    p.push(new Paragraph({
      children: [new TextRun({ text: `${s.nomor}. ${s.kunciJawaban}`, bold: true })],
      spacing: { before: 100, after: 40 },
    }));
    p.push(P(`Pembahasan: ${s.pembahasan ?? "-"}`));
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

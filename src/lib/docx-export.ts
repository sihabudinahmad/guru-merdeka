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
    children: [new TextRun({ text: "Rencana Pelaksanaan Pembelajaran (RPP)", bold: true })],
  }));
  p.push(H("Identitas"));
  const id = c.identitas ?? {};
  p.push(P(`Mata Pelajaran: ${id.mataPelajaran ?? "-"}`));
  p.push(P(`Kelas: ${id.kelas ?? "-"}${id.fase ? ` (Fase ${id.fase})` : ""}`));
  p.push(P(`Alokasi Waktu: ${id.alokasiWaktu ?? "-"}`));
  p.push(P(`Materi Pokok: ${id.materiPokok ?? "-"}`));
  p.push(H("Tujuan Pembelajaran"));
  (c.tujuanPembelajaran ?? []).forEach((t: string) => p.push(Bullet(t)));
  if (c.profilPelajarPancasila?.length) {
    p.push(H("Profil Pelajar Pancasila"));
    c.profilPelajarPancasila.forEach((t: string) => p.push(Bullet(t)));
  }
  p.push(H("Model Pembelajaran"));
  p.push(P(c.modelPembelajaran ?? "-"));
  if (c.mediaDanSumber?.length) {
    p.push(H("Media & Sumber"));
    c.mediaDanSumber.forEach((t: string) => p.push(Bullet(t)));
  }
  p.push(H("Langkah Pembelajaran"));
  p.push(H("Pembukaan", HeadingLevel.HEADING_3));
  (c.langkahPembelajaran?.pembukaan ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Inti", HeadingLevel.HEADING_3));
  (c.langkahPembelajaran?.inti ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Penutup", HeadingLevel.HEADING_3));
  (c.langkahPembelajaran?.penutup ?? []).forEach((t: string) => p.push(Bullet(t)));
  p.push(H("Penilaian"));
  p.push(P(`Sikap: ${c.penilaian?.sikap ?? "-"}`));
  p.push(P(`Pengetahuan: ${c.penilaian?.pengetahuan ?? "-"}`));
  p.push(P(`Keterampilan: ${c.penilaian?.keterampilan ?? "-"}`));
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

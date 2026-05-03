import jsPDF from "jspdf";

type GenType = "rpp" | "soal" | "rkp";

class PdfWriter {
  doc: jsPDF;
  y: number;
  marginX = 36;
  marginTop = 34;
  marginBottom = 34;
  pageW: number;
  pageH: number;

  constructor() {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.pageW = this.doc.internal.pageSize.getWidth();
    this.pageH = this.doc.internal.pageSize.getHeight();
    this.y = this.marginTop;
  }

  ensure(h: number) {
    if (this.y + h > this.pageH - this.marginBottom) {
      this.doc.addPage();
      this.y = this.marginTop;
    }
  }

  title(text: string) {
    this.ensure(28);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    const w = this.pageW - this.marginX * 2;
    const lines = this.doc.splitTextToSize(text, w);
    lines.forEach((ln: string) => {
      this.doc.text(ln, this.pageW / 2, this.y, { align: "center" });
      this.y += 20;
    });
    this.y += 6;
  }

  titleCompact(text: string) {
    this.ensure(20);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(14);
    this.doc.text(text, this.pageW / 2, this.y, { align: "center" });
    this.y += 16;
  }

  h2(text: string) {
    this.ensure(22);
    this.y += 6;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.text(text.toUpperCase(), this.marginX, this.y);
    this.y += 6;
    this.doc.setDrawColor(180);
    this.doc.line(this.marginX, this.y, this.pageW - this.marginX, this.y);
    this.y += 12;
  }

  h3(text: string) {
    this.ensure(18);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.text(text, this.marginX, this.y);
    this.y += 14;
  }

  h3italic(text: string) {
    this.ensure(18);
    this.doc.setFont("helvetica", "bolditalic");
    this.doc.setFontSize(11);
    this.doc.text(text, this.marginX + 12, this.y);
    this.y += 14;
  }

  p(text: string) {
    if (!text) return;
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(12);
    const w = this.pageW - this.marginX * 2;
    const lines = this.doc.splitTextToSize(text, w);
    lines.forEach((ln: string) => {
      this.ensure(14);
      this.doc.text(ln, this.marginX, this.y);
      this.y += 14;
    });
    this.y += 2;
  }

  pCenter(text: string) {
    if (!text) return;
    this.doc.setFont("times", "normal");
    this.doc.setFontSize(12);
    const w = this.pageW - this.marginX * 2;
    const lines = this.doc.splitTextToSize(text, w);
    lines.forEach((ln: string) => {
      this.ensure(14);
      this.doc.text(ln, this.pageW / 2, this.y, { align: "center" });
      this.y += 14;
    });
    this.y += 2;
  }

  bullet(text: string) {
    if (!text) return;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(11);
    const indent = 18;
    const w = this.pageW - this.marginX * 2 - indent;
    const lines = this.doc.splitTextToSize(text, w);
    lines.forEach((ln: string, i: number) => {
      this.ensure(14);
      if (i === 0) this.doc.text("\u2022", this.marginX, this.y);
      this.doc.text(ln, this.marginX + indent, this.y);
      this.y += 14;
    });
    this.y += 2;
  }

  kv(key: string, val: string) {
    if (val == null) return;
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.ensure(14);
    const keyText = `${key}: `;
    const keyW = this.doc.getTextWidth(keyText);
    this.doc.text(keyText, this.marginX, this.y);
    this.doc.setFont("helvetica", "normal");
    const w = this.pageW - this.marginX * 2 - keyW;
    const lines = this.doc.splitTextToSize(String(val), w);
    lines.forEach((ln: string, i: number) => {
      if (i > 0) {
        this.ensure(14);
      }
      this.doc.text(ln, this.marginX + keyW, this.y);
      this.y += 14;
    });
    this.y += 2;
  }

  drawTopBottomRuleLabel(text: string) {
    this.ensure(30);
    this.doc.setDrawColor(51);
    this.doc.setLineWidth(1);
    this.doc.line(this.marginX, this.y - 10, this.pageW - this.marginX, this.y - 10);
    this.doc.line(this.marginX, this.y + 12, this.pageW - this.marginX, this.y + 12);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(12);
    this.doc.text(text, this.marginX, this.y + 4);
    this.y += 20;
  }

  addPageNumbers() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      this.doc.setPage(i);
      this.doc.setFont("times", "normal");
      this.doc.setFontSize(9);
      this.doc.text(`Halaman ${i}`, this.pageW / 2, this.pageH - 14, { align: "center" });
    }
  }

  drawKisiTable(headers: string[], rows: string[][]) {
    const colWidths = [24, 130, 180, 64, 56, 40];
    const startX = this.marginX;
    const fontSize = 10;
    const lineH = 11;

    const drawRow = (values: string[], bold = false, header = false) => {
      this.doc.setFont("times", bold ? "bold" : "normal");
      this.doc.setFontSize(fontSize);
      const rowLines = values.map((v, idx) => this.doc.splitTextToSize(String(v ?? "-"), colWidths[idx] - 6));
      const rowHeight = Math.max(...rowLines.map((l: string[]) => l.length), 1) * lineH + 4;
      this.ensure(rowHeight + 2);
      if (header) {
        this.doc.setFillColor(240, 240, 240);
      }
      let x = startX;
      for (let i = 0; i < values.length; i += 1) {
        if (header) this.doc.rect(x, this.y, colWidths[i], rowHeight, "F");
        this.doc.rect(x, this.y, colWidths[i], rowHeight);
        const lines = rowLines[i];
        lines.forEach((line: string, li: number) => {
          const tx = x + (i === 0 || i >= 3 ? colWidths[i] / 2 : 3);
          const ty = this.y + 11 + li * lineH;
          this.doc.text(line, tx, ty, { align: i === 0 || i >= 3 ? "center" : "left" });
        });
        x += colWidths[i];
      }
      this.y += rowHeight;
    };

    drawRow(headers, true, true);
    rows.forEach((r) => drawRow(r));
    this.y += 4;
  }

  blob() {
    this.addPageNumbers();
    return this.doc.output("blob");
  }
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

function rppPdf(c: any, w: PdfWriter) {
  w.title("PERENCANAAN PELAKSANAAN PEMBELAJARAN");

  // Identitas
  const id = c.identitas ?? {};
  if (id.namaPenyusun) w.kv("Nama Penyusun", id.namaPenyusun);
  if (id.satuanPendidikan) w.kv("Satuan Pendidikan", id.satuanPendidikan);
  w.kv("Mata Pelajaran", id.mataPelajaran ?? "-");
  w.kv("Kelas/Semester", `${id.kelas ?? "-"}${id.semester ? ` / ${id.semester}` : ""}`);
  if (id.fase) w.kv("Fase", id.fase);
  w.kv("Durasi", id.durasi ?? id.alokasiWaktu ?? "-");
  if (id.tahunPelajaran) w.kv("Tahun Pelajaran", id.tahunPelajaran);

  // Identifikasi
  const idf = c.identifikasi;
  if (idf) {
    w.h2("Identifikasi — Kesiapan Peserta Didik");
    w.kv("Karakteristik", idf.karakteristik ?? "-");
    w.kv("Minat & Bakat", idf.minatBakat ?? "-");
    w.kv("Latar Belakang", idf.latarBelakang ?? "-");
    w.kv("Kebutuhan Belajar", idf.kebutuhanBelajar ?? "-");
    w.kv("Materi Pelajaran", idf.materiPelajaran ?? "-");
  }

  // Dimensi Profil Lulusan
  if (c.dimensiProfilLulusan?.length) {
    w.h2("Dimensi Profil Lulusan");
    c.dimensiProfilLulusan.forEach((d: string) => w.bullet(d));
  }

  // Desain Pembelajaran
  const ds = c.desainPembelajaran;
  if (ds) {
    w.h2("Desain Pembelajaran");
    w.kv("Capaian Pembelajaran", ds.capaianPembelajaran ?? "-");
    if (ds.lintasDisiplinIlmu?.length) {
      w.h3("Lintas Disiplin Ilmu");
      ds.lintasDisiplinIlmu.forEach((t: string) => w.bullet(t));
    }
    w.h3("Tujuan Pembelajaran");
    (ds.tujuanPembelajaran ?? []).forEach((t: string) => w.bullet(t));
    w.h3("Praktik Pedagogis");
    w.kv("Model", ds.praktikPedagogis?.model ?? "-");
    w.kv("Metode", ds.praktikPedagogis?.metode ?? "-");
    if (ds.kemitraan) w.kv("Kemitraan", ds.kemitraan);
  }

  // Lingkungan Pembelajaran
  const lp = c.lingkunganPembelajaran;
  if (lp) {
    w.h2("Lingkungan Pembelajaran");
    w.kv("Ruang Fisik", lp.ruangFisik ?? "-");
    w.kv("Ruang Virtual", lp.ruangVirtual ?? "-");
    w.kv("Budaya Belajar", lp.budayaBelajar ?? "-");
  }

  if (c.pemanfaatanDigital) {
    w.h2("Pemanfaatan Digital");
    w.p(c.pemanfaatanDigital);
  }
  if (c.saranaPrasarana?.length) {
    w.h2("Sarana Prasarana");
    c.saranaPrasarana.forEach((t: string) => w.bullet(t));
  }
  if (c.sumberBelajar?.length) {
    w.h2("Sumber Belajar");
    c.sumberBelajar.forEach((t: string) => w.bullet(t));
  }

  // Pengalaman Pembelajaran
  const pp = c.pengalamanPembelajaran;
  if (pp) {
    w.h2("Pengalaman Pembelajaran");
    w.h3(`Awal ${pp.awal?.durasi ? `(${pp.awal.durasi})` : ""}`);
    (pp.awal?.kegiatan ?? []).forEach((t: string) => w.bullet(t));

    w.h3(`Inti ${pp.inti?.durasi ? `(${pp.inti.durasi})` : ""}`);
    if (pp.inti?.tahapan?.length) {
      pp.inti.tahapan.forEach((t: any) => {
        w.h3italic(`${t.nama}${t.label ? ` — ${t.label}` : ""}`);
        (t.kegiatan ?? []).forEach((k: string) => w.bullet(k));
      });
    }

    w.h3("Penutup");
    (pp.penutup?.kegiatan ?? []).forEach((t: string) => w.bullet(t));
  }

  // Asesmen
  if (c.asesmen) {
    w.h2("Asesmen");
    w.kv("Asesmen Awal", c.asesmen.awal ?? "-");
    w.kv("Asesmen Proses", c.asesmen.proses ?? "-");
    w.kv("Asesmen Akhir", c.asesmen.akhir ?? "-");
  }

  // Backward compat
  if (!ds && c.tujuanPembelajaran) {
    w.h2("Tujuan Pembelajaran");
    (c.tujuanPembelajaran ?? []).forEach((t: string) => w.bullet(t));
  }
  if (!c.dimensiProfilLulusan?.length && c.profilPelajarPancasila?.length) {
    w.h2("Profil Pelajar Pancasila");
    c.profilPelajarPancasila.forEach((t: string) => w.bullet(t));
  }
  if (!ds && c.modelPembelajaran) {
    w.h2("Model Pembelajaran");
    w.p(c.modelPembelajaran);
  }
  if (!ds && c.mediaDanSumber?.length) {
    w.h2("Media & Sumber");
    c.mediaDanSumber.forEach((t: string) => w.bullet(t));
  }
  if (!pp && c.langkahPembelajaran) {
    w.h2("Langkah Pembelajaran");
    w.h3("Pembukaan");
    (c.langkahPembelajaran?.pembukaan ?? []).forEach((t: string) => w.bullet(t));
    w.h3("Inti");
    (c.langkahPembelajaran?.inti ?? []).forEach((t: string) => w.bullet(t));
    w.h3("Penutup");
    (c.langkahPembelajaran?.penutup ?? []).forEach((t: string) => w.bullet(t));
  }
  if (!c.asesmen && c.penilaian) {
    w.h2("Penilaian");
    w.kv("Sikap", c.penilaian?.sikap ?? "-");
    w.kv("Pengetahuan", c.penilaian?.pengetahuan ?? "-");
    w.kv("Keterampilan", c.penilaian?.keterampilan ?? "-");
  }
}

function soalPdf(c: any, w: PdfWriter) {
  const kisiKisiRows = getKisiKisiRows(c);
  const grouped = groupSoal(c);
  const headerBaris1 = c.headerBaris1?.trim() || c.jenisUjian || "Sumatif Lingkup Materi";
  const headerBaris2 = c.headerBaris2?.trim() || `TAHUN PELAJARAN ${c.tahunPelajaran || "20.../20..."}`;
  const petunjuk = getPetunjukList(c);

  w.titleCompact(headerBaris1);
  w.titleCompact(headerBaris2);
  w.y += 2;
  w.p(`Mata Pelajaran      : ${c.mataPelajaran ?? "-"}`);
  w.p(`Kelas/Semester      : ${c.kelas ?? "-"}${c.semester ? `/${c.semester}` : ""}`);
  w.p(`Waktu               : ${c.waktu ?? "60 menit"}`);
  w.p(`Hari, Tanggal       : ${c.hariTanggalUjian ?? "………., ……………. 20.."}`);

  w.drawTopBottomRuleLabel("PETUNJUK PENGERJAAN");
  petunjuk.forEach((item, i) => w.p(`${i + 1}. ${item}`));

  grouped.forEach((group) => {
    if (!group.items.length) return;
    const section = getSoalSectionConfig(group.format);
    w.doc.setFont("times", "bold");
    w.doc.setFontSize(12);
    w.ensure(20);
    w.doc.text(section.questionHeader, w.marginX, w.y);
    w.y += 14;

    group.items.forEach((s: any) => {
      w.p(`${s.nomor}. ${String(s.pertanyaan ?? "")}`);
      if ((group.format === "pg" || group.format === "pgkompleks") && Array.isArray(s.opsi)) {
        s.opsi.forEach((opt: string) => w.p(`    ${cleanOptionLabel(opt)}`));
      } else if (group.format === "menjodohkan" && Array.isArray(s.pasangan)) {
        s.pasangan.forEach((pair: any, i: number) => w.p(`    ${i + 1}. ${pair.kiri} → ${pair.kanan}`));
      }
      if (s.ilustrasi) {
        const iluText = s.ilustrasi.trimStart().startsWith("<svg")
          ? "[Lihat ilustrasi pada pratinjau web]"
          : `[Ilustrasi: ${s.ilustrasi}]`;
        w.p(`    ${iluText}`);
      }
    });
  });

  // New page for Kisi-kisi
  w.doc.addPage();
  w.y = w.marginTop;
  w.titleCompact("KISI-KISI SOAL");
  w.titleCompact(`${headerBaris1} - ${c.mataPelajaran ?? "-"}`);
  w.p(`Mata Pelajaran      : ${c.mataPelajaran ?? "-"}`);
  w.p(`Kelas/Semester      : ${c.kelas ?? "-"}${c.semester ? `/${c.semester}` : ""}`);
  w.p(`Topik               : ${c.topik ?? "-"}`);
  
  if (kisiKisiRows.length > 0) {
    w.drawKisiTable(
      ["No", "Tujuan Pembelajaran", "Indikator Soal", "Bentuk Soal", "Level Kognitif", "No. Soal"],
      kisiKisiRows.map((kisi: any, idx: number) => [
        String(kisi.nomor ?? idx + 1),
        String(kisi.kompetensiDasar ?? "-"),
        String(kisi.indikator ?? "-"),
        String(kisi.bentukSoal ?? "-"),
        String(kisi.tingkatKognitif ?? "-"),
        String(kisi.nomorSoal ?? "-"),
      ]),
    );
  } else {
    w.p("Kisi-kisi tidak tersedia.");
  }

  // New page for Kunci Jawaban
  w.doc.addPage();
  w.y = w.marginTop;
  w.titleCompact("KUNCI JAWABAN");

  grouped.forEach((group) => {
    if (!group.items.length) return;
    const section = getSoalSectionConfig(group.format);
    w.doc.setFont("times", "bold");
    w.doc.setFontSize(12);
    w.ensure(16);
    w.doc.text(section.answerHeader, w.marginX, w.y);
    w.y += 13;

    group.items.forEach((s: any) => {
      w.p(`  ${s.nomor}. ${String(s.kunciJawaban ?? "-")}`);
      if (group.format === "uraian" && s.rubrik) w.p(`     Rubrik: ${String(s.rubrik)}`);
      if (s.pembahasan) w.p(`     Pembahasan: ${String(s.pembahasan)}`);
    });
  });
}

function rkpPdf(c: any, w: PdfWriter) {
  w.title("Rencana Kegiatan Pembelajaran (RKP) Harian");
  const id = c.identitas ?? {};
  w.h2("Identitas");
  w.kv("Tema", id.tema ?? "-");
  w.kv("Sub-tema", id.subTema ?? "-");
  w.kv("Usia", `${id.usia ?? "-"} tahun`);
  w.kv("Hari", id.hari ?? "-");
  w.kv("Alokasi Waktu", id.alokasiWaktu ?? "-");

  w.h2("Tujuan Pembelajaran");
  (c.tujuanPembelajaran ?? []).forEach((t: string) => w.bullet(t));

  w.h2("Kegiatan");
  w.h3("Pembukaan");
  (c.kegiatan?.pembukaan ?? []).forEach((t: string) => w.bullet(t));
  w.h3("Inti");
  (c.kegiatan?.inti ?? []).forEach((t: string) => w.bullet(t));
  w.h3("Penutup");
  (c.kegiatan?.penutup ?? []).forEach((t: string) => w.bullet(t));

  w.h2("Alat & Bahan");
  (c.alatBahan ?? []).forEach((t: string) => w.bullet(t));

  w.h2("Penilaian");
  (c.penilaian ?? []).forEach((t: string) => w.bullet(t));
}

export function buildPdfBlob(type: GenType, content: any): Blob {
  const w = new PdfWriter();
  if (type === "rpp") rppPdf(content, w);
  else if (type === "soal") soalPdf(content, w);
  else rkpPdf(content, w);
  return w.blob();
}

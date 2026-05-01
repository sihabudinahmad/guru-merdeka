import jsPDF from "jspdf";

type GenType = "rpp" | "soal" | "rkp";

class PdfWriter {
  doc: jsPDF;
  y: number;
  marginX = 56;
  marginTop = 64;
  marginBottom = 64;
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
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(11);
    const w = this.pageW - this.marginX * 2;
    const lines = this.doc.splitTextToSize(text, w);
    lines.forEach((ln: string) => {
      this.ensure(14);
      this.doc.text(ln, this.marginX, this.y);
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

  blob() {
    return this.doc.output("blob");
  }
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
  w.title(c.judul ?? "Lembar Soal");
  w.kv("Mata Pelajaran", c.mataPelajaran ?? "-");
  w.kv("Kelas", c.kelas ?? "-");
  w.kv("Materi", c.materi ?? "-");

  w.h2("Soal");
  (c.soal ?? []).forEach((s: any) => {
    w.p(`${s.nomor}. ${s.pertanyaan}`);
    if (s.tipe === "pg" && Array.isArray(s.opsi)) {
      s.opsi.forEach((opt: string, i: number) => {
        const letter = String.fromCharCode(65 + i);
        w.p(`   ${letter}. ${opt}`);
      });
    }
  });

  w.h2("Kunci Jawaban & Pembahasan");
  (c.soal ?? []).forEach((s: any) => {
    w.kv(`${s.nomor}. Jawaban`, String(s.kunciJawaban ?? "-"));
    w.kv("    Pembahasan", String(s.pembahasan ?? "-"));
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

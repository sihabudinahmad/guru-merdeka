import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  LineRuleType,
} from "docx";

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT_BODY = "Times New Roman";
const FONT_HEAD = "Times New Roman";
const SIZE_TITLE  = 28;  // 14pt
const SIZE_H2     = 24;  // 12pt
const SIZE_BODY   = 24;  // 12pt
const SIZE_SMALL  = 20;  // 10pt

// A4 in twips (1 inch = 1440 twips): 8268 × 11692 points → convert to twips
// Standard A4: width=11906, height=16838 twips
const A4_W = 11906;
const A4_H = 16838;
// Margins: top/bottom 2.5cm = ~1418, left/right 3cm = ~1701 twips (1cm = 567twips)
const MARGIN_TOP    = 1418; // 2.5cm
const MARGIN_BOTTOM = 1418;
const MARGIN_LEFT   = 1701; // 3cm
const MARGIN_RIGHT  = 1418; // 2.5cm

// Primary color: dark teal for headers
const COLOR_HEADER_BG  = "1A5276"; // dark blue
const COLOR_HEADER_TXT = "FFFFFF";
const COLOR_SUBHEAD_BG = "D6EAF8"; // light blue
const COLOR_SUBHEAD_TXT = "1A5276";
const COLOR_ACCENT      = "1A5276";
const COLOR_LINE        = "1A5276";

// ─── Helper: thin no-border cell ─────────────────────────────────────────────
const noBorder = {
  top:    { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left:   { style: BorderStyle.NONE, size: 0 },
  right:  { style: BorderStyle.NONE, size: 0 },
};

const thinBorder = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
  left:   { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
  right:  { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
};

// ─── Spacing helpers ──────────────────────────────────────────────────────────
function sp(before = 0, after = 0, line?: number) {
  return { before, after, ...(line ? { line, lineRule: LineRuleType.AUTO } : {}) };
}

// ─── Blank line ───────────────────────────────────────────────────────────────
function blank(height = 80): Paragraph {
  return new Paragraph({ spacing: sp(0, height) });
}

// ─── Section header (full-width colored box) ──────────────────────────────────
function sectionHeader(text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:            { style: BorderStyle.NONE, size: 0 },
      bottom:         { style: BorderStyle.NONE, size: 0 },
      left:           { style: BorderStyle.NONE, size: 0 },
      right:          { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical:   { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            shading: { type: ShadingType.SOLID, color: COLOR_HEADER_BG, fill: COLOR_HEADER_BG },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: text.toUpperCase(),
                    bold: true,
                    color: COLOR_HEADER_TXT,
                    size: SIZE_H2,
                    font: FONT_HEAD,
                  }),
                ],
                spacing: sp(0, 0),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ─── Sub-section label (light background) ────────────────────────────────────
function subHeader(text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:              { style: BorderStyle.NONE, size: 0 },
      bottom:           { style: BorderStyle.NONE, size: 0 },
      left:             { style: BorderStyle.NONE, size: 0 },
      right:            { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical:   { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            shading: { type: ShadingType.SOLID, color: COLOR_SUBHEAD_BG, fill: COLOR_SUBHEAD_BG },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    bold: true,
                    color: COLOR_SUBHEAD_TXT,
                    size: SIZE_BODY,
                    font: FONT_HEAD,
                  }),
                ],
                spacing: sp(0, 0),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ─── Key-Value row in a 2-col table ──────────────────────────────────────────
function kvRow(key: string, val: string): TableRow {
  const mkCell = (t: string, bold = false, shade?: string) =>
    new TableCell({
      borders: thinBorder,
      shading: shade
        ? { type: ShadingType.SOLID, color: shade, fill: shade }
        : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [new TextRun({ text: t, bold, size: SIZE_BODY, font: FONT_BODY })],
          spacing: sp(0, 0),
        }),
      ],
    });

  return new TableRow({
    children: [
      mkCell(key, true, "EAF4FB"),
      mkCell(val, false),
    ],
  });
}

// ─── Key-Value table ──────────────────────────────────────────────────────────
function kvTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3500, 6500],
    borders: {
      top:              { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      bottom:           { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      left:             { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      right:            { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
    },
    rows: rows.map(([k, v]) => kvRow(k, v)),
  });
}

// ─── Plain paragraph ─────────────────────────────────────────────────────────
function P(text: string, opts: { bold?: boolean; italic?: boolean; indent?: number; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        size: opts.size ?? SIZE_BODY,
        font: FONT_BODY,
      }),
    ],
    spacing: sp(0, 80),
    indent: opts.indent ? { left: opts.indent } : undefined,
  });
}

// ─── Bullet item ─────────────────────────────────────────────────────────────
function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: SIZE_BODY, font: FONT_BODY })],
    bullet: { level },
    spacing: sp(0, 60),
    indent: { left: 360 + level * 360, hanging: 360 },
  });
}

// ─── Document title block ─────────────────────────────────────────────────────
function titleBlock(line1: string, line2?: string): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  // Top decoration line
  items.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorder,
              shading: { type: ShadingType.SOLID, color: COLOR_HEADER_BG, fill: COLOR_HEADER_BG },
              margins: { top: 160, bottom: 160, left: 200, right: 200 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: line1,
                      bold: true,
                      color: COLOR_HEADER_TXT,
                      size: SIZE_TITLE,
                      font: FONT_HEAD,
                    }),
                  ],
                  spacing: sp(0, line2 ? 60 : 0),
                }),
                ...(line2
                  ? [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: line2,
                            bold: false,
                            color: "D6EAF8",
                            size: SIZE_H2,
                            font: FONT_HEAD,
                          }),
                        ],
                        spacing: sp(0, 0),
                      }),
                    ]
                  : []),
              ],
            }),
          ],
        }),
      ],
    })
  );
  items.push(blank(160));
  return items;
}

// ─── Tag badges (for dimensi profil, etc.) ────────────────────────────────────
function tagRow(items: string[]): Table {
  const cells = items.map(
    (tag) =>
      new TableCell({
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: "D6EAF8", fill: "D6EAF8" },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: tag, bold: true, color: COLOR_ACCENT, size: SIZE_SMALL, font: FONT_BODY }),
            ],
            spacing: sp(0, 0),
          }),
        ],
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:              { style: BorderStyle.NONE, size: 0 },
      bottom:           { style: BorderStyle.NONE, size: 0 },
      left:             { style: BorderStyle.NONE, size: 0 },
      right:            { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical:   { style: BorderStyle.NONE, size: 0 },
    },
    rows: [new TableRow({ children: cells })],
  });
}

// ─── Paragraph with left accent bar (styled note) ─────────────────────────────
function accentPara(text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:              { style: BorderStyle.NONE, size: 0 },
      bottom:           { style: BorderStyle.NONE, size: 0 },
      left:             { style: BorderStyle.NONE, size: 0 },
      right:            { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical:   { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          // accent stripe
          new TableCell({
            width: { size: 200, type: WidthType.DXA },
            borders: noBorder,
            shading: { type: ShadingType.SOLID, color: COLOR_HEADER_BG, fill: COLOR_HEADER_BG },
            children: [new Paragraph({ spacing: sp(0, 0) })],
          }),
          // content
          new TableCell({
            borders: noBorder,
            shading: { type: ShadingType.SOLID, color: "EAF4FB", fill: "EAF4FB" },
            margins: { top: 80, bottom: 80, left: 140, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text, size: SIZE_BODY, font: FONT_BODY })],
                spacing: sp(0, 0),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ─── Kegiatan sub-phase header (Awal / Inti / Penutup) ───────────────────────
function phaseHeader(name: string, durasi?: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `▸  ${name}`, bold: true, color: COLOR_ACCENT, size: SIZE_H2, font: FONT_HEAD }),
      ...(durasi ? [new TextRun({ text: `  (${durasi})`, color: "555555", size: SIZE_SMALL, font: FONT_BODY })] : []),
    ],
    spacing: sp(160, 60),
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "B3D4EE" } },
  });
}

// ─── Step item inside phase ───────────────────────────────────────────────────
function stepItem(text: string, idx: number): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${idx}.  `, bold: true, color: COLOR_ACCENT, size: SIZE_BODY, font: FONT_BODY }),
      new TextRun({ text, size: SIZE_BODY, font: FONT_BODY }),
    ],
    spacing: sp(0, 80),
    indent: { left: 400, hanging: 400 },
  });
}

// ─── Tahapan Inti header ──────────────────────────────────────────────────────
function tahapanHeader(nama: string, label?: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:              { style: BorderStyle.NONE, size: 0 },
      bottom:           { style: BorderStyle.NONE, size: 0 },
      left:             { style: BorderStyle.NONE, size: 0 },
      right:            { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical:   { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top:   { style: BorderStyle.NONE, size: 0 },
              bottom:{ style: BorderStyle.NONE, size: 0 },
              left:  { style: BorderStyle.SINGLE, size: 12, color: COLOR_HEADER_BG },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            shading: { type: ShadingType.SOLID, color: "EAF4FB", fill: "EAF4FB" },
            margins: { top: 80, bottom: 80, left: 140, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: nama, bold: true, italics: true, color: COLOR_ACCENT, size: SIZE_BODY, font: FONT_HEAD }),
                  ...(label ? [new TextRun({ text: `  —  ${label}`, italics: true, color: "555555", size: SIZE_BODY, font: FONT_BODY })] : []),
                ],
                spacing: sp(0, 0),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RPP Document Builder
// ═══════════════════════════════════════════════════════════════════════════════
function rppDoc(c: any): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];

  // ── Title block ──────────────────────────────────────────────────────────────
  items.push(...titleBlock(
    "RENCANA PELAKSANAAN PEMBELAJARAN (RPP)",
    "Kurikulum Merdeka"
  ));

  // ── Identitas ────────────────────────────────────────────────────────────────
  items.push(sectionHeader("A. Identitas Sekolah"));
  items.push(blank(80));

  const id = c.identitas ?? {};
  const identRows: [string, string][] = [];
  if (id.namaPenyusun)    identRows.push(["Nama Penyusun",      id.namaPenyusun]);
  if (id.satuanPendidikan) identRows.push(["Satuan Pendidikan",  id.satuanPendidikan]);
  identRows.push(["Mata Pelajaran", id.mataPelajaran ?? "-"]);
  identRows.push([
    "Kelas / Semester",
    `${id.kelas ?? "-"}${id.semester ? ` / ${id.semester}` : ""}`,
  ]);
  if (id.fase)            identRows.push(["Fase",               id.fase]);
  identRows.push(["Alokasi Waktu",    id.durasi ?? id.alokasiWaktu ?? "-"]);
  if (id.tahunPelajaran)  identRows.push(["Tahun Pelajaran",    id.tahunPelajaran]);

  items.push(kvTable(identRows));
  items.push(blank(160));

  // ── Identifikasi peserta didik ────────────────────────────────────────────────
  const idf = c.identifikasi;
  if (idf) {
    items.push(sectionHeader("B. Identifikasi — Kesiapan Peserta Didik"));
    items.push(blank(80));
    const idfRows: [string, string][] = [
      ["Karakteristik",    idf.karakteristik    ?? "-"],
      ["Minat & Bakat",    idf.minatBakat        ?? "-"],
      ["Latar Belakang",   idf.latarBelakang     ?? "-"],
      ["Kebutuhan Belajar",idf.kebutuhanBelajar  ?? "-"],
      ["Materi Pelajaran", idf.materiPelajaran   ?? "-"],
    ];
    items.push(kvTable(idfRows));
    items.push(blank(160));
  }

  // ── Dimensi Profil Lulusan ────────────────────────────────────────────────────
  if (c.dimensiProfilLulusan?.length) {
    items.push(sectionHeader("C. Dimensi Profil Lulusan"));
    items.push(blank(80));
    // Render tags in rows of up to 4
    const tags: string[] = c.dimensiProfilLulusan;
    const chunkSize = Math.min(4, tags.length);
    for (let i = 0; i < tags.length; i += chunkSize) {
      items.push(tagRow(tags.slice(i, i + chunkSize)));
    }
    items.push(blank(160));
  }

  // ── Desain Pembelajaran ───────────────────────────────────────────────────────
  const ds = c.desainPembelajaran;
  if (ds) {
    items.push(sectionHeader("D. Desain Pembelajaran"));
    items.push(blank(80));

    // Capaian pembelajaran
    items.push(subHeader("Capaian Pembelajaran"));
    items.push(blank(40));
    items.push(accentPara(ds.capaianPembelajaran ?? "-"));
    items.push(blank(120));

    // Lintas disiplin ilmu
    if (ds.lintasDisiplinIlmu?.length) {
      items.push(subHeader("Lintas Disiplin Ilmu"));
      items.push(blank(40));
      (ds.lintasDisiplinIlmu as string[]).forEach((t, i) => items.push(stepItem(t, i + 1)));
      items.push(blank(120));
    }

    // Tujuan Pembelajaran
    items.push(subHeader("Tujuan Pembelajaran"));
    items.push(blank(40));
    (ds.tujuanPembelajaran as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(120));

    // Praktik Pedagogis
    items.push(subHeader("Praktik Pedagogis"));
    items.push(blank(40));
    const ppRows: [string, string][] = [
      ["Model Pembelajaran", ds.praktikPedagogis?.model   ?? "-"],
      ["Metode Pembelajaran", ds.praktikPedagogis?.metode ?? "-"],
    ];
    if (ds.kemitraan) ppRows.push(["Kemitraan", ds.kemitraan]);
    items.push(kvTable(ppRows));
    items.push(blank(160));
  }

  // ── Lingkungan Pembelajaran ───────────────────────────────────────────────────
  const lp = c.lingkunganPembelajaran;
  if (lp) {
    items.push(sectionHeader("E. Lingkungan Pembelajaran"));
    items.push(blank(80));
    items.push(kvTable([
      ["Ruang Fisik",    lp.ruangFisik    ?? "-"],
      ["Ruang Virtual",  lp.ruangVirtual  ?? "-"],
      ["Budaya Belajar", lp.budayaBelajar ?? "-"],
    ]));
    items.push(blank(160));
  }

  // ── Pemanfaatan Digital / Sarana / Sumber ─────────────────────────────────────
  const hasDigital   = !!c.pemanfaatanDigital;
  const hasSarana    = c.saranaPrasarana?.length > 0;
  const hasSumber    = c.sumberBelajar?.length > 0;
  if (hasDigital || hasSarana || hasSumber) {
    const sec = lp ? "F" : "E";
    items.push(sectionHeader(`${sec}. Sarana, Sumber & Pemanfaatan Digital`));
    items.push(blank(80));

    if (hasDigital) {
      items.push(subHeader("Pemanfaatan Digital"));
      items.push(blank(40));
      items.push(accentPara(c.pemanfaatanDigital));
      items.push(blank(100));
    }
    if (hasSarana) {
      items.push(subHeader("Sarana dan Prasarana"));
      items.push(blank(40));
      (c.saranaPrasarana as string[]).forEach((t) => items.push(bullet(t)));
      items.push(blank(100));
    }
    if (hasSumber) {
      items.push(subHeader("Sumber Belajar"));
      items.push(blank(40));
      (c.sumberBelajar as string[]).forEach((t) => items.push(bullet(t)));
      items.push(blank(100));
    }
    items.push(blank(60));
  }

  // ── Pengalaman Pembelajaran ───────────────────────────────────────────────────
  const pp = c.pengalamanPembelajaran;
  if (pp) {
    // Determine section letter dynamically
    const secLetter = ds ? (lp ? "G" : "F") : (lp ? "F" : "E");
    items.push(sectionHeader(`${secLetter}. Pengalaman Pembelajaran`));
    items.push(blank(80));

    // Awal
    items.push(phaseHeader("Kegiatan Awal (Pendahuluan)", pp.awal?.durasi));
    (pp.awal?.kegiatan as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(120));

    // Inti
    items.push(phaseHeader("Kegiatan Inti", pp.inti?.durasi));
    if (pp.inti?.tahapan?.length) {
      (pp.inti.tahapan as any[]).forEach((t) => {
        items.push(blank(60));
        items.push(tahapanHeader(t.nama, t.label));
        items.push(blank(40));
        (t.kegiatan as string[] ?? []).forEach((k: string, i: number) => items.push(stepItem(k, i + 1)));
      });
    } else {
      (pp.inti?.kegiatan as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    }
    items.push(blank(120));

    // Penutup
    items.push(phaseHeader("Kegiatan Penutup"));
    (pp.penutup?.kegiatan as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(160));
  }

  // ── Asesmen ───────────────────────────────────────────────────────────────────
  if (c.asesmen) {
    items.push(sectionHeader("H. Asesmen"));
    items.push(blank(80));
    items.push(kvTable([
      ["Asesmen Awal (Diagnostik)",  c.asesmen.awal    ?? "-"],
      ["Asesmen Proses (Formatif)",  c.asesmen.proses  ?? "-"],
      ["Asesmen Akhir (Sumatif)",    c.asesmen.akhir   ?? "-"],
    ]));
    items.push(blank(160));
  }

  // ── Backward compat: old format ───────────────────────────────────────────────
  if (!ds && c.tujuanPembelajaran) {
    items.push(sectionHeader("Tujuan Pembelajaran"));
    items.push(blank(80));
    (c.tujuanPembelajaran as string[]).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(160));
  }
  if (!c.dimensiProfilLulusan?.length && c.profilPelajarPancasila?.length) {
    items.push(sectionHeader("Profil Pelajar Pancasila"));
    items.push(blank(80));
    (c.profilPelajarPancasila as string[]).forEach((t) => items.push(bullet(t)));
    items.push(blank(160));
  }
  if (!ds && c.modelPembelajaran) {
    items.push(sectionHeader("Model Pembelajaran"));
    items.push(blank(80));
    items.push(accentPara(c.modelPembelajaran));
    items.push(blank(160));
  }
  if (!ds && c.mediaDanSumber?.length) {
    items.push(sectionHeader("Media & Sumber"));
    items.push(blank(80));
    (c.mediaDanSumber as string[]).forEach((t) => items.push(bullet(t)));
    items.push(blank(160));
  }
  if (!pp && c.langkahPembelajaran) {
    items.push(sectionHeader("Langkah Pembelajaran"));
    items.push(blank(80));
    items.push(phaseHeader("Pembukaan"));
    (c.langkahPembelajaran?.pembukaan as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(80));
    items.push(phaseHeader("Inti"));
    (c.langkahPembelajaran?.inti as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(80));
    items.push(phaseHeader("Penutup"));
    (c.langkahPembelajaran?.penutup as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
    items.push(blank(160));
  }
  if (!c.asesmen && c.penilaian) {
    items.push(sectionHeader("Penilaian"));
    items.push(blank(80));
    items.push(kvTable([
      ["Sikap",          c.penilaian?.sikap        ?? "-"],
      ["Pengetahuan",    c.penilaian?.pengetahuan   ?? "-"],
      ["Keterampilan",   c.penilaian?.keterampilan  ?? "-"],
    ]));
    items.push(blank(160));
  }

  // ── Signature block ───────────────────────────────────────────────────────────
  items.push(blank(200));
  items.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:              { style: BorderStyle.NONE, size: 0 },
        bottom:           { style: BorderStyle.NONE, size: 0 },
        left:             { style: BorderStyle.NONE, size: 0 },
        right:            { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical:   { style: BorderStyle.NONE, size: 0 },
      },
      rows: [
        new TableRow({
          children: [
            // Mengetahui Kepala Sekolah
            new TableCell({
              borders: noBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Mengetahui,", size: SIZE_BODY, font: FONT_BODY })],
                  spacing: sp(0, 40),
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Kepala Sekolah", bold: true, size: SIZE_BODY, font: FONT_BODY })],
                  spacing: sp(0, 0),
                }),
                new Paragraph({ spacing: sp(1200, 0) }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 6, color: "333333" } },
                  children: [new TextRun({ text: "(__________________________)", size: SIZE_BODY, font: FONT_BODY })],
                  spacing: sp(40, 0),
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "NIP. ___________________", size: SIZE_SMALL, font: FONT_BODY })],
                  spacing: sp(0, 0),
                }),
              ],
            }),
            // Spacer
            new TableCell({
              borders: noBorder,
              width: { size: 1000, type: WidthType.DXA },
              children: [],
            }),
            // Guru Mata Pelajaran
            new TableCell({
              borders: noBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${id.satuanPendidikan ? id.satuanPendidikan + "," : ""}  _______________, ${new Date().getFullYear()}`,
                      size: SIZE_BODY,
                      font: FONT_BODY,
                    }),
                  ],
                  spacing: sp(0, 40),
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Guru Mata Pelajaran", bold: true, size: SIZE_BODY, font: FONT_BODY })],
                  spacing: sp(0, 0),
                }),
                new Paragraph({ spacing: sp(1200, 0) }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 6, color: "333333" } },
                  children: [
                    new TextRun({
                      text: id.namaPenyusun ? `(${id.namaPenyusun})` : "(__________________________)",
                      size: SIZE_BODY,
                      font: FONT_BODY,
                    }),
                  ],
                  spacing: sp(40, 0),
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "NIP. ___________________", size: SIZE_SMALL, font: FONT_BODY })],
                  spacing: sp(0, 0),
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Soal Document Builder
// ═══════════════════════════════════════════════════════════════════════════════
function soalDoc(c: any): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];

  items.push(...titleBlock(c.judul ?? "LEMBAR SOAL"));

  // Info header
  items.push(kvTable([
    ["Mata Pelajaran", c.mataPelajaran ?? "-"],
    ["Kelas",          c.kelas         ?? "-"],
    ["Materi",         c.materi        ?? "-"],
  ]));
  items.push(blank(160));

  // Soal
  items.push(sectionHeader("Soal"));
  items.push(blank(80));
  (c.soal ?? []).forEach((s: any) => {
    items.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${s.nomor}. `, bold: true, size: SIZE_BODY, font: FONT_BODY }),
          new TextRun({ text: s.pertanyaan, size: SIZE_BODY, font: FONT_BODY }),
        ],
        spacing: sp(140, 60),
      })
    );
    if (s.tipe === "pg" && Array.isArray(s.opsi)) {
      s.opsi.forEach((opt: string, i: number) => {
        const letter = String.fromCharCode(65 + i);
        items.push(
          new Paragraph({
            children: [new TextRun({ text: `${letter}.  ${opt}`, size: SIZE_BODY, font: FONT_BODY })],
            spacing: sp(0, 40),
            indent: { left: 360 },
          })
        );
      });
    }
    items.push(blank(60));
  });

  items.push(blank(160));

  // Kunci
  items.push(sectionHeader("Kunci Jawaban & Pembahasan"));
  items.push(blank(80));
  (c.soal ?? []).forEach((s: any) => {
    items.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${s.nomor}. `, bold: true, size: SIZE_BODY, font: FONT_BODY }),
          new TextRun({ text: `Jawaban: `, bold: true, color: COLOR_ACCENT, size: SIZE_BODY, font: FONT_BODY }),
          new TextRun({ text: s.kunciJawaban, size: SIZE_BODY, font: FONT_BODY }),
        ],
        spacing: sp(120, 40),
      })
    );
    items.push(P(`Pembahasan: ${s.pembahasan ?? "-"}`, { indent: 360 }));
    items.push(blank(40));
  });

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RKP Document Builder
// ═══════════════════════════════════════════════════════════════════════════════
function rkpDoc(c: any): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];

  items.push(...titleBlock(
    "RENCANA KEGIATAN PEMBELAJARAN (RKP) HARIAN",
    "Pendidikan Anak Usia Dini (PAUD)"
  ));

  const id = c.identitas ?? {};

  // Identitas
  items.push(sectionHeader("A. Identitas"));
  items.push(blank(80));
  items.push(kvTable([
    ["Tema",          id.tema       ?? "-"],
    ["Sub-Tema",      id.subTema    ?? "-"],
    ["Usia",          id.usia ? `${id.usia} tahun` : "-"],
    ["Hari",          id.hari       ?? "-"],
    ["Alokasi Waktu", id.alokasiWaktu ?? "-"],
  ]));
  items.push(blank(160));

  // Tujuan
  items.push(sectionHeader("B. Tujuan Pembelajaran"));
  items.push(blank(80));
  (c.tujuanPembelajaran as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
  items.push(blank(160));

  // Kegiatan
  items.push(sectionHeader("C. Kegiatan Pembelajaran"));
  items.push(blank(80));
  items.push(phaseHeader("Kegiatan Pembukaan"));
  (c.kegiatan?.pembukaan as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
  items.push(blank(100));
  items.push(phaseHeader("Kegiatan Inti"));
  (c.kegiatan?.inti as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
  items.push(blank(100));
  items.push(phaseHeader("Kegiatan Penutup"));
  (c.kegiatan?.penutup as string[] ?? []).forEach((t, i) => items.push(stepItem(t, i + 1)));
  items.push(blank(160));

  // Alat & Bahan
  items.push(sectionHeader("D. Alat dan Bahan"));
  items.push(blank(80));
  (c.alatBahan as string[] ?? []).forEach((t) => items.push(bullet(t)));
  items.push(blank(160));

  // Penilaian
  items.push(sectionHeader("E. Penilaian"));
  items.push(blank(80));
  (c.penilaian as string[] ?? []).forEach((t) => items.push(bullet(t)));
  items.push(blank(160));

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Header & Footer builders
// ═══════════════════════════════════════════════════════════════════════════════
function makeHeader(title: string): Header {
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top:              { style: BorderStyle.NONE, size: 0 },
          bottom:           { style: BorderStyle.SINGLE, size: 6, color: COLOR_LINE },
          left:             { style: BorderStyle.NONE, size: 0 },
          right:            { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical:   { style: BorderStyle.NONE, size: 0 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noBorder,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: title, bold: true, color: COLOR_ACCENT, size: SIZE_SMALL, font: FONT_HEAD }),
                    ],
                    spacing: sp(0, 60),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function makeFooter(): Footer {
  return new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top:              { style: BorderStyle.SINGLE, size: 6, color: COLOR_LINE },
          bottom:           { style: BorderStyle.NONE, size: 0 },
          left:             { style: BorderStyle.NONE, size: 0 },
          right:            { style: BorderStyle.NONE, size: 0 },
          insideHorizontal: { style: BorderStyle.NONE, size: 0 },
          insideVertical:   { style: BorderStyle.NONE, size: 0 },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noBorder,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "Dokumen ini dibuat secara otomatis", color: "888888", size: SIZE_SMALL - 2, font: FONT_BODY }),
                    ],
                    spacing: sp(60, 0),
                  }),
                ],
              }),
              new TableCell({
                borders: noBorder,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({ text: "Halaman ", color: "888888", size: SIZE_SMALL - 2, font: FONT_BODY }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        color: "888888",
                        size: SIZE_SMALL - 2,
                        font: FONT_BODY,
                      }),
                      new TextRun({ text: " dari ", color: "888888", size: SIZE_SMALL - 2, font: FONT_BODY }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        color: "888888",
                        size: SIZE_SMALL - 2,
                        font: FONT_BODY,
                      }),
                    ],
                    spacing: sp(60, 0),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════
export async function buildDocxBlob(type: "rpp" | "soal" | "rkp", content: any): Promise<Blob> {
  const headerTitles: Record<string, string> = {
    rpp:  "Rencana Pelaksanaan Pembelajaran (RPP) — Kurikulum Merdeka",
    soal: content?.judul ?? "Lembar Soal",
    rkp:  "Rencana Kegiatan Pembelajaran (RKP) Harian",
  };

  const children =
    type === "rpp"  ? rppDoc(content)  :
    type === "soal" ? soalDoc(content) :
    rkpDoc(content);

  const doc = new Document({
    numbering: {
      config: [],
    },
    sections: [
      {
        properties: {
          page: {
            size:   { width: A4_W,        height: A4_H },
            margin: { top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT },
          },
        },
        headers: {
          default: makeHeader(headerTitles[type]),
        },
        footers: {
          default: makeFooter(),
        },
        children: children as Paragraph[],
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: SIZE_BODY },
        },
      },
    },
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

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { ResultPanel, useGenerator } from "@/components/generator-shared";
import { suggestSoalContent, suggestSoalTujuan } from "@/functions/generate.functions";
import { getSession } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/app/soal")({
  component: SoalPage,
});

// Constants
const JENIS_UJIAN = [
  "Ujian Sekolah",
  "Asesmen Sumatif Akhir Bab",
  "Asesmen Sumatif Tengah Semester",
  "Asesmen Sumatif Akhir Semester",
];

const FASE = [
  { label: "Fase A (Kelas 1-2)", value: "A" },
  { label: "Fase B (Kelas 3-4)", value: "B" },
  { label: "Fase C (Kelas 5-6)", value: "C" },
  { label: "Fase D (Kelas 7-9)", value: "D" },
  { label: "Fase E (Kelas 10)", value: "E" },
  { label: "Fase F (Kelas 11-12)", value: "F" },
];

const MATA_PELAJARAN_BY_FASE: Record<string, string[]> = {
  A: ["Bahasa Indonesia", "Matematika", "IPAS", "Pendidikan Agama", "Pendidikan Pancasila", "Pendidikan Jasmani", "Seni"],
  B: ["Bahasa Indonesia", "Matematika", "IPAS", "Bahasa Inggris", "Pendidikan Agama", "Pendidikan Pancasila", "Pendidikan Jasmani", "Seni"],
  C: ["Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "Pendidikan Agama", "Pendidikan Pancasila", "Pendidikan Jasmani", "Seni"],
  D: ["Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "Pendidikan Agama", "Pendidikan Pancasila", "Pendidikan Jasmani", "Seni", "TIK"],
  E: ["Bahasa Indonesia", "Matematika", "Fisika", "Kimia", "Biologi", "Sejarah", "Geografi", "Ekonomi", "Sosiologi", "Bahasa Inggris", "Pendidikan Agama", "Pendidikan Pancasila", "Pendidikan Jasmani", "Seni"],
  F: ["Bahasa Indonesia", "Matematika", "Fisika", "Kimia", "Biologi", "Sejarah", "Geografi", "Ekonomi", "Sosiologi", "Bahasa Inggris", "Pendidikan Agama", "Pendidikan Pancasila", "Pendidikan Jasmani", "Seni"],
};

const WAKTU = ["60 menit", "90 menit", "120 menit", "Lainnya"];

const SEMESTER = ["Semester 1", "Semester 2"];

const TIPE_SOAL = [
  "C1 Mengingat",
  "C2 Memahami",
  "C3 Mengaplikasikan",
  "C4 Menganalisis",
  "C5 Mengevaluasi",
  "C6 Mencipta",
];

const FORMAT_SOAL = [
  { label: "Pilihan Ganda", value: "pg" },
  { label: "Pilihan Ganda Kompleks", value: "pgkompleks" },
  { label: "Menjodohkan", value: "menjodohkan" },
  { label: "Benar/Salah", value: "benarSalah" },
  { label: "Isisan Singkat", value: "isianSingkat" },
  { label: "Uraian", value: "uraian" },
  { label: "Campuran", value: "campuran" },
];

const PILIHAN_JAWABAN_PG = [
  { label: "3 Opsi (A-C)", value: 3 },
  { label: "4 Opsi (A-D)", value: 4 },
  { label: "5 Opsi (A-E)", value: 5 },
];

const TINGKAT_KESULITAN = [
  { label: "HOTS (Higher Order Thinking Skills)", value: "hots" },
  { label: "LOTS (Lower Order Thinking Skills)", value: "lots" },
  { label: "Campuran", value: "campuran" },
];

const MANUAL_SUBJECT_VALUE = "__manual__";
const MANUAL_WAKTU_VALUE = "Lainnya";

function parseTipeSoal(value: string): string[] {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function SoalPage() {
  const { loading, result, run } = useGenerator();
  const [form, setForm] = useState({
    jenisUjian: "",
    headerBaris1: "",
    headerBaris2: "",
    tahunPelajaran: "",
    hariTanggalUjian: "",
    fase: "",
    kelas: "",
    mataPelajaran: "",
    mataPelajaranManual: "",
    semester: "",
    waktu: "60 menit",
    waktuManual: "",
    topik: "",
    tujuanPembelajaran: "",
    sumberReferensi: "",
    jumlahSoal: 10,
    tipeSoal: "C1 Mengingat",
    formatSoal: "pg" as "pg" | "pgkompleks" | "menjodohkan" | "benarSalah" | "isianSingkat" | "uraian" | "campuran",
    jumlahPilihanPg: 4 as 3 | 4 | 5,
    tingkat: "campuran" as "hots" | "lots" | "campuran",
    tambahkanIlustrasi: false,
    petunjukPengerjaan: [
      "Isikan identitas Anda dalam lembar jawaban dengan teliti dan benar",
      "Tersedia waktu 60 menit untuk mengerjakan paket soal ini",
      "Periksalah naskah soal yang Anda terima",
      "Baca dan pahamilah dengan baik pernyataan atau soal sebelum Anda menjawab",
      "Periksalah pekerjaan Anda sebelum diserahkan kepada pengawas ujian",
    ].join("\n"),
  });

  const [suggestingTopik, setSuggestingTopik] = useState(false);
  const [suggestingTujuan, setSuggestingTujuan] = useState(false);
  const [topikSuggestions, setTopikSuggestions] = useState<string[]>([]);
  const [tujuanSuggestions, setTujuanSuggestions] = useState<string[]>([]);

  const isManualSubject = form.mataPelajaran === MANUAL_SUBJECT_VALUE;
  const isManualWaktu = form.waktu === MANUAL_WAKTU_VALUE;
  const effectiveMataPelajaran = isManualSubject
    ? form.mataPelajaranManual.trim()
    : form.mataPelajaran;
  const effectiveWaktu = isManualWaktu ? form.waktuManual.trim() : form.waktu;

  const canSuggestTopik = Boolean(effectiveMataPelajaran && form.kelas.trim());
  const canSuggestTujuan = Boolean(canSuggestTopik && form.topik.trim());

  const handleSuggestTopik = async () => {
    const sess = getSession();
    if (!sess) return;
    setSuggestingTopik(true);
    setTopikSuggestions([]);
    try {
      const res = await suggestSoalContent({
        data: {
          token: sess.token,
          mataPelajaran: effectiveMataPelajaran,
          kelas: form.kelas,
          fase: form.fase,
          tipeSoal: form.tipeSoal,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTopikSuggestions(res.topik);
      toast.success("Rekomendasi topik siap! Klik untuk memilih.");
    } catch {
      toast.error("Gagal mendapatkan rekomendasi topik.");
    } finally {
      setSuggestingTopik(false);
    }
  };

  const handleSuggestTujuan = async () => {
    const sess = getSession();
    if (!sess) return;
    const topikTerpilih = form.topik.trim();
    if (!topikTerpilih) {
      toast.error("Pilih/isi topik pembelajaran terlebih dahulu.");
      return;
    }

    setSuggestingTujuan(true);
    setTujuanSuggestions([]);
    try {
      const res = await suggestSoalTujuan({
        data: {
          token: sess.token,
          mataPelajaran: effectiveMataPelajaran,
          kelas: form.kelas,
          fase: form.fase,
          tipeSoal: form.tipeSoal,
          topik: topikTerpilih,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTujuanSuggestions(res.tujuan);
      toast.success("Rekomendasi tujuan siap! Klik untuk memilih.");
    } catch {
      toast.error("Gagal mendapatkan rekomendasi tujuan.");
    } finally {
      setSuggestingTujuan(false);
    }
  };

  const mataPelajaranOptions = form.fase
    ? [...(MATA_PELAJARAN_BY_FASE[form.fase] || []), "Lainnya (manual)"]
    : [];
  const selectedTipeSoal = parseTipeSoal(form.tipeSoal);

  const toggleTipeSoal = (item: string) => {
    setForm((f) => {
      const selected = parseTipeSoal(f.tipeSoal);
      const exists = selected.includes(item);
      const next = exists ? selected.filter((x) => x !== item) : [...selected, item];
      return { ...f, tipeSoal: next.join("\n") };
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kelas || !effectiveMataPelajaran || !effectiveWaktu || !form.formatSoal) return;
    const defaultHeaderBaris1 = form.jenisUjian || "Sumatif Lingkup Materi";
    const defaultHeaderBaris2 = `TAHUN PELAJARAN ${form.tahunPelajaran || "20.../20..."}`;
    run("soal", {
      ...form,
      mataPelajaran: effectiveMataPelajaran,
      waktu: effectiveWaktu,
      headerBaris1: form.headerBaris1.trim() || defaultHeaderBaris1,
      headerBaris2: form.headerBaris2.trim() || defaultHeaderBaris2,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Generator Soal</h1>
        <p className="text-sm text-muted-foreground">
          Buat soal berkualitas dengan berbagai format, tingkat kesulitan, dan taksonomi Bloom.
        </p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-12">
        <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2 xl:col-span-5">
          {/* Row 1: Jenis Ujian & Fase */}
          <Field label="Jenis Ujian">
            <Select value={form.jenisUjian} onValueChange={(v) => setForm({ ...form, jenisUjian: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis ujian" /></SelectTrigger>
              <SelectContent>
                {JENIS_UJIAN.map((jenis) => (
                  <SelectItem key={jenis} value={jenis}>{jenis}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fase *">
            <Select value={form.fase} onValueChange={(v) => setForm({ ...form, fase: v, mataPelajaran: "", mataPelajaranManual: "" })}>
              <SelectTrigger><SelectValue placeholder="Pilih fase" /></SelectTrigger>
              <SelectContent>
                {FASE.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Row 2: Kelas & Mata Pelajaran */}
          <Field label="Kelas *">
            <Input
              value={form.kelas}
              onChange={(e) => setForm({ ...form, kelas: e.target.value })}
              placeholder="Contoh: 5A, VIII, Kelas 10"
            />
          </Field>
          <Field label="Mata Pelajaran *">
            <Select value={form.mataPelajaran} onValueChange={(v) => setForm({ ...form, mataPelajaran: v, mataPelajaranManual: v === MANUAL_SUBJECT_VALUE ? form.mataPelajaranManual : "" })}>
              <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
              <SelectContent>
                {mataPelajaranOptions.map((mp) => (
                  <SelectItem key={mp} value={mp === "Lainnya (manual)" ? MANUAL_SUBJECT_VALUE : mp}>{mp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Row 3: Semester */}
          <Field label="Semester">
            <Select value={form.semester} onValueChange={(v) => setForm({ ...form, semester: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEMESTER.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tahun Pelajaran">
            <Input
              value={form.tahunPelajaran}
              onChange={(e) => setForm({ ...form, tahunPelajaran: e.target.value })}
              placeholder="Contoh: 2025/2026"
            />
          </Field>

          <Field label="Hari, Tanggal Ujian" className="sm:col-span-2">
            <Input
              value={form.hariTanggalUjian}
              onChange={(e) => setForm({ ...form, hariTanggalUjian: e.target.value })}
              placeholder="Contoh: Senin, 12 Mei 2026"
            />
          </Field>

          <Field label="Header Baris 1 (Opsional)" className="sm:col-span-2">
            <Input
              value={form.headerBaris1}
              onChange={(e) => setForm({ ...form, headerBaris1: e.target.value })}
              placeholder="Default: Jenis Ujian / Sumatif Lingkup Materi"
            />
          </Field>

          <Field label="Header Baris 2 (Opsional)" className="sm:col-span-2">
            <Input
              value={form.headerBaris2}
              onChange={(e) => setForm({ ...form, headerBaris2: e.target.value })}
              placeholder="Default: TAHUN PELAJARAN ..."
            />
          </Field>

          {/* Row 4: Mata Pelajaran (Manual) */}
          {isManualSubject && (
            <Field label="Mata Pelajaran (Manual) *" className="sm:col-span-2">
              <Input
                value={form.mataPelajaranManual}
                onChange={(e) => setForm({ ...form, mataPelajaranManual: e.target.value })}
                placeholder="Contoh: Informatika, Bahasa Jepang, dll"
              />
            </Field>
          )}

          {/* Row 5: Waktu & Jumlah Soal */}
          <Field label="Waktu Pengerjaan">
            <Select
              value={form.waktu}
              onValueChange={(v) => setForm({
                ...form,
                waktu: v,
                waktuManual: v === MANUAL_WAKTU_VALUE ? form.waktuManual : "",
              })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WAKTU.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isManualWaktu && (
            <Field label="Waktu Pengerjaan (Manual) *" className="sm:col-span-2">
              <Input
                value={form.waktuManual}
                onChange={(e) => setForm({ ...form, waktuManual: e.target.value })}
                placeholder="Contoh: 75 menit"
              />
            </Field>
          )}
          <Field label="Jumlah Soal">
            <Input
              type="number"
              min={1}
              max={50}
              value={form.jumlahSoal}
              onChange={(e) => setForm({ ...form, jumlahSoal: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
            />
          </Field>

          {/* Row 6: Topik Pembelajaran */}
          <Field label="Topik Pembelajaran" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.topik}
              onChange={(e) => {
                setForm({ ...form, topik: e.target.value });
                setTujuanSuggestions([]);
              }}
              placeholder="Contoh: Sistem Pencernaan Manusia, Photosynthesis, dll"
            />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canSuggestTopik || suggestingTopik}
                onClick={handleSuggestTopik}
                className="gap-1.5"
              >
                {suggestingTopik ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                {suggestingTopik ? "Memuat topik…" : "Rekomendasikan Topik"}
              </Button>
              {!canSuggestTopik && (
                <p className="mt-1 text-xs text-muted-foreground">Isi Mata Pelajaran dan Kelas terlebih dahulu.</p>
              )}
            </div>
            {topikSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topikSuggestions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTujuanSuggestions([]);
                      setForm((f) => ({
                        ...f,
                        topik: f.topik ? `${f.topik}\n${item}` : item,
                      }));
                    }}
                    className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 transition-colors text-left"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Row 7: Tujuan Pembelajaran */}
          <Field label="Tujuan Pembelajaran" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.tujuanPembelajaran}
              onChange={(e) => setForm({ ...form, tujuanPembelajaran: e.target.value })}
              placeholder="Siswa dapat mengidentifikasi, menjelaskan, menganalisis... (opsional, AI dapat merekomendasikan)"
            />
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canSuggestTujuan || suggestingTujuan}
                onClick={handleSuggestTujuan}
                className="gap-1.5"
              >
                {suggestingTujuan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                {suggestingTujuan ? "Memuat tujuan…" : "Rekomendasikan Tujuan"}
              </Button>
              {!canSuggestTujuan && (
                <p className="mt-1 text-xs text-muted-foreground">Isi/Pilih Topik Pembelajaran terlebih dahulu.</p>
              )}
            </div>
            {tujuanSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tujuanSuggestions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tujuanPembelajaran: f.tujuanPembelajaran
                          ? `${f.tujuanPembelajaran}\n${item}`
                          : item,
                      }))
                    }
                    className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary hover:bg-primary/10 transition-colors text-left"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Row 8: Sumber Referensi */}
          <Field label="Sumber Referensi" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.sumberReferensi}
              onChange={(e) => setForm({ ...form, sumberReferensi: e.target.value })}
              placeholder="Upload PDF atau input manual - referensi materi, bab buku, link, dll"
            />
          </Field>

          <Field label="Petunjuk Pengerjaan" className="sm:col-span-2">
            <Textarea
              rows={5}
              value={form.petunjukPengerjaan}
              onChange={(e) => setForm({ ...form, petunjukPengerjaan: e.target.value })}
              placeholder="Satu baris untuk satu poin petunjuk"
            />
            <p className="text-xs text-muted-foreground">Isi satu baris per poin agar format dokumen rapi.</p>
          </Field>

          {/* Row 9: Tipe Soal (Taksonomi) */}
          <Field label="Tipe Soal (Taksonomi)">
            <div className="flex flex-wrap gap-1.5">
              {TIPE_SOAL.map((item) => {
                const active = selectedTipeSoal.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleTipeSoal(item)}
                    className={
                      "rounded-lg border px-2.5 py-1 text-xs transition-colors text-left " +
                      (active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10")
                    }
                  >
                    {active ? "✓ " : "+ "}
                    {item}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Bisa pilih lebih dari satu taksonomi.</p>
          </Field>

          {/* Row 10: Format Soal */}
          <Field label="Format Soal *">
            <Select value={form.formatSoal} onValueChange={(v) => setForm({ ...form, formatSoal: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMAT_SOAL.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {form.formatSoal === "pg" && (
            <Field label="Jumlah Opsi Pilihan Ganda">
              <Select
                value={String(form.jumlahPilihanPg)}
                onValueChange={(v) => setForm({ ...form, jumlahPilihanPg: Number(v) as 3 | 4 | 5 })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PILIHAN_JAWABAN_PG.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Row 11: Tingkat Kesulitan */}
          <Field label="Tingkat Kesulitan">
            <Select value={form.tingkat} onValueChange={(v) => setForm({ ...form, tingkat: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TINGKAT_KESULITAN.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Row 12: Tambahkan Ilustrasi */}
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="ilustrasi"
              checked={form.tambahkanIlustrasi}
              onCheckedChange={(checked) => setForm({ ...form, tambahkanIlustrasi: checked as boolean })}
            />
            <Label htmlFor="ilustrasi" className="font-normal cursor-pointer">
              Tambahkan Ilustrasi pada Soal
            </Label>
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2">
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Buat Soal
            </Button>
          </div>
        </form>

        <div className="xl:col-span-7">
          <ResultPanel loading={loading} type="soal" title={result?.title ?? null} content={result?.content ?? null} />
          {!loading && !result && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Preview hasil Soal akan muncul di sini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

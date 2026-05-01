import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Lightbulb } from "lucide-react";
import { ResultPanel, useGenerator } from "@/components/generator-shared";
import { suggestRppContent } from "@/server/generate.functions";
import { getSession } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/app/rpp")({
  component: RppPage,
});

function RppPage() {
  const { loading, result, run } = useGenerator();
  const [form, setForm] = useState({
    mataPelajaran: "",
    kelas: "",
    fase: "",
    alokasiWaktu: "2 x 40 menit",
    materi: "",
    tujuanPembelajaran: "",
    modelPembelajaran: "Discovery Learning",
  });

  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ materi: string[]; tujuan: string[] } | null>(null);

  const canSuggest = form.mataPelajaran.trim() && form.kelas.trim();

  const handleSuggest = async () => {
    const sess = getSession();
    if (!sess) return;
    setSuggesting(true);
    setSuggestions(null);
    try {
      const res = await suggestRppContent({
        data: {
          token: sess.token,
          mataPelajaran: form.mataPelajaran,
          kelas: form.kelas,
          fase: form.fase,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSuggestions({ materi: res.materi, tujuan: res.tujuan });
      toast.success("Rekomendasi siap! Klik untuk memilih.");
    } catch {
      toast.error("Gagal mendapatkan rekomendasi.");
    } finally {
      setSuggesting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mataPelajaran || !form.kelas || !form.materi) return;
    run("rpp", form);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Generator RPP</h1>
        <p className="text-sm text-muted-foreground">
          Isi formulir singkat — AI akan menyusun RPP terstruktur sesuai Kurikulum Merdeka.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2">
        <Field label="Mata Pelajaran *">
          <Input value={form.mataPelajaran} onChange={(e) => setForm({ ...form, mataPelajaran: e.target.value })} placeholder="Matematika" />
        </Field>
        <Field label="Kelas *">
          <Input value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} placeholder="VII / 7" />
        </Field>
        <Field label="Fase (opsional)">
          <Input value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })} placeholder="D" />
        </Field>
        <Field label="Alokasi Waktu">
          <Input value={form.alokasiWaktu} onChange={(e) => setForm({ ...form, alokasiWaktu: e.target.value })} />
        </Field>
        <Field label="Model Pembelajaran" className="sm:col-span-2">
          <Select value={form.modelPembelajaran} onValueChange={(v) => setForm({ ...form, modelPembelajaran: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Discovery Learning">Discovery Learning</SelectItem>
              <SelectItem value="Project-Based Learning">Project-Based Learning</SelectItem>
              <SelectItem value="Problem-Based Learning">Problem-Based Learning</SelectItem>
              <SelectItem value="Cooperative Learning">Cooperative Learning</SelectItem>
              <SelectItem value="Inquiry Learning">Inquiry Learning</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {/* Suggest button */}
        <div className="sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canSuggest || suggesting}
            onClick={handleSuggest}
            className="gap-1.5"
          >
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
            {suggesting ? "Memuat rekomendasi…" : "Rekomendasikan Materi & Tujuan"}
          </Button>
          {!canSuggest && (
            <p className="mt-1 text-xs text-muted-foreground">Isi Mata Pelajaran dan Kelas terlebih dahulu.</p>
          )}
        </div>

        <Field label="Materi Pokok / Kompetensi Dasar *" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={form.materi}
            onChange={(e) => setForm({ ...form, materi: e.target.value })}
            placeholder="Operasi hitung bilangan bulat dan pecahan…"
          />
          {suggestions?.materi && suggestions.materi.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.materi.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      materi: f.materi ? `${f.materi}\n${item}` : item,
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

        <Field label="Tujuan Pembelajaran" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.tujuanPembelajaran}
            onChange={(e) => setForm({ ...form, tujuanPembelajaran: e.target.value })}
            placeholder="Siswa mampu menjelaskan…"
          />
          {suggestions?.tujuan && suggestions.tujuan.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.tujuan.map((item, i) => (
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

        <div className="sm:col-span-2">
          <Button type="submit" className="h-11 w-full sm:w-auto" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Buat RPP
          </Button>
        </div>
      </form>

      <ResultPanel loading={loading} type="rpp" title={result?.title ?? null} content={result?.content ?? null} />
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

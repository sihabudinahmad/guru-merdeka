import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { ResultPanel, useGenerator } from "@/components/generator-shared";

export const Route = createFileRoute("/_app/rkp")({
  component: RkpPage,
});

function RkpPage() {
  const { loading, result, run } = useGenerator();
  const [form, setForm] = useState({
    tema: "",
    subTema: "",
    usia: "5",
    hari: "Senin",
    alokasiWaktu: "150 menit",
    fokus: "",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tema || !form.subTema) return;
    run("rkp", form);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Generator RKP (PAUD/TK)</h1>
        <p className="text-sm text-muted-foreground">
          Susun RKP harian yang menyenangkan dan kontekstual.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2">
        <Field label="Tema *">
          <Input value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} placeholder="Lingkunganku" />
        </Field>
        <Field label="Sub-tema *">
          <Input value={form.subTema} onChange={(e) => setForm({ ...form, subTema: e.target.value })} placeholder="Keluargaku" />
        </Field>
        <Field label="Usia (tahun)">
          <Input value={form.usia} onChange={(e) => setForm({ ...form, usia: e.target.value })} placeholder="5" />
        </Field>
        <Field label="Hari">
          <Input value={form.hari} onChange={(e) => setForm({ ...form, hari: e.target.value })} placeholder="Senin" />
        </Field>
        <Field label="Alokasi Waktu" className="sm:col-span-2">
          <Input value={form.alokasiWaktu} onChange={(e) => setForm({ ...form, alokasiWaktu: e.target.value })} />
        </Field>
        <Field label="Fokus / Kegiatan Utama (opsional)" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={form.fokus}
            onChange={(e) => setForm({ ...form, fokus: e.target.value })}
            placeholder="Mengenal anggota keluarga melalui kegiatan menggambar dan bercerita."
          />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" className="h-11 w-full sm:w-auto" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Buat RKP
          </Button>
        </div>
      </form>

      <ResultPanel loading={loading} type="rkp" title={result?.title ?? null} content={result?.content ?? null} />
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

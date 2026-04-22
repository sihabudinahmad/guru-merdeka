import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { ResultPanel, useGenerator } from "@/components/generator-shared";

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
        <Field label="Materi Pokok / Kompetensi Dasar *" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={form.materi}
            onChange={(e) => setForm({ ...form, materi: e.target.value })}
            placeholder="Operasi hitung bilangan bulat dan pecahan…"
          />
        </Field>
        <Field label="Catatan Tujuan (opsional)" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.tujuanPembelajaran}
            onChange={(e) => setForm({ ...form, tujuanPembelajaran: e.target.value })}
            placeholder="Siswa mampu menjelaskan…"
          />
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

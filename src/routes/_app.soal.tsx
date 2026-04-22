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

export const Route = createFileRoute("/_app/soal")({
  component: SoalPage,
});

function SoalPage() {
  const { loading, result, run } = useGenerator();
  const [form, setForm] = useState({
    mataPelajaran: "",
    kelas: "",
    materi: "",
    jumlahSoal: 5,
    tipe: "pg" as "pg" | "esai" | "campuran",
    tingkat: "sedang" as "mudah" | "sedang" | "sulit" | "campuran",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mataPelajaran || !form.kelas || !form.materi) return;
    run("soal", form);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Generator Soal</h1>
        <p className="text-sm text-muted-foreground">
          AI akan menyusun soal lengkap dengan kunci jawaban dan pembahasan.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2">
        <Field label="Mata Pelajaran *">
          <Input value={form.mataPelajaran} onChange={(e) => setForm({ ...form, mataPelajaran: e.target.value })} placeholder="IPA" />
        </Field>
        <Field label="Kelas *">
          <Input value={form.kelas} onChange={(e) => setForm({ ...form, kelas: e.target.value })} placeholder="VIII / 8" />
        </Field>
        <Field label="Jumlah Soal">
          <Input
            type="number"
            min={1}
            max={30}
            value={form.jumlahSoal}
            onChange={(e) => setForm({ ...form, jumlahSoal: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
          />
        </Field>
        <Field label="Tipe Soal">
          <Select value={form.tipe} onValueChange={(v) => setForm({ ...form, tipe: v as typeof form.tipe })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pg">Pilihan Ganda</SelectItem>
              <SelectItem value="esai">Esai</SelectItem>
              <SelectItem value="campuran">Campuran</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tingkat Kesulitan" className="sm:col-span-2">
          <Select value={form.tingkat} onValueChange={(v) => setForm({ ...form, tingkat: v as typeof form.tingkat })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mudah">Mudah</SelectItem>
              <SelectItem value="sedang">Sedang</SelectItem>
              <SelectItem value="sulit">Sulit</SelectItem>
              <SelectItem value="campuran">Campuran</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Materi *" className="sm:col-span-2">
          <Textarea
            rows={3}
            value={form.materi}
            onChange={(e) => setForm({ ...form, materi: e.target.value })}
            placeholder="Sistem pencernaan manusia…"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" className="h-11 w-full sm:w-auto" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Buat Soal
          </Button>
        </div>
      </form>

      <ResultPanel loading={loading} type="soal" title={result?.title ?? null} content={result?.content ?? null} />
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

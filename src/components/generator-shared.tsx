import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { buildDocxBlob, downloadBlob } from "@/lib/docx-export";
import { generateDocument } from "@/server/generate.functions";
import { getSession } from "@/lib/session";
import { useNavigate } from "@tanstack/react-router";

type GenType = "rpp" | "soal" | "rkp";

export function ResultPanel({
  loading,
  type,
  title,
  content,
}: {
  loading: boolean;
  type: GenType;
  title: string | null;
  content: unknown | null;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const pretty = useMemo(() => (content ? JSON.stringify(content, null, 2) : ""), [content]);

  const handleCopy = async () => {
    if (!pretty) return;
    await navigator.clipboard.writeText(pretty);
    setCopied(true);
    toast.success("Disalin ke clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = async () => {
    if (!content || !title) return;
    setDownloading(true);
    try {
      const blob = await buildDocxBlob(type, content);
      const safe = title.replace(/[^\w\d-_. ]/g, "_").slice(0, 80);
      downloadBlob(blob, `${safe}.docx`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat file Word.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Sedang menyusun dokumen…</p>
        <p className="mt-1 text-xs text-muted-foreground">Biasanya 10–30 detik. Mohon ditunggu.</p>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Salin JSON
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Unduh .docx
          </Button>
        </div>
      </div>
      <RenderedContent type={type} content={content} />
    </div>
  );
}

export function RenderedContent({ type, content }: { type: GenType; content: any }) {
  if (type === "rpp") return <RppView c={content} />;
  if (type === "soal") return <SoalView c={content} />;
  return <RkpView c={content} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2 space-y-1.5 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function List({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-muted-foreground">—</p>;
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function RppView({ c }: { c: any }) {
  const id = c.identitas ?? {};
  return (
    <div className="space-y-3">
      <Section title="Identitas">
        <p><b>Mata Pelajaran:</b> {id.mataPelajaran ?? "-"}</p>
        <p><b>Kelas:</b> {id.kelas ?? "-"}{id.fase ? ` (Fase ${id.fase})` : ""}</p>
        <p><b>Alokasi Waktu:</b> {id.alokasiWaktu ?? "-"}</p>
        <p><b>Materi Pokok:</b> {id.materiPokok ?? "-"}</p>
      </Section>
      <Section title="Tujuan Pembelajaran"><List items={c.tujuanPembelajaran} /></Section>
      {c.profilPelajarPancasila?.length ? (
        <Section title="Profil Pelajar Pancasila"><List items={c.profilPelajarPancasila} /></Section>
      ) : null}
      <Section title="Model Pembelajaran"><p>{c.modelPembelajaran ?? "-"}</p></Section>
      {c.mediaDanSumber?.length ? (
        <Section title="Media & Sumber"><List items={c.mediaDanSumber} /></Section>
      ) : null}
      <Section title="Langkah Pembelajaran">
        <p className="font-medium">Pembukaan</p>
        <List items={c.langkahPembelajaran?.pembukaan} />
        <p className="mt-2 font-medium">Inti</p>
        <List items={c.langkahPembelajaran?.inti} />
        <p className="mt-2 font-medium">Penutup</p>
        <List items={c.langkahPembelajaran?.penutup} />
      </Section>
      <Section title="Penilaian">
        <p><b>Sikap:</b> {c.penilaian?.sikap ?? "-"}</p>
        <p><b>Pengetahuan:</b> {c.penilaian?.pengetahuan ?? "-"}</p>
        <p><b>Keterampilan:</b> {c.penilaian?.keterampilan ?? "-"}</p>
      </Section>
    </div>
  );
}

function SoalView({ c }: { c: any }) {
  return (
    <div className="space-y-3">
      <Section title="Informasi">
        <p><b>{c.judul}</b></p>
        <p>{c.mataPelajaran} — {c.kelas}</p>
        <p className="text-muted-foreground">Materi: {c.materi}</p>
      </Section>
      <Section title={`Soal (${c.soal?.length ?? 0})`}>
        <ol className="space-y-3 pl-5">
          {(c.soal ?? []).map((s: any) => (
            <li key={s.nomor} className="space-y-1">
              <p className="font-medium">{s.pertanyaan}</p>
              {s.tipe === "pg" && Array.isArray(s.opsi) && (
                <ul className="space-y-0.5 pl-4 text-sm">
                  {s.opsi.map((opt: string, i: number) => (
                    <li key={i}>{String.fromCharCode(65 + i)}. {opt}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Tingkat: {s.tingkat} · Tipe: {s.tipe.toUpperCase()}
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-primary">Kunci & Pembahasan</summary>
                <p className="mt-1"><b>Jawaban:</b> {s.kunciJawaban}</p>
                <p><b>Pembahasan:</b> {s.pembahasan}</p>
              </details>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function RkpView({ c }: { c: any }) {
  const id = c.identitas ?? {};
  return (
    <div className="space-y-3">
      <Section title="Identitas">
        <p><b>Tema:</b> {id.tema} / <b>Sub-tema:</b> {id.subTema}</p>
        <p><b>Usia:</b> {id.usia} tahun · <b>Hari:</b> {id.hari}</p>
        <p><b>Alokasi Waktu:</b> {id.alokasiWaktu}</p>
      </Section>
      <Section title="Tujuan Pembelajaran"><List items={c.tujuanPembelajaran} /></Section>
      <Section title="Kegiatan">
        <p className="font-medium">Pembukaan</p>
        <List items={c.kegiatan?.pembukaan} />
        <p className="mt-2 font-medium">Inti</p>
        <List items={c.kegiatan?.inti} />
        <p className="mt-2 font-medium">Penutup</p>
        <List items={c.kegiatan?.penutup} />
      </Section>
      <Section title="Alat & Bahan"><List items={c.alatBahan} /></Section>
      <Section title="Penilaian"><List items={c.penilaian} /></Section>
    </div>
  );
}

export function useGenerator() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; content: unknown } | null>(null);

  useEffect(() => {
    if (!getSession()) navigate({ to: "/login" });
  }, [navigate]);

  const run = async (type: GenType, payload: unknown) => {
    const sess = getSession();
    if (!sess) {
      navigate({ to: "/login" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await generateDocument({ data: { token: sess.token, type, payload } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult({ title: res.title, content: res.content });
      toast.success("Dokumen siap!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat dokumen.");
    } finally {
      setLoading(false);
    }
  };

  return { loading, result, run };
}

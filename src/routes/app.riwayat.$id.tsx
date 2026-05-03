import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Download, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getGeneration } from "@/functions/generate.functions";
import { getSession } from "@/lib/session";
import { RenderedContent } from "@/components/generator-shared";
import { buildDocxBlob, downloadBlob } from "@/lib/docx-export";
import { buildPdfBlob } from "@/lib/pdf-export";

export const Route = createFileRoute("/app/riwayat/$id")({
  component: RiwayatDetail,
});

type DocItem = {
  id: string;
  type: "rpp" | "soal" | "rkp";
  title: string;
  output_content: unknown;
  input_payload: unknown;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = { rpp: "RPP", soal: "Soal", rkp: "RKP" };
const TYPE_TO_ROUTE: Record<string, "/app/rpp" | "/app/soal" | "/app/rkp"> = {
  rpp: "/app/rpp",
  soal: "/app/soal",
  rkp: "/app/rkp",
};

function RiwayatDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<DocItem | null | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showParams, setShowParams] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    getGeneration({ data: { token: s.token, id } })
      .then((res) => {
        if (res.ok) setItem(res.item as DocItem);
        else { toast.error(res.error); setItem(null); }
      })
      .catch(() => setItem(null));
  }, [id, navigate]);

  const safeName = (s: string) => s.replace(/[^\w\d-_. ]/g, "_").slice(0, 80);

  const handleDownload = async () => {
    if (!item) return;
    setDownloading(true);
    try {
      const blob = await buildDocxBlob(item.type, item.output_content);
      downloadBlob(blob, `${safeName(item.title)}.docx`);
      toast.success("File Word berhasil diunduh.");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh file Word.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!item) return;
    setDownloadingPdf(true);
    try {
      const blob = buildPdfBlob(item.type, item.output_content);
      downloadBlob(blob, `${safeName(item.title)}.pdf`);
      toast.success("File PDF berhasil diunduh.");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCopy = async () => {
    if (!item) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(item.output_content, null, 2));
      setCopied(true);
      toast.success("Disalin ke clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin.");
    }
  };

  if (item === undefined) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
      </div>
    );
  }
  if (!item) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm">Dokumen tidak ditemukan.</p>
        <Link to="/app/riwayat" className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/riwayat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Riwayat
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            Salin JSON
          </Button>
          <Button onClick={handleDownload} disabled={downloading} size="sm" variant="outline">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            .docx
          </Button>
          <Button onClick={handleDownloadPdf} disabled={downloadingPdf} size="sm">
            {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            .pdf
          </Button>
          <Link to={TYPE_TO_ROUTE[item.type]}>
            <Button size="sm" variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Buat Ulang
            </Button>
          </Link>
        </div>
      </div>

      {/* Header card */}
      <header className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
          item.type === "rpp"
            ? "bg-primary/10 text-primary"
            : item.type === "soal"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        }`}>
          {TYPE_LABEL[item.type] ?? item.type.toUpperCase()}
        </span>
        <h1 className="mt-1.5 text-xl font-bold tracking-tight">{item.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Dibuat pada {new Date(item.created_at).toLocaleString("id-ID")}
        </p>

        {/* Collapsible input params */}
        {Boolean(item.input_payload) && (
          <div className="mt-3 border-t border-border pt-3">
            <button
              onClick={() => setShowParams((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showParams ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showParams ? "Sembunyikan" : "Lihat"} parameter input
            </button>
            {showParams && (
              <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                {Object.entries(item.input_payload as Record<string, unknown>)
                  .filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false)
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-1 overflow-hidden">
                      <span className="shrink-0 font-medium capitalize text-muted-foreground">
                        {k.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span className="truncate">{String(v)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </header>

      <RenderedContent type={item.type} content={item.output_content} />
    </div>
  );
}

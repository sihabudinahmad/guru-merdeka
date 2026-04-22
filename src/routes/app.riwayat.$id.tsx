import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getGeneration } from "@/server/generate.functions";
import { getSession } from "@/lib/session";
import { RenderedContent } from "@/components/generator-shared";
import { buildDocxBlob, downloadBlob } from "@/lib/docx-export";
import { buildPdfBlob } from "@/lib/pdf-export";

export const Route = createFileRoute("/app/riwayat/$id")({
  component: RiwayatDetail,
});

function RiwayatDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<{ id: string; type: "rpp" | "soal" | "rkp"; title: string; output_content: unknown; created_at: string } | null | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    getGeneration({ data: { token: s.token, id } })
      .then((res) => {
        if (res.ok) setItem(res.item as any);
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
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh.");
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
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengunduh PDF.");
    } finally {
      setDownloadingPdf(false);
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
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/app/riwayat" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Riwayat
        </Link>
        <div className="flex gap-2">
          <Button onClick={handleDownload} disabled={downloading} size="sm" variant="outline">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            .docx
          </Button>
          <Button onClick={handleDownloadPdf} disabled={downloadingPdf} size="sm">
            {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            .pdf
          </Button>
        </div>
      </div>
      <header>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.type}</p>
        <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Dibuat {new Date(item.created_at).toLocaleString("id-ID")}
        </p>
      </header>
      <RenderedContent type={item.type} content={item.output_content} />
    </div>
  );
}

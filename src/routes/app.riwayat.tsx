import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listHistory } from "@/server/generate.functions";
import { getSession } from "@/lib/session";
import { FileText, ListChecks, BookOpen, Loader2, History as HistoryIcon, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/riwayat")({
  component: RiwayatPage,
});

type Item = { id: string; type: string; title: string; created_at: string };

function RiwayatPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    listHistory({ data: { token: s.token } })
      .then((res) => {
        if (res.ok) setItems(res.items as Item[]);
        else setItems([]);
      })
      .catch(() => setItems([]));
  }, [navigate]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Dokumen</h1>
        <p className="text-sm text-muted-foreground">50 dokumen terakhir untuk kode akses Anda.</p>
      </header>

      {items === null ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                to="/app/riwayat/$id"
                params={{ id: it.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:bg-accent"
              >
                <TypeIcon type={it.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.type.toUpperCase()} · {new Date(it.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  const cls = "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ";
  if (type === "rpp") return <div className={cls + "bg-primary text-primary-foreground"}><FileText className="h-5 w-5" /></div>;
  if (type === "soal") return <div className={cls + "bg-success text-success-foreground"}><ListChecks className="h-5 w-5" /></div>;
  return <div className={cls + "bg-warning text-warning-foreground"}><BookOpen className="h-5 w-5" /></div>;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <HistoryIcon className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">Belum ada dokumen</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Dokumen yang Anda buat akan muncul di sini.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link to="/app/rpp" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Buat RPP</Link>
        <Link to="/app/soal" className="rounded-md bg-success px-3 py-1.5 text-sm font-medium text-success-foreground hover:opacity-90">Buat Soal</Link>
        <Link to="/app/rkp" className="rounded-md bg-warning px-3 py-1.5 text-sm font-medium text-warning-foreground hover:opacity-90">Buat RKP</Link>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listHistory } from "@/functions/generate.functions";
import { getSession } from "@/lib/session";
import { FileText, ListChecks, BookOpen, Loader2, History as HistoryIcon, ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/app/riwayat/")({
  component: RiwayatPage,
});

type Item = { id: string; type: string; title: string; created_at: string };
type FilterType = "semua" | "rpp" | "soal" | "rkp";

function RiwayatPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState<FilterType>("semua");
  const [search, setSearch] = useState("");

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

  const counts = {
    semua: items?.length ?? 0,
    rpp: items?.filter((i) => i.type === "rpp").length ?? 0,
    soal: items?.filter((i) => i.type === "soal").length ?? 0,
    rkp: items?.filter((i) => i.type === "rkp").length ?? 0,
  };

  const filtered = items?.filter((it) => {
    const matchType = filter === "semua" || it.type === filter;
    const matchSearch = search === "" || it.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const tabs: { key: FilterType; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "rpp", label: "RPP" },
    { key: "soal", label: "Soal" },
    { key: "rkp", label: "RKP" },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Dokumen</h1>
        <p className="text-sm text-muted-foreground">50 dokumen terakhir untuk kode akses Anda.</p>
      </header>

      {/* Filter & Search */}
      {items !== null && items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {items !== null && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs leading-none ${
                    filter === tab.key ? "bg-primary/10 text-primary" : "bg-border text-muted-foreground"
                  }`}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari judul…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      {items === null ? (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : filtered && filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Tidak ada dokumen ditemukan</p>
          <p className="mt-1 text-sm text-muted-foreground">Coba ubah filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered!.map((it) => (
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
                    <TypeBadge type={it.type} /> · {new Date(it.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
  if (type === "rpp") return <div className={cls + "bg-primary/10 text-primary"}><FileText className="h-5 w-5" /></div>;
  if (type === "soal") return <div className={cls + "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}><ListChecks className="h-5 w-5" /></div>;
  return <div className={cls + "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}><BookOpen className="h-5 w-5" /></div>;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "rpp") return <span className="font-semibold text-primary">RPP</span>;
  if (type === "soal") return <span className="font-semibold text-emerald-600 dark:text-emerald-400">Soal</span>;
  return <span className="font-semibold text-amber-600 dark:text-amber-400">RKP</span>;
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
        <Link to="/app/soal" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Buat Soal</Link>
        <Link to="/app/rkp" className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Buat RKP</Link>
      </div>
    </div>
  );
}

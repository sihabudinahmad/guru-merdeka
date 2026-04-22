import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ListChecks, BookOpen, History, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Selamat datang 👋</h1>
        <p className="mt-1 text-muted-foreground">Pilih jenis dokumen yang ingin Anda buat.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GeneratorCard
          to="/app/rpp"
          icon={<FileText className="h-6 w-6" />}
          title="Generator RPP"
          desc="Rencana Pelaksanaan Pembelajaran sesuai Kurikulum Merdeka."
          color="bg-primary text-primary-foreground"
        />
        <GeneratorCard
          to="/app/soal"
          icon={<ListChecks className="h-6 w-6" />}
          title="Generator Soal"
          desc="Pilihan ganda, esai, atau campuran dengan kunci jawaban."
          color="bg-success text-success-foreground"
        />
        <GeneratorCard
          to="/app/rkp"
          icon={<BookOpen className="h-6 w-6" />}
          title="Generator RKP"
          desc="Rencana Kegiatan Pembelajaran harian untuk PAUD/TK."
          color="bg-warning text-warning-foreground"
        />
      </div>

      <div>
        <Link
          to="/app/riwayat"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] transition hover:bg-accent"
        >
          <History className="h-4 w-4" />
          Lihat riwayat dokumen
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function GeneratorCard({
  to,
  icon,
  title,
  desc,
  color,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-border p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
      style={{ background: "var(--gradient-card)" }}
    >
      <div className={"flex h-12 w-12 items-center justify-center rounded-xl " + color}>{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
        Mulai
        <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

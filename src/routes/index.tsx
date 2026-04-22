import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileText,
  ListChecks,
  BookOpen,
  ShieldCheck,
  Clock,
  Smartphone,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guru AI — Generator RPP, RKP & Soal dengan Kode Akses" },
      {
        name: "description",
        content:
          "Buat RPP Kurikulum Merdeka, RKP PAUD, dan soal latihan dalam menit. Cukup masukkan kode akses dari sekolah Anda.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Guru AI</span>
          </Link>
          <Link to="/login">
            <Button size="sm">Masuk</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-primary-foreground sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Bertenaga AI Gemini
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Buat RPP, RKP, & Soal
            <br />
            dalam Hitungan Menit
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/90 sm:text-lg">
            Asisten AI untuk guru Indonesia. Cukup isi formulir singkat, biarkan AI menyusun perangkat
            ajar yang siap diunduh sebagai dokumen Word.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Masuk dengan Kode Akses
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#fitur">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground sm:w-auto"
              >
                Lihat Fitur
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-primary-foreground/75">
            Belum punya kode? Hubungi koordinator sekolah Anda.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Apa yang bisa Anda buat</h2>
          <p className="mt-2 text-muted-foreground">
            Tiga generator utama untuk kebutuhan harian Anda di kelas
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="RPP Kurikulum Merdeka"
            desc="Identitas, tujuan pembelajaran, langkah pembukaan/inti/penutup, hingga penilaian — terstruktur rapi."
          />
          <FeatureCard
            icon={<ListChecks className="h-5 w-5" />}
            title="Soal Latihan & Ujian"
            desc="Pilihan ganda, esai, atau campuran. Lengkap dengan kunci jawaban dan pembahasan singkat."
          />
          <FeatureCard
            icon={<BookOpen className="h-5 w-5" />}
            title="RKP Harian PAUD/TK"
            desc="Tema, sub-tema, kegiatan main, alat & bahan, hingga indikator penilaian anak."
          />
        </div>
      </section>

      {/* Why */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Dirancang khusus untuk guru
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Why
              icon={<Clock className="h-6 w-6 text-primary" />}
              title="Hemat waktu"
              desc="Yang biasanya 1 jam, jadi 2 menit. Fokus mengajar, bukan mengetik."
            />
            <Why
              icon={<Smartphone className="h-6 w-6 text-primary" />}
              title="Bisa dari HP"
              desc="Antarmuka mobile-first. Buat dokumen di mana saja, kapan saja."
            />
            <Why
              icon={<ShieldCheck className="h-6 w-6 text-primary" />}
              title="Akses dengan kode"
              desc="Tidak perlu daftar email. Cukup kode dari sekolah Anda — aman dan praktis."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Siap mencoba?</h2>
        <p className="mt-2 text-muted-foreground">
          Masukkan kode akses Anda dan mulai membuat dokumen pertama.
        </p>
        <div className="mt-6">
          <Link to="/login">
            <Button size="lg">
              Masuk Sekarang
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Guru AI. Untuk pendidik Indonesia.</p>
          <p>Dibangun dengan AI Lovable.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div
      className="rounded-2xl border border-border p-6 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elegant)]"
      style={{ background: "var(--gradient-card)" }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Why({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

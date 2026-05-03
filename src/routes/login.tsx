import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, KeyRound, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { redeemAccessCode } from "@/functions/access.functions";
import { getDeviceFingerprint, getSession, setSession } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk dengan Kode Akses — Guru AI" },
      {
        name: "description",
        content: "Masuk ke Guru AI menggunakan kode akses yang diberikan oleh sekolah Anda.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      navigate({ to: "/app" });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      toast.error("Kode terlalu pendek.");
      return;
    }
    setLoading(true);
    try {
      const fp = await getDeviceFingerprint();
      const res = await redeemAccessCode({ data: { code: trimmed, deviceFingerprint: fp } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSession({ token: res.token, codeLabel: res.label, code: res.code });
      toast.success("Berhasil masuk.");
      navigate({ to: "/app" });
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Tidak dapat menghubungi server. Coba lagi.";
      toast.error(message || "Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Beranda
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Asisten Guru</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md rounded-2xl border border-border p-6 shadow-[var(--shadow-soft)] sm:p-8"
          style={{ background: "var(--gradient-card)" }}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">Masuk dengan Kode</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Gunakan kode akses yang diberikan saat transaksi pembelian. Kode biasanya terdiri dari 6-8 karakter.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Akses</Label>
              <Input
                id="code"
                placeholder="masukkan kode di sini"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                className="h-12 text-center text-lg"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memvalidasi…
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Jangan lupa berdoa
          </p>
        </div>
      </main>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { claimAdminRole } from "@/server/admin.functions";
import { callWithAuth } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/claim")({
  head: () => ({
    meta: [{ title: "Klaim Role Admin — Guru AI" }],
  }),
  component: ClaimAdmin,
});

function ClaimAdmin() {
  const navigate = useNavigate();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const has = !!data.session;
      setHasSession(has);
      if (!has) navigate({ to: "/admin/login" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await callWithAuth(claimAdminRole, { secret });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Role admin diaktifkan.");
      navigate({ to: "/admin" });
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  if (hasSession === null) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border border-border p-6 shadow-[var(--shadow-soft)] sm:p-8"
        style={{ background: "var(--gradient-card)" }}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight">Klaim Role Admin</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Masukkan secret bootstrap untuk akun pertama. Setelah itu, akun lain bisa ditambah dari panel.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secret">Secret Bootstrap</Label>
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
              </>
            ) : (
              "Klaim Role Admin"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

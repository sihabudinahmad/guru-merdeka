import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin as isAdminFn } from "@/server/admin.functions";
import { callWithAuth } from "@/lib/admin-client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type Status = "loading" | "anon" | "not-admin" | "ok";

function AdminLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      if (!sess) {
        if (!cancelled) setStatus("anon");
        return;
      }
      try {
        const res = await callWithAuth(isAdminFn, undefined as never);
        if (cancelled) return;
        if (res.ok && res.isAdmin) {
          setEmail(sess.user.email ?? null);
          setStatus("ok");
        } else {
          setStatus("not-admin");
        }
      } catch {
        if (!cancelled) setStatus("not-admin");
      }
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Redirect anon to login when not on /admin/login
  useEffect(() => {
    if (status === "anon" && pathname !== "/admin/login") {
      navigate({ to: "/admin/login" });
    }
  }, [status, pathname, navigate]);

  // Allow rendering /admin/login regardless of auth
  if (pathname === "/admin/login") {
    return <Outlet />;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }

  if (status === "anon") return null;

  if (status === "not-admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">Akun Anda bukan admin</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Akun yang sedang login tidak memiliki hak admin. Hubungi pemilik aplikasi atau klaim role admin
          dengan secret bootstrap.
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/claim">Klaim role admin</Link>
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/admin/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Beranda</span>
            </Link>
            <span className="mx-2 text-muted-foreground">·</span>
            <Link to="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/admin/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}

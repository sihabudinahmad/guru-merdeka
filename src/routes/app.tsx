import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, getSession, type LocalSession } from "@/lib/session";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [session, setSessionState] = useState<LocalSession | null | undefined>(undefined);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/login" });
      return;
    }
    setSessionState(s);
  }, [navigate]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }
  if (!session) return null;

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <Link to="/app" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Guru AI</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink to="/app" active={pathname === "/app"} label="Dashboard" />
            <NavLink to="/app/rpp" active={pathname.startsWith("/app/rpp")} label="RPP" />
            <NavLink to="/app/soal" active={pathname.startsWith("/app/soal")} label="Soal" />
            <NavLink to="/app/rkp" active={pathname.startsWith("/app/rkp")} label="RKP" />
            <NavLink to="/app/riwayat" active={pathname.startsWith("/app/riwayat")} label="Riwayat" />
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {session.codeLabel ?? session.code}
            </span>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
        {/* Mobile bottom-nav alternative — top scroll bar */}
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 sm:hidden">
          <NavLink to="/app" active={pathname === "/app"} label={<LayoutDashboard className="h-4 w-4" />} compact />
          <NavLink to="/app/rpp" active={pathname.startsWith("/app/rpp")} label="RPP" compact />
          <NavLink to="/app/soal" active={pathname.startsWith("/app/soal")} label="Soal" compact />
          <NavLink to="/app/rkp" active={pathname.startsWith("/app/rkp")} label="RKP" compact />
          <NavLink to="/app/riwayat" active={pathname.startsWith("/app/riwayat")} label="Riwayat" compact />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({
  to,
  active,
  label,
  compact,
}: {
  to: string;
  active: boolean;
  label: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground") +
        (compact ? " px-3 py-1" : "")
      }
    >
      {label}
    </Link>
  );
}

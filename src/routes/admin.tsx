import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, LogOut, ArrowLeft, RefreshCw, AlertTriangle, BrainCircuit, KeyRound, LayoutDashboard, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin as isAdminFn } from "@/functions/admin.functions";
import { callWithAuth } from "@/lib/admin-client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type Status = "loading" | "anon" | "not-admin" | "ok";

function AdminLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const lastKnownAdminRef = useRef(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicAdminRoute = pathname === "/admin/login" || pathname === "/admin/claim";

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let checkTimer: ReturnType<typeof setTimeout> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const check = async () => {
      if (cancelled || checkTimer) return; // Skip if already checking
      checkTimer = setTimeout(() => { checkTimer = null; }, 100); // Set cooldown
      
      try {
        setAuthError(null);
        const { data } = await supabase.auth.getSession();
        let sess = data.session;

        if (!sess) {
          try {
            const refreshed = await supabase.auth.refreshSession();
            sess = refreshed.data.session;
          } catch (refreshErr) {
            console.warn("Session refresh failed", refreshErr);
          }
        }

        setLastCheckedAt(new Date().toISOString());
        
        if (!sess) {
          if (!cancelled) {
            setEmail(null);
            setHasSession(false);
            setStatus("anon");
            if (!isPublicAdminRoute) {
              navigate({ to: "/admin/login" });
            }
          }
          return;
        }

        setHasSession(true);

        // Try server check first
        let isAdminVerified = false;
        try {
          const res = await withTimeout(
            callWithAuth(isAdminFn, undefined as never),
            8000,
            "Timeout saat verifikasi admin via server.",
          );
          if (cancelled) return;
          if (res.ok && res.isAdmin) {
            isAdminVerified = true;
            setEmail(sess.user.email ?? null);
            setStatus("ok");
            lastKnownAdminRef.current = true;
            return;
          }
        } catch (serverCheckError) {
          console.warn("Server admin check failed, trying client fallback", serverCheckError);
        }

        // Client-side fallback: check own role directly via RLS policy
        if (!isAdminVerified) {
          try {
            const { data: ownRole, error: ownRoleError } = await withTimeout(
              Promise.resolve(
                supabase
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", sess.user.id)
                  .eq("role", "admin")
                  .maybeSingle(),
              ),
              8000,
              "Timeout saat membaca role admin.",
            );

            if (cancelled) return;

            if (!ownRoleError && ownRole) {
              setEmail(sess.user.email ?? null);
              setStatus("ok");
              lastKnownAdminRef.current = true;
              return;
            }

            // Check if error is timeout
            if (ownRoleError?.message?.includes("Timeout")) {
              if (lastKnownAdminRef.current) {
                setAuthError("Koneksi sedang lambat, akses dipertahankan.");
                setStatus("ok");
                return;
              }
            } else if (ownRoleError) {
              setAuthError(ownRoleError.message || "Gagal membaca role admin.");
            }
          } catch (fallbackError) {
            console.warn("Client fallback check failed", fallbackError);
            if (lastKnownAdminRef.current) {
              setAuthError("Koneksi sedang lambat, akses dipertahankan.");
              setStatus("ok");
              return;
            }
          }
        }

        setStatus("not-admin");
      } catch (error) {
        if (!cancelled) {
          setLastCheckedAt(new Date().toISOString());
          const message = error instanceof Error ? error.message : "Gagal memverifikasi akses admin.";
          setAuthError(message);

          if (message.includes("Timeout") && lastKnownAdminRef.current) {
            setStatus("ok");
            return;
          }

          setStatus("not-admin");
        }
      }
    };

    // Initial check
    check();

    // Subscribe to auth changes (debounced to prevent multiple simultaneous checks)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) check();
      }, 200);
    });

    return () => {
      cancelled = true;
      if (checkTimer) clearTimeout(checkTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      sub?.subscription?.unsubscribe();
    };
  }, [isPublicAdminRoute, navigate]);

  // Redirect anon to login when not on a public admin route
  useEffect(() => {
    if (status === "anon" && !isPublicAdminRoute) {
      navigate({ to: "/admin/login" });
    }
  }, [status, isPublicAdminRoute, navigate]);

  // Allow rendering public admin child routes regardless of auth
  if (isPublicAdminRoute) {
    return <Outlet />;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Memuat…
      </div>
    );
  }

  if (status === "anon") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <p className="text-sm text-muted-foreground">Mengalihkan ke halaman login admin…</p>
        </div>
      </div>
    );
  }

  if (status === "not-admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        {authError ? <AlertTriangle className="h-10 w-10 text-amber-500" /> : <ShieldCheck className="h-10 w-10 text-muted-foreground" />}
        <h1 className="mt-3 text-xl font-semibold">{authError ? "Akses admin belum bisa diverifikasi" : "Akun Anda bukan admin"}</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {authError
            ? authError
            : "Akun yang sedang login tidak memiliki hak admin. Hubungi pemilik aplikasi atau klaim role admin dengan secret bootstrap."}
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/claim">Klaim role admin</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Muat ulang
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
        <div className="mt-6 w-full max-w-xl">
          <AdminDebugPanel
            status={status}
            pathname={pathname}
            email={email}
            hasSession={hasSession}
            authError={authError}
            lastCheckedAt={lastCheckedAt}
          />
        </div>
      </div>
    );
  }

  type NavItem = {
    to: string;
    label: string;
    description: string;
    icon: typeof LayoutDashboard;
    active: boolean;
    anchor?: boolean;
  };

  const navigationItems: NavItem[] = [
    {
      to: "/admin",
      label: "Dashboard Admin",
      description: "Panel utama dan ringkasan",
      icon: LayoutDashboard,
      active: pathname === "/admin" || pathname === "/admin/",
    },
    {
      to: "#konfigurasi-ai",
      label: "Konfigurasi AI",
      description: "API key, model, test koneksi",
      icon: BrainCircuit,
      active: pathname === "/admin" || pathname === "/admin/",
      anchor: true,
    },
    {
      to: "#kode-akses",
      label: "Kode Akses",
      description: "Atur kode guru dan perangkat",
      icon: KeyRound,
      active: pathname === "/admin" || pathname === "/admin/",
      anchor: true,
    },
  ];

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="p-3">
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Layout Admin</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Kelola akses dan konfigurasi AI</p>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={item.active} tooltip={item.label} size="lg">
                        {item.anchor ? (
                          <a href={item.to}>
                            <Icon className="h-4 w-4" />
                            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                              <div className="truncate font-medium">{item.label}</div>
                              <div className="truncate text-xs text-sidebar-foreground/70">{item.description}</div>
                            </div>
                          </a>
                        ) : (
                          <Link to={item.to}>
                            <Icon className="h-4 w-4" />
                            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                              <div className="truncate font-medium">{item.label}</div>
                              <div className="truncate text-xs text-sidebar-foreground/70">{item.description}</div>
                            </div>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Akses Cepat</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Buka aplikasi guru">
                    <Link to="/app">
                      <Sparkles className="h-4 w-4" />
                      <span>Aplikasi Guru</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Kembali ke beranda">
                    <Link to="/">
                      <Home className="h-4 w-4" />
                      <span>Beranda</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs uppercase tracking-wide text-sidebar-foreground/70">Admin aktif</p>
            <p className="mt-1 truncate text-sm font-semibold">{email ?? "-"}</p>
            <p className="mt-1 text-xs text-sidebar-foreground/70">Gunakan menu samping untuk berpindah antar area admin.</p>
          </div>

          <Button
            variant="ghost"
            className="justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/admin/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight">Panel Admin</p>
                <p className="truncate text-sm text-muted-foreground">Kelola akses guru, konfigurasi AI, dan debugging admin</p>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                <span>Beranda</span>
              </Link>
              <div className="rounded-xl border border-border bg-card px-3 py-2 text-right shadow-sm">
                <p className="text-xs text-muted-foreground">Login admin</p>
                <p className="max-w-52 truncate text-sm font-medium">{email}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <AdminDebugPanel
                status={status}
                pathname={pathname}
                email={email}
                hasSession={hasSession}
                authError={authError}
                lastCheckedAt={lastCheckedAt}
              />
            </div>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminDebugPanel({
  status,
  pathname,
  email,
  hasSession,
  authError,
  lastCheckedAt,
}: {
  status: Status;
  pathname: string;
  email: string | null;
  hasSession: boolean | null;
  authError: string | null;
  lastCheckedAt: string | null;
}) {
  return (
    <details className="rounded-xl border border-border bg-card/60 p-3 text-left text-sm shadow-sm">
      <summary className="cursor-pointer list-none font-medium text-foreground">
        Debug admin
      </summary>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <DebugItem label="Status" value={status} />
        <DebugItem label="Route" value={pathname} />
        <DebugItem label="Session" value={hasSession === null ? "unknown" : hasSession ? "active" : "none"} />
        <DebugItem label="Email" value={email ?? "-"} />
        <DebugItem
          label="Last check"
          value={lastCheckedAt ? new Date(lastCheckedAt).toLocaleString("id-ID") : "-"}
        />
        <DebugItem label="Error" value={authError ?? "-"} className={authError ? "text-amber-600 dark:text-amber-400" : undefined} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Panel ini hanya menampilkan info debug non-sensitif untuk membantu pengecekan akses admin.
      </p>
    </details>
  );
}

function DebugItem({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={className ?? "text-foreground"}>{value}</div>
    </div>
  );
}

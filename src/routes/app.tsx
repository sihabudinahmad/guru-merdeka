import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, History, LayoutDashboard, ListChecks, LogOut, Sparkles } from "lucide-react";
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

  const navigationItems = [
    {
      to: "/app",
      label: "Dashboard",
      description: "Ringkasan dan pintasan cepat",
      icon: LayoutDashboard,
      active: pathname === "/app",
    },
    {
      to: "/app/rpp",
      label: "Generator RPP",
      description: "Susun RPP otomatis",
      icon: FileText,
      active: pathname.startsWith("/app/rpp"),
    },
    {
      to: "/app/soal",
      label: "Generator Soal",
      description: "Buat soal dan pembahasan",
      icon: ListChecks,
      active: pathname.startsWith("/app/soal"),
    },
    {
      to: "/app/rkp",
      label: "Generator RKP",
      description: "RKP harian PAUD/TK",
      icon: Sparkles,
      active: pathname.startsWith("/app/rkp"),
    },
    {
      to: "/app/riwayat",
      label: "Riwayat Dokumen",
      description: "Arsip hasil generate",
      icon: History,
      active: pathname.startsWith("/app/riwayat"),
    },
  ] as const;

  const activeItem = navigationItems.find((item) => item.active) ?? navigationItems[0];

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="p-3">
          <Link
            to="/app"
            className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-3 transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Guru AI</p>
              <p className="truncate text-xs text-sidebar-foreground/70">Workspace guru yang lebih rapi</p>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigasi Utama</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={item.active} tooltip={item.label} size="lg">
                        <Link to={item.to}>
                          <Icon className="h-4 w-4" />
                          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <div className="truncate font-medium">{item.label}</div>
                            <div className="truncate text-xs text-sidebar-foreground/70">{item.description}</div>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs uppercase tracking-wide text-sidebar-foreground/70">Kode aktif</p>
            <p className="mt-1 truncate text-sm font-semibold">{session.codeLabel ?? session.code}</p>
            <p className="mt-1 text-xs text-sidebar-foreground/70">Gunakan menu samping untuk pindah generator dengan cepat.</p>
          </div>

          <div className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Kembali ke Beranda">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali ke Beranda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <Button variant="ghost" className="justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
            </Button>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight">{activeItem.label}</p>
                <p className="truncate text-sm text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>

            <div className="hidden rounded-xl border border-border bg-card px-3 py-2 text-right shadow-sm sm:block">
              <p className="text-xs text-muted-foreground">Akses aktif</p>
              <p className="max-w-52 truncate text-sm font-medium">{session.codeLabel ?? session.code}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

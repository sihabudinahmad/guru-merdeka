import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Copy, Check, Trash2, RefreshCw, KeyRound, Users, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  listAccessCodes,
  createAccessCode,
  setAccessCodeActive,
  resetDevices,
  deleteAccessCode,
  adminStats,
} from "@/server/admin.functions";
import { callWithAuth } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Panel Admin — Guru AI" }],
  }),
  component: AdminPanel,
});

type CodeRow = {
  id: string;
  code: string;
  label: string | null;
  max_devices: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  devices_used: number;
  generations_count: number;
};

type Stats = { total_codes: number; active_codes: number; devices: number; generations: number };

function AdminPanel() {
  const [items, setItems] = useState<CodeRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        callWithAuth(listAccessCodes, undefined as never),
        callWithAuth(adminStats, undefined as never),
      ]);
      if (list.ok) setItems(list.items as CodeRow[]);
      else toast.error(list.error);
      if (st.ok) setStats(st.stats);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengelolaan Kode Akses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat, nonaktifkan, atau reset perangkat untuk setiap kode guru.
          </p>
        </div>
        <CreateCodeDialog onCreated={refresh} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<KeyRound className="h-4 w-4" />} label="Total Kode" value={stats?.total_codes ?? "—"} />
        <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Aktif" value={stats?.active_codes ?? "—"} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Perangkat" value={stats?.devices ?? "—"} />
        <StatCard icon={<FileText className="h-4 w-4" />} label="Dokumen" value={stats?.generations ?? "—"} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Daftar Kode</h2>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {loading && !items ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat…
          </div>
        ) : !items?.length ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Belum ada kode. Klik <b>Buat Kode</b> untuk menambah.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((row) => (
              <CodeRowItem key={row.id} row={row} onChanged={refresh} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function CodeRowItem({ row, onChanged }: { row: CodeRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const expired = row.expires_at && new Date(row.expires_at).getTime() < Date.now();

  const copy = async () => {
    await navigator.clipboard.writeText(row.code);
    setCopied(true);
    toast.success("Kode disalin.");
    setTimeout(() => setCopied(false), 1500);
  };

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const r = await callWithAuth(setAccessCodeActive, { id: row.id, is_active: next });
      if (r.ok) {
        toast.success(next ? "Kode diaktifkan." : "Kode dinonaktifkan.");
        onChanged();
      } else toast.error(r.error);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const r = await callWithAuth(resetDevices, { id: row.id });
      if (r.ok) {
        toast.success("Perangkat direset.");
        onChanged();
      } else toast.error(r.error);
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const r = await callWithAuth(deleteAccessCode, { id: row.id });
      if (r.ok) {
        toast.success("Kode dihapus.");
        onChanged();
      } else toast.error(r.error);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold">{row.code}</code>
          <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {!row.is_active && (
            <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Nonaktif
            </span>
          )}
          {expired && (
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              Kedaluwarsa
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.label || "Tanpa label"} · {row.devices_used}/{row.max_devices} perangkat ·{" "}
          {row.generations_count} dokumen ·{" "}
          {row.expires_at
            ? `Berakhir ${new Date(row.expires_at).toLocaleDateString("id-ID")}`
            : "Tanpa kedaluwarsa"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Switch checked={row.is_active} onCheckedChange={toggle} disabled={busy} />
          <span className="text-xs text-muted-foreground">Aktif</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)} disabled={busy}>
          <RefreshCw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset perangkat?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua perangkat yang sudah login akan dihapus dan sesi aktif dicabut. Guru bisa login ulang
              dari perangkat baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Ya, reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kode {row.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen. Riwayat dokumen pada kode ini juga akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function CreateCodeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [maxDevices, setMaxDevices] = useState(2);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setLabel("");
    setCode("");
    setMaxDevices(2);
    setExpiresAt("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await callWithAuth(createAccessCode, {
        code: code.trim() || undefined,
        label: label.trim() || undefined,
        max_devices: maxDevices,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Kode ${res.item?.code} dibuat.`);
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat kode.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Buat Kode
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Kode Akses Baru</DialogTitle>
          <DialogDescription>
            Kosongkan field <b>kode</b> agar dibuat otomatis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label (opsional)</Label>
            <Input
              id="label"
              placeholder="Mis: SD Sabat — Bu Sari"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={120}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Kode (opsional)</Label>
            <Input
              id="code"
              placeholder="GURU-AB12-3456 (otomatis bila kosong)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={64}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="max">Maks Perangkat</Label>
              <Input
                id="max"
                type="number"
                min={1}
                max={20}
                value={maxDevices}
                onChange={(e) => setMaxDevices(Number(e.target.value) || 1)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp">Kedaluwarsa (opsional)</Label>
              <Input
                id="exp"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Buat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  BrainCircuit,
  Check,
  Copy,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  listAccessCodes,
  createAccessCode,
  setAccessCodeActive,
  resetDevices,
  deleteAccessCode,
  adminStats,
  getAiSettings,
  saveAiSettings,
  testAiConnection,
  listAvailableModels,
} from "@/functions/admin.functions";
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

type ModelTier = "free" | "paid";

type AiModelOption = {
  id: string;
  label: string;
  tier: ModelTier;
  description: string;
  enabled: boolean;
};

type AiSettings = {
  providerLabel: string;
  apiBaseUrl: string;
  apiKey: string;
  activeModel: string;
  activeTier: ModelTier;
  modelCatalog: AiModelOption[];
  isEnabled: boolean;
  updatedAt?: string;
};

type EditableAiModelOption = AiModelOption & { clientId: string };

function makeClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function withClientIds(items: AiModelOption[]): EditableAiModelOption[] {
  return items.map((item) => ({ ...item, clientId: makeClientId() }));
}

function AdminPanel() {
  const [items, setItems] = useState<CodeRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [list, st, ai] = await Promise.allSettled([
        callWithAuth(listAccessCodes, undefined as never),
        callWithAuth(adminStats, undefined as never),
        callWithAuth(getAiSettings, undefined as never),
      ]);

      if (list.status === "fulfilled") {
        if (list.value.ok) setItems(list.value.items as CodeRow[]);
        else toast.error(list.value.error || "Gagal memuat kode akses");
      } else {
        console.error("List codes error:", list.reason);
        toast.error("Gagal memuat daftar kode akses.");
      }

      if (st.status === "fulfilled") {
        if (st.value.ok) setStats(st.value.stats);
        else toast.error("Gagal memuat statistik admin.");
      } else {
        console.error("Stats error:", st.reason);
      }

      if (ai.status === "fulfilled") {
        if (ai.value.ok) setAiSettings(ai.value.settings as AiSettings);
        else toast.error(("error" in ai.value && (ai.value as { error?: string }).error) || "Gagal memuat konfigurasi AI");
      } else {
        console.error("AI settings error:", ai.reason);
      }
    } catch (err) {
      console.error("Refresh error:", err);
      toast.error("Gagal memperbarui data admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <section id="konfigurasi-ai" className="scroll-mt-24">
        <AiSettingsCard settings={aiSettings} loading={loading && !aiSettings} onSaved={refresh} />
      </section>

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

      <div id="kode-akses" className="scroll-mt-24 rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
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

function AiSettingsCard({
  settings,
  loading,
  onSaved,
}: {
  settings: AiSettings | null;
  loading: boolean;
  onSaved: () => void;
}) {
  const [providerLabel, setProviderLabel] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [activeModel, setActiveModel] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [modelCatalog, setModelCatalog] = useState<EditableAiModelOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; message: string; elapsedMs?: number } | { ok: false; error: string; elapsedMs?: number } | null
  >(null);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(errorMessage)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const withRetry = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
  ): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  };

  useEffect(() => {
    if (!settings) return;
    setProviderLabel(settings.providerLabel);
    setApiBaseUrl(settings.apiBaseUrl);
    setApiKey(settings.apiKey);
    setActiveModel(settings.activeModel);
    setIsEnabled(settings.isEnabled);
    setModelCatalog(withClientIds(settings.modelCatalog));
    setTestResult(null);
  }, [settings]);

  const enabledModels = modelCatalog.filter((item) => item.enabled && item.id.trim() && item.label.trim());
  const selectedModel = enabledModels.find((item) => item.id === activeModel) ?? enabledModels[0] ?? null;

  useEffect(() => {
    if (!enabledModels.length) return;
    if (!enabledModels.some((item) => item.id === activeModel)) {
      setActiveModel(enabledModels[0].id);
    }
  }, [activeModel, enabledModels]);

  const updateModelRow = (clientId: string, patch: Partial<EditableAiModelOption>) => {
    setModelCatalog((current) => current.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)));
  };

  const removeModelRow = (clientId: string) => {
    setModelCatalog((current) => current.filter((item) => item.clientId !== clientId));
  };

  const addModelRow = () => {
    setModelCatalog((current) => [
      ...current,
      {
        clientId: makeClientId(),
        id: "",
        label: "",
        tier: "free",
        description: "",
        enabled: true,
      },
    ]);
  };

  const handleTestConnection = async () => {
    const nextActiveModel =
      modelCatalog.find((item) => item.id.trim() === activeModel && item.enabled)?.id.trim() ??
      modelCatalog.find((item) => item.enabled && item.id.trim())?.id.trim() ??
      "";

    if (!providerLabel.trim()) {
      toast.error("Nama provider wajib diisi.");
      return;
    }

    if (!apiBaseUrl.trim()) {
      toast.error("URL endpoint AI wajib diisi.");
      return;
    }

    if (!apiKey.trim()) {
      toast.error("API key wajib diisi sebelum test connection.");
      return;
    }

    if (!nextActiveModel) {
      toast.error("Pilih atau aktifkan minimal satu model terlebih dahulu.");
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await withRetry(
        async () =>
          withTimeout(
            callWithAuth(testAiConnection, {
              apiBaseUrl: apiBaseUrl.trim(),
              apiKey: apiKey.trim(),
              model: nextActiveModel,
              providerLabel: providerLabel.trim() || "AI Gateway",
            }),
            20000,
            "Test connection timeout.",
          ),
        2,
      );

      if (res.ok) {
        setTestResult({ ok: true, message: res.message, elapsedMs: res.elapsedMs });
        toast.success("Test connection berhasil.");
      } else {
        setTestResult({ ok: false, error: res.error, elapsedMs: res.elapsedMs });
        toast.error("Test connection gagal: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Test connection error:", err);
      const errorMsg = err instanceof Error ? err.message : "Gagal menjalankan test connection.";
      setTestResult({ ok: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchModels = async () => {
    if (!apiBaseUrl.trim()) {
      toast.error("URL endpoint AI wajib diisi terlebih dahulu.");
      return;
    }

    if (!apiKey.trim()) {
      toast.error("API key wajib diisi terlebih dahulu.");
      return;
    }

    setFetchingModels(true);
    try {
      const res = await withRetry(
        async () =>
          withTimeout(
            callWithAuth(listAvailableModels, {
              apiBaseUrl: apiBaseUrl.trim(),
              apiKey: apiKey.trim(),
            }),
            10000,
            "Fetch models timeout.",
          ),
        2,
      );

      if (!res.ok) {
        toast.error("Gagal fetch models: " + (res.error || "Unknown error"));
        return;
      }

      if (!res.models || res.models.length === 0) {
        toast.info("Tidak ada model tersedia dari provider.");
        return;
      }

      // Create model options from available models
      const newModels: EditableAiModelOption[] = res.models.map((model: any) => ({
        clientId: makeClientId(),
        id: String(model.id || ""),
        label: String(model.name || model.id || ""),
        tier: "free" as const,
        description: `Model dari provider: ${model.id}`,
        enabled: true,
      }));

      setModelCatalog(newModels);
      if (newModels.length > 0) {
        setActiveModel(newModels[0].id);
      }
      toast.success(`Berhasil fetch ${res.models.length} model dari provider.`);
    } catch (err) {
      console.error("Fetch models error:", err);
      const errorMsg = err instanceof Error ? err.message : "Gagal fetch models.";
      toast.error(errorMsg);
    } finally {
      setFetchingModels(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCatalog = modelCatalog
      .map((item) => ({
        id: item.id.trim(),
        label: item.label.trim(),
        tier: item.tier,
        description: item.description.trim(),
        enabled: item.enabled,
      }))
      .filter((item) => item.id && item.label);

    if (!normalizedCatalog.length) {
      toast.error("Tambahkan minimal satu model AI.");
      return;
    }

    if (!normalizedCatalog.some((item) => item.enabled)) {
      toast.error("Minimal satu model harus diaktifkan.");
      return;
    }

    const nextActiveModel =
      normalizedCatalog.find((item) => item.id === activeModel && item.enabled)?.id ??
      normalizedCatalog.find((item) => item.enabled)?.id ??
      "";

    if (!nextActiveModel) {
      toast.error("Pilih model aktif untuk generation.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await withRetry(
        async () =>
          withTimeout(
            callWithAuth(saveAiSettings, {
              providerLabel: providerLabel.trim(),
              apiBaseUrl: apiBaseUrl.trim(),
              apiKey: apiKey.trim(),
              activeModel: nextActiveModel,
              modelCatalog: normalizedCatalog,
              isEnabled,
            }),
            15000,
            "Simpan konfigurasi timeout.",
          ),
        2,
      );

      if (!res.ok) {
        toast.error(res.error || "Gagal menyimpan");
        return;
      }

      toast.success("Konfigurasi AI berhasil disimpan.");
      onSaved();
    } catch (err) {
      console.error("Save config error:", err);
      const errorMsg = err instanceof Error ? err.message : "Gagal menyimpan konfigurasi AI.";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Konfigurasi AI</h2>
              <p className="text-sm text-muted-foreground">
                Atur API key, endpoint, dan model aktif. Hanya admin yang bisa mengubah pengaturan ini.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border px-3 py-2 text-right text-xs text-muted-foreground">
          <div>Status layanan</div>
          <div className="mt-1 font-semibold text-foreground">{isEnabled ? "Aktif" : "Nonaktif"}</div>
        </div>
      </div>

      {loading && !settings ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat konfigurasi AI…
        </div>
      ) : !settings ? (
        <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Konfigurasi AI belum tersedia.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="providerLabel">Nama Provider / Gateway</Label>
              <Input
                id="providerLabel"
                value={providerLabel}
                onChange={(e) => setProviderLabel(e.target.value)}
                placeholder="Mis. Lovable AI Gateway"
                disabled={submitting}
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiBaseUrl">URL Endpoint AI</Label>
              <Input
                id="apiBaseUrl"
                type="url"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://.../v1/chat/completions"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Masukkan API key provider AI"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Simpan key di panel admin supaya model gratis atau berbayar bisa diganti tanpa deploy ulang.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} disabled={submitting} />
              <div>
                <p className="text-sm font-medium">AI aktif</p>
                <p className="text-xs text-muted-foreground">Matikan sementara jika ingin pause generation.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Katalog Model</h3>
                <p className="text-sm text-muted-foreground">
                  Tambahkan beberapa model lalu pilih model aktif. Tier membantu admin membedakan versi free atau paid.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addModelRow} disabled={submitting}>
                <Plus className="h-4 w-4" />
                Tambah Model
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {modelCatalog.map((item, index) => (
                <div key={item.clientId} className="rounded-xl border border-border bg-card p-4">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_180px_auto] lg:items-start">
                    <div className="space-y-2">
                      <Label htmlFor={`model-label-${item.clientId}`}>Label Model</Label>
                      <Input
                        id={`model-label-${item.clientId}`}
                        value={item.label}
                        onChange={(e) => updateModelRow(item.clientId, { label: e.target.value })}
                        placeholder={`Model ${index + 1}`}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`model-id-${item.clientId}`}>Model ID</Label>
                      <Input
                        id={`model-id-${item.clientId}`}
                        value={item.id}
                        onChange={(e) => updateModelRow(item.clientId, { id: e.target.value })}
                        placeholder="google/gemini-2.5-flash"
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tier</Label>
                      <Select
                        value={item.tier}
                        onValueChange={(value: ModelTier) => updateModelRow(item.clientId, { tier: value })}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-7 lg:justify-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(checked) => updateModelRow(item.clientId, { enabled: checked })}
                          disabled={submitting}
                        />
                        <span className="text-xs text-muted-foreground">Aktif</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeModelRow(item.clientId)}
                        disabled={submitting || modelCatalog.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`model-desc-${item.clientId}`}>Catatan / penggunaan</Label>
                    <Textarea
                      id={`model-desc-${item.clientId}`}
                      value={item.description}
                      onChange={(e) => updateModelRow(item.clientId, { description: e.target.value })}
                      placeholder="Contoh: hemat biaya untuk traffic tinggi"
                      disabled={submitting}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
            <div className="space-y-2">
              <Label>Model Aktif</Label>
              <Select value={selectedModel?.id ?? ""} onValueChange={setActiveModel} disabled={submitting || !enabledModels.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih model aktif" />
                </SelectTrigger>
                <SelectContent>
                  {enabledModels.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label} — {item.tier === "free" ? "Free" : "Paid"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border px-4 py-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tier aktif</p>
              <p className="mt-1 font-semibold">{selectedModel ? (selectedModel.tier === "free" ? "Free" : "Paid") : "—"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {settings.updatedAt
                ? `Terakhir diperbarui ${new Date(settings.updatedAt).toLocaleString("id-ID")}`
                : "Belum pernah diperbarui."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchModels}
                disabled={submitting || fetchingModels}
              >
                {fetchingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Fetch Models
              </Button>
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={submitting || testingConnection}>
                {testingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                Test Connection
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Konfigurasi AI
              </Button>
            </div>
          </div>

          {testResult && (
            <div
              className={
                testResult.ok
                  ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
                  : "rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
              <p className="font-medium">{testResult.ok ? "Koneksi berhasil" : "Koneksi gagal"}</p>
              <p className="mt-1">{testResult.ok ? testResult.message : testResult.error}</p>
              {typeof testResult.elapsedMs === "number" && (
                <p className="mt-1 text-xs opacity-80">Waktu respons: {testResult.elapsedMs} ms</p>
              )}
            </div>
          )}
        </form>
      )}
    </section>
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAiSettingsRecord,
  normalizeModelCatalog,
  resolveActiveModel,
  serializeModelCatalog,
} from "@/lib/ai-settings.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) {
    throw new Response("Forbidden: bukan admin.", { status: 403 });
  }
}

// ---------------- Bootstrap (one-time): claim admin role ----------------
const ClaimInput = z.object({ secret: z.string().min(8).max(200) });
export const claimAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClaimInput.parse(d))
  .handler(async ({ data, context }) => {
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected) {
      return { ok: false as const, error: "ADMIN_BOOTSTRAP_SECRET belum diatur." };
    }
    if (data.secret !== expected) {
      return { ok: false as const, error: "Secret salah." };
    }
    const userId = context.userId;
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) return { ok: false as const, error: "Gagal menambahkan role." };
    return { ok: true as const };
  });

// ---------------- Check own admin role ----------------
export const isAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { ok: true as const, isAdmin: !!data };
  });

// ---------------- List access codes with usage ----------------
export const listAccessCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: codes, error } = await supabaseAdmin
      .from("access_codes")
      .select("id, code, label, max_devices, expires_at, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) return { ok: false as const, error: "Gagal memuat kode." };

    const ids = (codes ?? []).map((c) => c.id);
    const usage: Record<string, { devices: number; generations: number }> = {};
    if (ids.length) {
      const [{ data: dev }, { data: gen }] = await Promise.all([
        supabaseAdmin.from("code_devices").select("code_id").in("code_id", ids),
        supabaseAdmin.from("generations").select("code_id").in("code_id", ids),
      ]);
      ids.forEach((id) => (usage[id] = { devices: 0, generations: 0 }));
      (dev ?? []).forEach((r) => (usage[r.code_id].devices += 1));
      (gen ?? []).forEach((r) => (usage[r.code_id].generations += 1));
    }
    return {
      ok: true as const,
      items: (codes ?? []).map((c) => ({
        ...c,
        devices_used: usage[c.id]?.devices ?? 0,
        generations_count: usage[c.id]?.generations ?? 0,
      })),
    };
  });

// ---------------- Create access code ----------------
function randomCode(prefix = "GURU") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let mid = "";
  for (let i = 0; i < 4; i++) mid += chars[Math.floor(Math.random() * chars.length)];
  let tail = "";
  for (let i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${mid}-${tail}`;
}

const CreateInput = z.object({
  code: z.string().trim().min(4).max(64).optional(),
  label: z.string().trim().max(120).optional().default(""),
  max_devices: z.number().int().min(1).max(20).default(2),
  expires_at: z.string().datetime().optional().nullable(),
});
export const createAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const code = (data.code?.trim() || randomCode()).toUpperCase();
    const { data: row, error } = await supabaseAdmin
      .from("access_codes")
      .insert({
        code,
        label: data.label || null,
        max_devices: data.max_devices,
        expires_at: data.expires_at ?? null,
        is_active: true,
      })
      .select("id, code, label, max_devices, expires_at, is_active, created_at")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { ok: false as const, error: "Kode sudah dipakai. Coba kode lain." };
      }
      return { ok: false as const, error: "Gagal membuat kode." };
    }
    return { ok: true as const, item: row };
  });

const CreateBulkInput = z.object({
  count: z.number().int().min(1).max(200),
  label: z.string().trim().max(120).optional().default(""),
  max_devices: z.number().int().min(1).max(20).default(2),
  expires_at: z.string().datetime().optional().nullable(),
});

export const createAccessCodesBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateBulkInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const requiredCount = data.count;
    const finalCodes: string[] = [];
    const seen = new Set<string>();
    let attempts = 0;

    while (finalCodes.length < requiredCount && attempts < 10) {
      const draftCount = Math.max((requiredCount - finalCodes.length) * 3, 20);
      const draft = new Set<string>();

      while (draft.size < draftCount) {
        const code = randomCode();
        if (!seen.has(code)) {
          seen.add(code);
          draft.add(code);
        }
      }

      const draftList = Array.from(draft);
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from("access_codes")
        .select("code")
        .in("code", draftList);

      if (existingErr) {
        return { ok: false as const, error: "Gagal memvalidasi kode unik." };
      }

      const existingSet = new Set((existing ?? []).map((row) => row.code));
      for (const code of draftList) {
        if (!existingSet.has(code)) {
          finalCodes.push(code);
          if (finalCodes.length >= requiredCount) break;
        }
      }

      attempts += 1;
    }

    if (finalCodes.length < requiredCount) {
      return { ok: false as const, error: "Gagal menghasilkan kode unik. Coba lagi." };
    }

    const payload = finalCodes.map((code) => ({
      code,
      label: data.label || null,
      max_devices: data.max_devices,
      expires_at: data.expires_at ?? null,
      is_active: true,
    }));

    const { data: rows, error } = await supabaseAdmin
      .from("access_codes")
      .insert(payload)
      .select("id, code, label, max_devices, expires_at, is_active, created_at");

    if (error) {
      return { ok: false as const, error: "Gagal membuat kode massal." };
    }

    return { ok: true as const, count: rows?.length ?? 0, items: rows ?? [] };
  });

// ---------------- Toggle active ----------------
const ToggleInput = z.object({ id: z.string().uuid(), is_active: z.boolean() });
export const setAccessCodeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const updates: { is_active: boolean } = { is_active: data.is_active };
    const { error } = await supabaseAdmin
      .from("access_codes")
      .update(updates)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: "Gagal memperbarui kode." };
    if (!data.is_active) {
      // revoke active sessions when deactivating
      await supabaseAdmin
        .from("code_sessions")
        .update({ revoked: true })
        .eq("code_id", data.id);
    }
    return { ok: true as const };
  });

// ---------------- Reset devices ----------------
const ResetInput = z.object({ id: z.string().uuid() });
export const resetDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResetInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabaseAdmin.from("code_devices").delete().eq("code_id", data.id),
      supabaseAdmin.from("code_sessions").update({ revoked: true }).eq("code_id", data.id),
    ]);
    if (e1 || e2) return { ok: false as const, error: "Gagal mereset perangkat." };
    return { ok: true as const };
  });

// ---------------- Delete code ----------------
const DeleteInput = z.object({ id: z.string().uuid() });
export const deleteAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DeleteInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Clean dependents first
    await Promise.all([
      supabaseAdmin.from("code_sessions").delete().eq("code_id", data.id),
      supabaseAdmin.from("code_devices").delete().eq("code_id", data.id),
      supabaseAdmin.from("generations").delete().eq("code_id", data.id),
    ]);
    const { error } = await supabaseAdmin.from("access_codes").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "Gagal menghapus kode." };
    return { ok: true as const };
  });

// ---------------- Stats summary ----------------
export const adminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [codes, activeCodes, devices, gens] = await Promise.all([
      supabaseAdmin.from("access_codes").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("access_codes")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin.from("code_devices").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("generations").select("id", { count: "exact", head: true }),
    ]);
    return {
      ok: true as const,
      stats: {
        total_codes: codes.count ?? 0,
        active_codes: activeCodes.count ?? 0,
        devices: devices.count ?? 0,
        generations: gens.count ?? 0,
      },
    };
  });

const AiModelOptionInput = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  tier: z.enum(["free", "paid"]),
  description: z.string().trim().max(240).optional().default(""),
  enabled: z.boolean().optional().default(true),
});

export const getAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const settings = await getAiSettingsRecord();
    return { ok: true as const, settings };
  });

const SaveAiSettingsInput = z.object({
  providerLabel: z.string().trim().min(1).max(80),
  apiBaseUrl: z.string().trim().url().max(255),
  apiKey: z.string().trim().max(400).optional().default(""),
  activeModel: z.string().trim().min(1).max(120),
  modelCatalog: z.array(AiModelOptionInput).min(1).max(30),
  isEnabled: z.boolean().default(true),
});

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveAiSettingsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const modelCatalog = normalizeModelCatalog(data.modelCatalog);
    const activeModel = resolveActiveModel(data.activeModel, modelCatalog);

    if (!modelCatalog.some((item) => item.enabled)) {
      return { ok: false as const, error: "Minimal satu model harus aktif." };
    }

    if (!modelCatalog.some((item) => item.id === activeModel.id && item.enabled)) {
      return { ok: false as const, error: "Model aktif harus tersedia dan diaktifkan." };
    }

    const payload = {
      id: "default",
      provider_label: data.providerLabel,
      api_base_url: data.apiBaseUrl,
      api_key: data.apiKey,
      active_model: activeModel.id,
      active_tier: activeModel.tier,
      model_catalog: serializeModelCatalog(modelCatalog),
      is_enabled: data.isEnabled,
    };

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

    let error: { message?: string } | null = null;
    try {
      const result = await withTimeout<{ error: { message?: string } | null }>(
        Promise.resolve(supabaseAdmin.from("ai_settings").upsert(payload, { onConflict: "id" })),
        10000,
        "Timeout saat menyimpan ke database.",
      );
      error = result.error;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal menyimpan konfigurasi AI.";
      return { ok: false as const, error: message };
    }

    if (error) {
      return { ok: false as const, error: "Gagal menyimpan konfigurasi AI." };
    }

    const settings = await withTimeout(
      getAiSettingsRecord(),
      10000,
      "Timeout saat memuat ulang konfigurasi AI.",
    );
    return { ok: true as const, settings };
  });

const TestAiConnectionInput = z.object({
  apiBaseUrl: z.string().trim().url().max(255),
  apiKey: z.string().trim().min(1).max(400),
  model: z.string().trim().min(1).max(120),
  providerLabel: z.string().trim().max(80).optional().default("AI Gateway"),
});

export const testAiConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TestAiConnectionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(data.apiBaseUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${data.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: data.model,
          messages: [
            {
              role: "system",
              content: "Balas singkat dengan kata CONNECTED untuk menguji koneksi.",
            },
            {
              role: "user",
              content: "Tes koneksi admin.",
            },
          ],
          max_tokens: 10,
          temperature: 0,
        }),
      });

      const elapsedMs = Date.now() - startedAt;
      const rawText = await res.text().catch(() => "");
      let parsedBody: unknown = null;

      if (rawText) {
        try {
          parsedBody = JSON.parse(rawText);
        } catch {
          parsedBody = rawText;
        }
      }

      if (!res.ok) {
        const detail =
          typeof parsedBody === "string"
            ? parsedBody.slice(0, 220)
            : parsedBody && typeof parsedBody === "object" && "error" in parsedBody
              ? JSON.stringify(parsedBody).slice(0, 220)
              : `HTTP ${res.status}`;

        return {
          ok: false as const,
          error: `Koneksi gagal (${res.status}). ${detail}`,
          status: res.status,
          elapsedMs,
        };
      }

      return {
        ok: true as const,
        message: `Koneksi ke ${data.providerLabel} berhasil. Model ${data.model} merespons normal.`,
        status: res.status,
        elapsedMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Permintaan gagal.";
      return {
        ok: false as const,
        error:
          message === "This operation was aborted"
            ? "Waktu koneksi habis. Periksa URL endpoint atau respons provider terlalu lama."
            : `Tidak dapat terhubung ke provider AI. ${message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  });

// -------- List available AI models from provider --------
const ListModelsInput = z.object({
  apiBaseUrl: z.string().trim().url().max(255),
  apiKey: z.string().trim().min(1).max(400),
});

export const listAvailableModels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListModelsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    try {
      // Determine base URL for models endpoint
      let modelsUrl = data.apiBaseUrl;
      
      // If endpoint is /chat/completions, replace with /models
      if (modelsUrl.includes("/chat/completions")) {
        modelsUrl = modelsUrl.replace("/chat/completions", "/models");
      } else if (!modelsUrl.includes("/models")) {
        // Append /models if not already present
        modelsUrl = modelsUrl.replace(/\/+$/, "") + "/models";
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(modelsUrl, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${data.apiKey}`,
            "Content-Type": "application/json",
          },
        });

        const rawText = await res.text().catch(() => "");
        let parsedBody: unknown = null;

        if (rawText) {
          try {
            parsedBody = JSON.parse(rawText);
          } catch {
            // Ignore parse errors
          }
        }

        if (!res.ok) {
          return {
            ok: false as const,
            error: `Gagal fetch models (HTTP ${res.status})`,
            models: [] as { id: string; name: string }[],
          };
        }

        // Extract model list from response
        // Blackbox API response format: { data: [ { id: "model-name", ... } ] }
        let models: { id: string; name: string }[] = [];
        if (parsedBody && typeof parsedBody === "object") {
          const dataArray = ("data" in parsedBody && Array.isArray(parsedBody.data))
            ? parsedBody.data
            : Array.isArray(parsedBody)
              ? parsedBody
              : [];

          models = dataArray
            .filter((item: unknown) => item && typeof item === "object" && "id" in item)
            .map((item: any) => ({
              id: String(item.id || ""),
              name: String(item.name || item.id || ""),
            }))
            .filter((item) => item.id);
        }

        return {
          ok: true as const,
          models,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Permintaan gagal.";
      return {
        ok: false as const,
        error: `Tidak dapat fetch models. ${message}`,
        models: [] as { id: string; name: string }[],
      };
    }
  });

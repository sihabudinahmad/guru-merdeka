import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

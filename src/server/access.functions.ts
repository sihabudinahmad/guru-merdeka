import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RedeemInput = z.object({
  code: z.string().trim().min(4).max(64),
  deviceFingerprint: z.string().trim().min(8).max(128),
});

const VerifyInput = z.object({
  token: z.string().trim().min(16).max(256),
});

function genToken() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const redeemAccessCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RedeemInput.parse(d))
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const { data: ac, error: acErr } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (acErr) throw new Error("Gagal memvalidasi kode.");
    if (!ac || !ac.is_active) {
      return { ok: false as const, error: "Kode tidak ditemukan atau dinonaktifkan." };
    }
    if (ac.expires_at && new Date(ac.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "Kode sudah kedaluwarsa." };
    }

    // Existing device?
    const { data: existing } = await supabaseAdmin
      .from("code_devices")
      .select("id")
      .eq("code_id", ac.id)
      .eq("device_fingerprint", data.deviceFingerprint)
      .maybeSingle();

    if (!existing) {
      const { count } = await supabaseAdmin
        .from("code_devices")
        .select("id", { count: "exact", head: true })
        .eq("code_id", ac.id);
      if ((count ?? 0) >= ac.max_devices) {
        return {
          ok: false as const,
          error: `Kode sudah dipakai di ${ac.max_devices} perangkat. Tidak bisa login di perangkat baru.`,
        };
      }
      const { error: insErr } = await supabaseAdmin.from("code_devices").insert({
        code_id: ac.id,
        device_fingerprint: data.deviceFingerprint,
      });
      if (insErr) throw new Error("Gagal mendaftarkan perangkat.");
    } else {
      await supabaseAdmin
        .from("code_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    const token = genToken();
    const { error: sessErr } = await supabaseAdmin.from("code_sessions").insert({
      code_id: ac.id,
      device_fingerprint: data.deviceFingerprint,
      session_token: token,
    });
    if (sessErr) throw new Error("Gagal membuat sesi.");

    return {
      ok: true as const,
      token,
      code: ac.code,
      label: ac.label as string | null,
    };
  });

export const verifySession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data }) => {
    const { data: sess } = await supabaseAdmin
      .from("code_sessions")
      .select("id, code_id, expires_at, revoked, access_codes(code, label, is_active)")
      .eq("session_token", data.token)
      .maybeSingle();
    if (!sess || sess.revoked) return { ok: false as const };
    if (new Date(sess.expires_at).getTime() < Date.now()) return { ok: false as const };
    const ac = sess.access_codes as unknown as { code: string; label: string | null; is_active: boolean } | null;
    if (!ac || !ac.is_active) return { ok: false as const };
    return {
      ok: true as const,
      codeId: sess.code_id,
      code: ac.code as string,
      label: (ac.label as string | null) ?? null,
    };
  });

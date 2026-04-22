// Lightweight client-side helpers for the access-code session.
const SESSION_KEY = "guru.session.v1";
const FP_KEY = "guru.fp.v1";

export type LocalSession = {
  token: string;
  codeLabel: string | null;
  code: string;
};

export function getSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: LocalSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** Stable-ish device fingerprint: hash of UA + timezone + screen. */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "ssr";
  const cached = localStorage.getItem(FP_KEY);
  if (cached) return cached;
  const parts = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    navigator.hardwareConcurrency ?? "",
  ].join("|");
  const buf = new TextEncoder().encode(parts);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  localStorage.setItem(FP_KEY, hex);
  return hex;
}

import { supabase } from "@/integrations/supabase/client";

/** Get current Supabase session token, or null. */
export async function getAdminAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Call a TanStack Start server function that requires a Bearer token,
 * passing the current Supabase access token as Authorization header.
 *
 * Usage:
 *   await callWithAuth(listAccessCodes, undefined);
 *   await callWithAuth(createAccessCode, { label: "..." });
 */
export async function callWithAuth<TIn, TOut>(
  fn: (opts: { data: TIn; headers?: HeadersInit }) => Promise<TOut>,
  data: TIn,
): Promise<TOut> {
  const token = await getAdminAccessToken();
  if (!token) throw new Error("Belum login admin.");
  return fn({ data, headers: { Authorization: `Bearer ${token}` } });
}

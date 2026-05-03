import { supabase } from "@/integrations/supabase/client";

/** Retry logic untuk transient failures */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTransient = 
        lastError.message?.includes("ECONNREFUSED") ||
        lastError.message?.includes("ETIMEDOUT") ||
        lastError.message?.includes("temporarily") ||
        lastError.message?.includes("timeout") ||
        false;
      
      if (!isTransient) throw lastError;
      
      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

/** Get current Supabase session token with retry logic */
export async function getAdminAccessToken(): Promise<string | null> {
  return retryWithBackoff(async () => {
    const { data } = await supabase.auth.getSession();
    let session = data.session;

    // Fallback: attempt refresh once if session is missing/expired on client side
    if (!session) {
      try {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session ?? null;
      } catch (refreshErr) {
        console.warn("Session refresh failed in getAdminAccessToken", refreshErr);
      }
    }

    return session?.access_token ?? null;
  }, 2, 300);
}

/**
 * Call a TanStack Start server function with auth and retry logic.
 * Includes exponential backoff for transient failures.
 */
export async function callWithAuth<TIn, TOut>(
  fn: (opts: { data: TIn; headers?: HeadersInit }) => Promise<TOut>,
  data: TIn,
): Promise<TOut> {
  return retryWithBackoff(async () => {
    const token = await getAdminAccessToken();
    if (!token) throw new Error("Belum login admin.");
    return fn({ data, headers: { Authorization: `Bearer ${token}` } });
  }, 2, 300);
}

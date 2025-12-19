import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User, AuthError } from "@supabase/supabase-js";
import { cache } from "react";
import { logger } from "@/lib/logger";

// Server Component client (read-only cookies)
export async function createRSCClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    logger.error("Supabase env vars missing", { hasUrl: !!url, hasAnon: !!anon });
    const stub = {
      auth: {
        async getUser(): Promise<{ data: { user: User | null }; error: AuthError | null }> {
          return { data: { user: null }, error: null };
        },
      },
    } as unknown as SupabaseClient;
    return stub;
  }
  const store = await cookies();
  
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set() {
        // No-op in RSC (read-only context)
      },
      remove() {
        // No-op in RSC (read-only context)
      },
    },
  });
}

// Route Handler / Server Action client (read-write cookies)
export async function createRouteClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase env vars are not configured");
  }
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          store.set({ name, value, ...options });
        } catch {
          // Ignore cookie errors in RSC context
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          store.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // Ignore cookie errors in RSC context
        }
      },
    },
  });
}

/**
 * Cached user retrieval for RSC to prevent rate limiting
 */
export const getCachedUser = cache(async () => {
  const supabase = await createRSCClient();
  return supabase.auth.getUser();
});

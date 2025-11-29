import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User, AuthError } from "@supabase/supabase-js";
import { cache } from "react";

// Server Component client (read-only cookies)
export async function createRSCClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("❌ Supabase env vars missing! URL:", !!url, "ANON:", !!anon);
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
      // No-op writes in RSC
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      set(_name: string, _value: string, _options: CookieOptions) {},
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      remove(_name: string, _options: CookieOptions) {},
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

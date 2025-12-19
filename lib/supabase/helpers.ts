import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient, User, AuthError } from "@supabase/supabase-js";

// Re-export singleton admin client from dedicated module
export { createAdminClient } from "./admin";

// Use in Server Components (read-only cookies context)
export async function createRSCClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    // Safe stub: treat as logged out until env is configured
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


// Use in Route Handlers / Server Actions (read/write cookies context)
export async function createRouteClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Supabase env vars are not configured");
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        store.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

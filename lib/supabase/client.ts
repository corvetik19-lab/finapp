 "use client";
 import { createBrowserClient } from "@supabase/ssr";

 export function getSupabaseClient() {
   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   if (!url || !anon) {
     throw new Error(
       "Supabase env vars are not set. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
     );
   }
   return createBrowserClient(url, anon);
 }

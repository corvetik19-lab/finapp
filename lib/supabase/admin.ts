import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let adminClient: SupabaseClient | null = null;

/**
 * Создаёт клиент Supabase с сервисным ключом (обход RLS)
 * ТОЛЬКО для серверных операций!
 * 
 * Использует singleton паттерн для переиспользования клиента.
 * Переменные окружения валидируются через lib/env.ts
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

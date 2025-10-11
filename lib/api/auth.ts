/**
 * API Authentication & Authorization
 */

import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface APIKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
}

/**
 * Генерация нового API ключа
 */
export function generateAPIKey(): { key: string; hash: string; prefix: string } {
  const key = `fapp_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 13); // "fapp_" + 8 символов
  
  return { key, hash, prefix };
}

/**
 * Валидация API ключа из заголовка
 */
export async function validateAPIKey(
  apiKey: string
): Promise<{ valid: boolean; userId?: string; keyData?: APIKey; error?: string }> {
  if (!apiKey || !apiKey.startsWith("fapp_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hash = createHash("sha256").update(apiKey).digest("hex");
  const supabase = getServiceClient();

  const { data: keyData, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (error || !keyData) {
    return { valid: false, error: "Invalid or inactive API key" };
  }

  // Проверка срока действия
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Обновляем last_used_at
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyData.id);

  return {
    valid: true,
    userId: keyData.user_id,
    keyData: keyData as APIKey,
  };
}

/**
 * Проверка rate limit
 */
export async function checkRateLimit(
  apiKeyId: string,
  rateLimit: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = getServiceClient();
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const { count } = await supabase
    .from("api_usage_stats")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", oneHourAgo.toISOString());

  const usedRequests = count || 0;
  const remaining = Math.max(0, rateLimit - usedRequests);

  return {
    allowed: usedRequests < rateLimit,
    remaining,
  };
}

/**
 * Логирование использования API
 */
export async function logAPIUsage(params: {
  apiKeyId: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
}): Promise<void> {
  const supabase = getServiceClient();
  
  await supabase.from("api_usage_stats").insert({
    api_key_id: params.apiKeyId,
    user_id: params.userId,
    endpoint: params.endpoint,
    method: params.method,
    status_code: params.statusCode,
    response_time_ms: params.responseTimeMs,
  });
}

/**
 * Проверка scope разрешений
 */
export function hasScope(keyData: APIKey, requiredScope: string): boolean {
  return keyData.scopes.includes(requiredScope);
}

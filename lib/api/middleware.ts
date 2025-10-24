/**
 * Middleware для REST API
 * - Аутентификация по API ключам
 * - Rate limiting
 * - Логирование
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service client для обхода RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface ApiKeyData {
  id: string;
  user_id: string;
  name: string;
  scopes: string[];
  is_active: boolean;
}

/**
 * Валидация API ключа из заголовка Authorization
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<ApiKeyData | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.substring(7); // Убираем "Bearer "

  if (!apiKey || apiKey.length < 32) {
    return null;
  }

  // Хешируем ключ для поиска в БД
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, name, scopes, is_active, expires_at")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  // Проверяем срок действия
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Обновляем last_used_at (не ждём результата)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then();

  return data as ApiKeyData;
}

/**
 * Проверка rate limit
 * @param apiKeyId - ID API ключа
 * @param endpoint - путь endpoint'а
 * @param limit - максимум запросов в минуту
 */
export async function checkRateLimit(
  apiKeyId: string,
  endpoint: string,
  limit: number = 100
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - 1);

  // Считаем количество запросов за последнюю минуту
  const { data, error } = await supabase
    .from("api_rate_limits")
    .select("request_count")
    .eq("api_key_id", apiKeyId)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart.toISOString())
    .maybeSingle();

  if (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, remaining: limit };
  }

  const currentCount = data?.request_count || 0;

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Увеличиваем счётчик
  if (data) {
    await supabase
      .from("api_rate_limits")
      .update({ request_count: currentCount + 1 })
      .eq("api_key_id", apiKeyId)
      .eq("endpoint", endpoint)
      .gte("window_start", windowStart.toISOString());
  } else {
    await supabase.from("api_rate_limits").insert({
      api_key_id: apiKeyId,
      endpoint,
      request_count: 1,
      window_start: new Date().toISOString(),
    });
  }

  return { allowed: true, remaining: limit - currentCount - 1 };
}

/**
 * Логирование использования API
 */
export async function logApiUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number
): Promise<void> {
  await supabase.from("api_usage_stats").insert({
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
  });
}

/**
 * Проверка прав доступа (scopes)
 */
export function hasScope(apiKey: ApiKeyData, requiredScope: string): boolean {
  return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes("*");
}

/**
 * Генерация нового API ключа
 */
export function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "fk_"; // префикс finappka
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Хеширование API ключа для хранения в БД
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Получение префикса ключа для отображения (первые 8 символов)
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + "...";
}

/**
 * Wrapper для API endpoints с аутентификацией и rate limiting
 */
export async function withApiAuth(
  request: Request,
  handler: (apiKey: ApiKeyData, request: Request) => Promise<Response>,
  options: {
    requiredScope?: string;
    rateLimit?: number;
  } = {}
): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const method = request.method;

  try {
    // 1. Валидация API ключа
    const authHeader = request.headers.get("Authorization");
    const apiKey = await validateApiKey(authHeader);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Invalid or missing API key",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Проверка прав доступа
    if (options.requiredScope && !hasScope(apiKey, options.requiredScope)) {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: `Required scope: ${options.requiredScope}`,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Rate limiting
    const rateLimit = options.rateLimit || 100;
    const { allowed, remaining } = await checkRateLimit(
      apiKey.id,
      endpoint,
      rateLimit
    );

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Rate limit exceeded. Try again in 60 seconds.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(rateLimit),
            "X-RateLimit-Remaining": "0",
            "Retry-After": "60",
          },
        }
      );
    }

    // 4. Выполняем handler
    const response = await handler(apiKey, request);

    // 5. Логируем использование
    const responseTime = Date.now() - startTime;
    logApiUsage(
      apiKey.id,
      endpoint,
      method,
      response.status,
      responseTime
    ).catch(console.error);

    // 6. Добавляем заголовки rate limit в ответ
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", String(rateLimit));
    headers.set("X-RateLimit-Remaining", String(remaining));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

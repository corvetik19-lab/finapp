/**
 * Система отправки Webhook уведомлений
 * - Отправка HTTP POST запросов
 * - HMAC подпись для безопасности
 * - Retry механизм с экспоненциальной задержкой
 * - Логирование всех попыток
 */

import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface WebhookEvent {
  event: string;
  data: Record<string, unknown>;
  user_id: string;
  occurred_at: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  retry_count: number;
  timeout_seconds: number;
}

/**
 * Генерация HMAC подписи для webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Отправка webhook с retry механизмом
 */
export async function sendWebhook(
  webhook: WebhookConfig,
  event: WebhookEvent,
  attempt: number = 1
): Promise<{
  success: boolean;
  status_code?: number;
  response_body?: string;
  error?: string;
  duration_ms: number;
}> {
  const startTime = Date.now();
  const payload = JSON.stringify(event);
  const signature = generateSignature(payload, webhook.secret);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      webhook.timeout_seconds * 1000
    );

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event.event,
        "X-Webhook-Timestamp": event.occurred_at,
        "User-Agent": "Finappka-Webhooks/1.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration_ms = Date.now() - startTime;
    const responseText = await response.text();

    // Успешные статус коды: 200-299
    const success = response.status >= 200 && response.status < 300;

    // Логируем результат
    await logWebhookAttempt({
      webhook_id: webhook.id,
      event_type: event.event,
      payload: event,
      status_code: response.status,
      response_body: responseText.substring(0, 1000), // Первые 1000 символов
      error: success ? null : `HTTP ${response.status}`,
      attempt,
      success,
      duration_ms,
    });

    // Если не успешно и есть попытки - retry
    if (!success && attempt < webhook.retry_count) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Экспоненциальная задержка, макс 30 сек
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWebhook(webhook, event, attempt + 1);
    }

    return {
      success,
      status_code: response.status,
      response_body: responseText,
      duration_ms,
    };
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Логируем ошибку
    await logWebhookAttempt({
      webhook_id: webhook.id,
      event_type: event.event,
      payload: event,
      status_code: null,
      response_body: null,
      error: errorMessage,
      attempt,
      success: false,
      duration_ms,
    });

    // Retry если есть попытки
    if (attempt < webhook.retry_count) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendWebhook(webhook, event, attempt + 1);
    }

    return {
      success: false,
      error: errorMessage,
      duration_ms,
    };
  }
}

/**
 * Логирование попытки отправки webhook
 */
async function logWebhookAttempt(data: {
  webhook_id: string;
  event_type: string;
  payload: WebhookEvent;
  status_code: number | null;
  response_body: string | null;
  error: string | null;
  attempt: number;
  success: boolean;
  duration_ms: number;
}): Promise<void> {
  await supabase.from("webhook_logs").insert({
    webhook_id: data.webhook_id,
    event_type: data.event_type,
    payload: data.payload,
    status_code: data.status_code,
    response_body: data.response_body,
    error: data.error,
    attempt: data.attempt,
    success: data.success,
    duration_ms: data.duration_ms,
  });
}

/**
 * Триггер webhook для события
 */
export async function triggerWebhooks(
  event: WebhookEvent
): Promise<void> {
  // Получаем все активные webhooks для этого пользователя
  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", event.user_id)
    .eq("is_active", true)
    .contains("events", [event.event]);

  if (error || !webhooks || webhooks.length === 0) {
    return;
  }

  // Отправляем webhook в каждый зарегистрированный endpoint
  // Делаем это асинхронно, не блокируем основной поток
  webhooks.forEach((webhook) => {
    sendWebhook(
      {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        retry_count: webhook.retry_count,
        timeout_seconds: webhook.timeout_seconds,
      },
      event
    ).catch((error) => {
      console.error(`Webhook ${webhook.id} failed:`, error);
    });
  });
}

/**
 * Вспомогательные функции для различных типов событий
 */

export async function triggerTransactionCreated(
  user_id: string,
  transaction: Record<string, unknown>
): Promise<void> {
  await triggerWebhooks({
    event: "transaction.created",
    data: transaction,
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

export async function triggerTransactionUpdated(
  user_id: string,
  transaction: Record<string, unknown>
): Promise<void> {
  await triggerWebhooks({
    event: "transaction.updated",
    data: transaction,
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

export async function triggerTransactionDeleted(
  user_id: string,
  transaction_id: string
): Promise<void> {
  await triggerWebhooks({
    event: "transaction.deleted",
    data: { id: transaction_id },
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

export async function triggerBudgetExceeded(
  user_id: string,
  budget: Record<string, unknown>
): Promise<void> {
  await triggerWebhooks({
    event: "budget.exceeded",
    data: budget,
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

export async function triggerBudgetWarning(
  user_id: string,
  budget: Record<string, unknown>
): Promise<void> {
  await triggerWebhooks({
    event: "budget.warning",
    data: budget,
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

export async function triggerGoalAchieved(
  user_id: string,
  goal: Record<string, unknown>
): Promise<void> {
  await triggerWebhooks({
    event: "goal.achieved",
    data: goal,
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

export async function triggerAchievementUnlocked(
  user_id: string,
  achievement: Record<string, unknown>
): Promise<void> {
  await triggerWebhooks({
    event: "achievement.unlocked",
    data: achievement,
    user_id,
    occurred_at: new Date().toISOString(),
  });
}

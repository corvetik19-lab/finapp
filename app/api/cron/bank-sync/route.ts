import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Этот эндпоинт вызывается Vercel Cron для синхронизации банковских данных
// Настройка в vercel.json: { "crons": [{ "path": "/api/cron/bank-sync", "schedule": "0 */2 * * *" }] }

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Проверка авторизации для CRON
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    integrations: 0,
    balancesUpdated: 0,
    transactionsSynced: 0,
    tokensRefreshed: 0,
    errors: [] as string[],
  };

  try {
    // 1. Получаем все активные интеграции
    const { data: integrations, error: intError } = await supabaseAdmin
      .from("bank_integrations")
      .select("id, company_id, bank_code, status, api_token_expires_at, settings")
      .eq("status", "active")
      .eq("sync_enabled", true);

    if (intError) {
      console.error("Error fetching integrations:", intError);
      return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
    }

    results.integrations = integrations?.length || 0;

    for (const integration of integrations || []) {
      try {
        // 2. Проверяем и обновляем токены если нужно
        if (integration.api_token_expires_at) {
          const expiresAt = new Date(integration.api_token_expires_at);
          const now = new Date();
          
          // Если токен истекает в течение 30 минут
          if (expiresAt.getTime() - now.getTime() < 30 * 60 * 1000) {
            // Вызываем refresh через внутренний API
            const refreshResult = await refreshTokenForIntegration(integration.id);
            if (refreshResult.success) {
              results.tokensRefreshed++;
            } else {
              results.errors.push(`Token refresh failed for ${integration.id}: ${refreshResult.error}`);
            }
          }
        }

        // 3. Получаем счета для этой интеграции
        const { data: accounts } = await supabaseAdmin
          .from("bank_accounts")
          .select("id, account_number")
          .eq("company_id", integration.company_id)
          .eq("integration_id", integration.id);

        // 4. Синхронизируем транзакции за последние 7 дней
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        const dateTo = new Date();

        for (const account of accounts || []) {
          const syncResult = await syncAccountTransactions(
            integration.id,
            account.id,
            integration.bank_code,
            dateFrom.toISOString().split("T")[0],
            dateTo.toISOString().split("T")[0]
          );

          if (syncResult.success) {
            results.transactionsSynced += syncResult.count || 0;
          } else {
            results.errors.push(`Sync failed for account ${account.id}: ${syncResult.error}`);
          }
        }

        // 5. Обновляем балансы
        const balanceResult = await updateAccountBalances(integration.id, integration.bank_code);
        if (balanceResult.success) {
          results.balancesUpdated += balanceResult.count || 0;
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Integration ${integration.id}: ${message}`);
      }
    }

    // Логируем результат
    await supabaseAdmin
      .from("bank_sync_logs")
      .insert({
        company_id: null, // Системный лог
        operation_type: "cron_sync",
        status: results.errors.length > 0 ? "partial" : "success",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        records_processed: results.transactionsSynced,
        error_message: results.errors.length > 0 ? results.errors.join("; ") : null,
      });

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("CRON sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Вспомогательные функции для CRON

async function refreshTokenForIntegration(integrationId: string): Promise<{ success: boolean; error?: string }> {
  const { data: integration } = await supabaseAdmin
    .from("bank_integrations")
    .select("*")
    .eq("id", integrationId)
    .single();

  if (!integration || !integration.api_refresh_token) {
    return { success: false, error: "No refresh token" };
  }

  // Конфигурация OAuth по банкам
  const tokenUrls: Record<string, string> = {
    tinkoff: "https://id.tinkoff.ru/auth/token",
    sber: "https://api.sberbank.ru/prod/tokens/v2/token",
    alfa: "https://baas.alfabank.ru/oidc/token",
    tochka: "https://enter.tochka.com/connect/token",
    modulbank: "https://oauth.modulbank.ru/oauth/token",
  };

  const tokenUrl = tokenUrls[integration.bank_code];
  if (!tokenUrl) {
    return { success: false, error: "Unknown bank" };
  }

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.api_refresh_token,
        client_id: integration.api_client_id || "",
        client_secret: integration.api_client_secret || "",
      }),
    });

    if (!response.ok) {
      await supabaseAdmin
        .from("bank_integrations")
        .update({ status: "token_expired", last_error: "Token refresh failed" })
        .eq("id", integrationId);
      return { success: false, error: "Token refresh failed" };
    }

    const tokens = await response.json();
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await supabaseAdmin
      .from("bank_integrations")
      .update({
        api_access_token: tokens.access_token,
        api_refresh_token: tokens.refresh_token || integration.api_refresh_token,
        api_token_expires_at: expiresAt,
        last_error: null,
      })
      .eq("id", integrationId);

    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

async function syncAccountTransactions(
  integrationId: string,
  accountId: string,
  bankCode: string,
  dateFrom: string,
  dateTo: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  // Получаем токен
  const { data: integration } = await supabaseAdmin
    .from("bank_integrations")
    .select("api_access_token, is_sandbox, company_id")
    .eq("id", integrationId)
    .single();

  if (!integration?.api_access_token) {
    return { success: false, error: "No access token" };
  }

  // Получаем номер счёта
  const { data: account } = await supabaseAdmin
    .from("bank_accounts")
    .select("account_number")
    .eq("id", accountId)
    .single();

  if (!account) {
    return { success: false, error: "Account not found" };
  }

  // Пока поддерживаем только Тинькофф
  if (bankCode !== "tinkoff") {
    return { success: true, count: 0 }; // Пропускаем другие банки
  }

  const baseUrl = integration.is_sandbox
    ? "https://business.tinkoff.ru/openapi/sandbox/api/v1"
    : "https://business.tinkoff.ru/openapi/api/v1";

  try {
    const params = new URLSearchParams({
      accountNumber: account.account_number,
      from: dateFrom,
      to: dateTo,
    });

    const response = await fetch(`${baseUrl}/bank-statement?${params}`, {
      headers: {
        Authorization: `Bearer ${integration.api_access_token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "API request failed" };
    }

    const data = await response.json();
    const operations = data.operations || [];

    let count = 0;
    for (const op of operations) {
      // Проверяем, есть ли уже такая транзакция
      const { data: existing } = await supabaseAdmin
        .from("bank_transactions")
        .select("id")
        .eq("external_id", op.id)
        .single();

      if (!existing) {
        await supabaseAdmin.from("bank_transactions").insert({
          company_id: integration.company_id,
          bank_account_id: accountId,
          integration_id: integrationId,
          external_id: op.id,
          transaction_date: op.date.split("T")[0],
          operation_type: op.operationType === "Credit" ? "credit" : "debit",
          amount: Math.abs(op.amount),
          counterparty_name: op.counterparty?.name || null,
          counterparty_inn: op.counterparty?.inn || null,
          purpose: op.paymentPurpose || null,
          processing_status: "new",
          raw_data: op,
        });
        count++;
      }
    }

    return { success: true, count };
  } catch {
    return { success: false, error: "Network error" };
  }
}

async function updateAccountBalances(
  integrationId: string,
  bankCode: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (bankCode !== "tinkoff") {
    return { success: true, count: 0 };
  }

  const { data: integration } = await supabaseAdmin
    .from("bank_integrations")
    .select("api_access_token, is_sandbox, company_id")
    .eq("id", integrationId)
    .single();

  if (!integration?.api_access_token) {
    return { success: false, error: "No access token" };
  }

  const baseUrl = integration.is_sandbox
    ? "https://business.tinkoff.ru/openapi/sandbox/api/v1"
    : "https://business.tinkoff.ru/openapi/api/v1";

  try {
    const response = await fetch(`${baseUrl}/bank-accounts`, {
      headers: {
        Authorization: `Bearer ${integration.api_access_token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "API request failed" };
    }

    const accounts = await response.json();
    let count = 0;

    for (const acc of accounts) {
      const { error } = await supabaseAdmin
        .from("bank_accounts")
        .update({
          balance: acc.balance?.otb || 0,
          balance_updated_at: new Date().toISOString(),
        })
        .eq("company_id", integration.company_id)
        .eq("account_number", acc.accountNumber);

      if (!error) count++;
    }

    return { success: true, count };
  } catch {
    return { success: false, error: "Network error" };
  }
}

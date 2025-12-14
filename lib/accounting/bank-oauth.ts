"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { BankCode } from "./bank-types";

// Конфигурация OAuth для банков
const BANK_OAUTH_CONFIG: Record<string, {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  sandboxAuthUrl?: string;
  sandboxTokenUrl?: string;
}> = {
  tinkoff: {
    authUrl: "https://id.tinkoff.ru/auth/authorize",
    tokenUrl: "https://id.tinkoff.ru/auth/token",
    scope: "opensme/individual/accounts/read opensme/individual/statements/read opensme/individual/payments/read opensme/individual/payments/create",
    sandboxAuthUrl: "https://id.tinkoff.ru/auth/authorize",
    sandboxTokenUrl: "https://id.tinkoff.ru/auth/token",
  },
  sber: {
    authUrl: "https://api.sberbank.ru/prod/tokens/v2/oauth",
    tokenUrl: "https://api.sberbank.ru/prod/tokens/v2/token",
    scope: "openid profile",
  },
  alfa: {
    authUrl: "https://baas.alfabank.ru/oidc/authorize",
    tokenUrl: "https://baas.alfabank.ru/oidc/token",
    scope: "accounts:read statements:read payments:read payments:create",
  },
  tochka: {
    authUrl: "https://enter.tochka.com/connect/authorize",
    tokenUrl: "https://enter.tochka.com/connect/token",
    scope: "accounts statements",
  },
  modulbank: {
    authUrl: "https://oauth.modulbank.ru/oauth/authorize",
    tokenUrl: "https://oauth.modulbank.ru/oauth/token",
    scope: "account-info operation-history",
  },
};

// Генерация URL для OAuth авторизации
export async function generateOAuthUrl(
  bankCode: BankCode,
  integrationId: string,
  isSandbox: boolean = true
): Promise<{ url: string; state: string } | null> {
  const config = BANK_OAUTH_CONFIG[bankCode];
  if (!config) {
    console.error(`OAuth not supported for bank: ${bankCode}`);
    return null;
  }

  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;

  // Получаем интеграцию для client_id
  const { data: integration, error } = await supabase
    .from("bank_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("company_id", companyId)
    .single();

  if (error || !integration) {
    console.error("Integration not found:", error);
    return null;
  }

  if (!integration.api_client_id) {
    console.error("Client ID not configured for integration");
    return null;
  }

  // Генерируем state для защиты от CSRF
  const state = crypto.randomUUID();

  // Сохраняем state в интеграции
  await supabase
    .from("bank_integrations")
    .update({ oauth_state: state })
    .eq("id", integrationId);

  // Формируем redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/accounting/bank-oauth/callback`;

  // Формируем URL авторизации
  const authUrl = isSandbox && config.sandboxAuthUrl 
    ? config.sandboxAuthUrl 
    : config.authUrl;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: integration.api_client_id,
    redirect_uri: redirectUri,
    scope: config.scope,
    state: state,
  });

  return {
    url: `${authUrl}?${params.toString()}`,
    state,
  };
}

// Обмен code на токены
export async function exchangeCodeForTokens(
  bankCode: BankCode,
  code: string,
  state: string
): Promise<{ success: boolean; error?: string }> {
  const config = BANK_OAUTH_CONFIG[bankCode];
  if (!config) {
    return { success: false, error: "Bank not supported" };
  }

  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Company not found" };
  }

  // Находим интеграцию по state
  const { data: integration, error: findError } = await supabase
    .from("bank_integrations")
    .select("*")
    .eq("company_id", companyId)
    .eq("bank_code", bankCode)
    .eq("oauth_state", state)
    .single();

  if (findError || !integration) {
    return { success: false, error: "Invalid state or integration not found" };
  }

  // Формируем redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/accounting/bank-oauth/callback`;

  // Обмениваем code на токены
  const tokenUrl = integration.is_sandbox && config.sandboxTokenUrl 
    ? config.sandboxTokenUrl 
    : config.tokenUrl;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: integration.api_client_id || "",
        client_secret: integration.api_client_secret || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      return { success: false, error: "Token exchange failed" };
    }

    const tokens = await response.json();

    // Сохраняем токены
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: updateError } = await supabase
      .from("bank_integrations")
      .update({
        api_access_token: tokens.access_token,
        api_refresh_token: tokens.refresh_token || null,
        api_token_expires_at: expiresAt,
        oauth_state: null,
        status: "active",
        last_error: null,
      })
      .eq("id", integration.id);

    if (updateError) {
      console.error("Failed to save tokens:", updateError);
      return { success: false, error: "Failed to save tokens" };
    }

    return { success: true };
  } catch (error) {
    console.error("Token exchange error:", error);
    return { success: false, error: "Network error during token exchange" };
  }
}

// Обновление токена
export async function refreshAccessToken(
  integrationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Company not found" };
  }

  const { data: integration, error: findError } = await supabase
    .from("bank_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("company_id", companyId)
    .single();

  if (findError || !integration) {
    return { success: false, error: "Integration not found" };
  }

  if (!integration.api_refresh_token) {
    return { success: false, error: "No refresh token available" };
  }

  const config = BANK_OAUTH_CONFIG[integration.bank_code];
  if (!config) {
    return { success: false, error: "Bank not supported" };
  }

  const tokenUrl = integration.is_sandbox && config.sandboxTokenUrl 
    ? config.sandboxTokenUrl 
    : config.tokenUrl;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.api_refresh_token,
        client_id: integration.api_client_id || "",
        client_secret: integration.api_client_secret || "",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token refresh failed:", errorText);
      
      // Обновляем статус интеграции
      await supabase
        .from("bank_integrations")
        .update({
          status: "token_expired",
          last_error: "Token refresh failed",
        })
        .eq("id", integrationId);

      return { success: false, error: "Token refresh failed" };
    }

    const tokens = await response.json();

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await supabase
      .from("bank_integrations")
      .update({
        api_access_token: tokens.access_token,
        api_refresh_token: tokens.refresh_token || integration.api_refresh_token,
        api_token_expires_at: expiresAt,
        status: "active",
        last_error: null,
      })
      .eq("id", integrationId);

    return { success: true };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false, error: "Network error during token refresh" };
  }
}

// Проверка и обновление токена при необходимости
export async function ensureValidToken(
  integrationId: string
): Promise<{ valid: boolean; token?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { valid: false, error: "Company not found" };
  }

  const { data: integration, error } = await supabase
    .from("bank_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("company_id", companyId)
    .single();

  if (error || !integration) {
    return { valid: false, error: "Integration not found" };
  }

  if (!integration.api_access_token) {
    return { valid: false, error: "No access token" };
  }

  // Проверяем срок действия токена
  if (integration.api_token_expires_at) {
    const expiresAt = new Date(integration.api_token_expires_at);
    const now = new Date();
    
    // Если токен истекает в течение 5 минут, обновляем его
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      const refreshResult = await refreshAccessToken(integrationId);
      
      if (!refreshResult.success) {
        return { valid: false, error: refreshResult.error };
      }

      // Получаем обновлённый токен
      const { data: updated } = await supabase
        .from("bank_integrations")
        .select("api_access_token")
        .eq("id", integrationId)
        .single();

      return { valid: true, token: updated?.api_access_token || undefined };
    }
  }

  return { valid: true, token: integration.api_access_token };
}

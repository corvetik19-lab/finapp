"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { ensureValidToken } from "./bank-oauth";

const TINKOFF_API_BASE = "https://business.tinkoff.ru/openapi/api/v1";
const TINKOFF_SANDBOX_BASE = "https://business.tinkoff.ru/openapi/sandbox/api/v1";

interface TinkoffPaymentRequest {
  documentNumber: string;
  documentDate: string;
  amount: number;
  purpose: string;
  payerAccount: string;
  recipientName: string;
  recipientInn: string;
  recipientKpp?: string;
  recipientAccount: string;
  recipientBankBik: string;
  recipientBankName: string;
  recipientBankCorrAccount: string;
  priority?: number;
  vatType?: string;
  vatAmount?: number;
}

// Отправка платёжного поручения в Тинькофф
export async function sendPaymentOrderToTinkoff(
  paymentOrderId: string
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем платёжное поручение
  const { data: paymentOrder } = await supabase
    .from("payment_orders")
    .select(`
      *,
      bank_accounts!inner(account_number, integration_id)
    `)
    .eq("id", paymentOrderId)
    .eq("company_id", companyId)
    .single();

  if (!paymentOrder) {
    return { success: false, error: "Платёжное поручение не найдено" };
  }

  const bankAccount = paymentOrder.bank_accounts as { account_number: string; integration_id: string };
  
  if (!bankAccount?.integration_id) {
    return { success: false, error: "Интеграция с банком не настроена" };
  }

  // Получаем токен
  const tokenResult = await ensureValidToken(bankAccount.integration_id);
  
  if (!tokenResult.valid || !tokenResult.token) {
    return { success: false, error: tokenResult.error || "Ошибка авторизации в банке" };
  }

  // Получаем интеграцию для sandbox режима
  const { data: integration } = await supabase
    .from("bank_integrations")
    .select("is_sandbox, bank_code")
    .eq("id", bankAccount.integration_id)
    .single();

  if (integration?.bank_code !== "tinkoff") {
    return { success: false, error: "API отправки поддерживается только для Тинькофф" };
  }

  const baseUrl = integration?.is_sandbox ? TINKOFF_SANDBOX_BASE : TINKOFF_API_BASE;

  // Формируем запрос
  const paymentRequest: TinkoffPaymentRequest = {
    documentNumber: paymentOrder.order_number,
    documentDate: paymentOrder.order_date,
    amount: paymentOrder.amount,
    purpose: paymentOrder.purpose,
    payerAccount: bankAccount.account_number,
    recipientName: paymentOrder.recipient_name,
    recipientInn: paymentOrder.recipient_inn,
    recipientKpp: paymentOrder.recipient_kpp || undefined,
    recipientAccount: paymentOrder.recipient_account,
    recipientBankBik: paymentOrder.recipient_bank_bik,
    recipientBankName: paymentOrder.recipient_bank_name,
    recipientBankCorrAccount: paymentOrder.recipient_bank_corr_account,
    priority: paymentOrder.priority || 5,
  };

  // Добавляем НДС если указан
  if (paymentOrder.vat_type && paymentOrder.vat_type !== "none") {
    paymentRequest.vatType = paymentOrder.vat_type;
    paymentRequest.vatAmount = paymentOrder.vat_amount;
  }

  try {
    // Обновляем статус на "отправляется"
    await supabase
      .from("payment_orders")
      .update({ status: "sending" })
      .eq("id", paymentOrderId);

    const response = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Tinkoff payment error:", errorText);
      
      // Обновляем статус на ошибку
      await supabase
        .from("payment_orders")
        .update({
          status: "error",
          error_message: `Ошибка банка: ${response.status}`,
        })
        .eq("id", paymentOrderId);

      return { success: false, error: "Ошибка отправки в банк" };
    }

    const result = await response.json();

    // Обновляем статус на "отправлено"
    await supabase
      .from("payment_orders")
      .update({
        status: "sent",
        external_id: result.paymentId || result.id,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", paymentOrderId);

    return { success: true, externalId: result.paymentId || result.id };
  } catch (error) {
    console.error("Payment send error:", error);
    
    await supabase
      .from("payment_orders")
      .update({
        status: "error",
        error_message: "Ошибка сети при отправке",
      })
      .eq("id", paymentOrderId);

    return { success: false, error: "Ошибка сети" };
  }
}

// Проверка статуса платёжного поручения в банке
export async function checkPaymentOrderStatus(
  paymentOrderId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: paymentOrder } = await supabase
    .from("payment_orders")
    .select(`
      *,
      bank_accounts!inner(integration_id)
    `)
    .eq("id", paymentOrderId)
    .eq("company_id", companyId)
    .single();

  if (!paymentOrder) {
    return { success: false, error: "Платёжное поручение не найдено" };
  }

  if (!paymentOrder.external_id) {
    return { success: false, error: "Платёж ещё не отправлен в банк" };
  }

  const bankAccount = paymentOrder.bank_accounts as { integration_id: string };
  
  const tokenResult = await ensureValidToken(bankAccount.integration_id);
  
  if (!tokenResult.valid || !tokenResult.token) {
    return { success: false, error: tokenResult.error };
  }

  const { data: integration } = await supabase
    .from("bank_integrations")
    .select("is_sandbox")
    .eq("id", bankAccount.integration_id)
    .single();

  const baseUrl = integration?.is_sandbox ? TINKOFF_SANDBOX_BASE : TINKOFF_API_BASE;

  try {
    const response = await fetch(`${baseUrl}/payments/${paymentOrder.external_id}`, {
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "Ошибка получения статуса" };
    }

    const result = await response.json();

    // Маппинг статусов Тинькофф на наши
    const statusMap: Record<string, string> = {
      CREATED: "sent",
      ACCEPTED: "accepted",
      PROCESSING: "processing",
      EXECUTED: "executed",
      REJECTED: "rejected",
      CANCELLED: "cancelled",
    };

    const newStatus = statusMap[result.status] || result.status;

    // Обновляем статус
    await supabase
      .from("payment_orders")
      .update({
        status: newStatus,
        executed_at: result.status === "EXECUTED" ? new Date().toISOString() : null,
        error_message: result.rejectReason || null,
      })
      .eq("id", paymentOrderId);

    return { success: true, status: newStatus };
  } catch (error) {
    console.error("Status check error:", error);
    return { success: false, error: "Ошибка сети" };
  }
}

// Отмена платёжного поручения в банке
export async function cancelPaymentOrder(
  paymentOrderId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: paymentOrder } = await supabase
    .from("payment_orders")
    .select(`
      *,
      bank_accounts!inner(integration_id)
    `)
    .eq("id", paymentOrderId)
    .eq("company_id", companyId)
    .single();

  if (!paymentOrder) {
    return { success: false, error: "Платёжное поручение не найдено" };
  }

  // Можно отменить только отправленные платежи
  if (!["sent", "accepted", "processing"].includes(paymentOrder.status)) {
    return { success: false, error: "Платёж в данном статусе нельзя отменить" };
  }

  if (!paymentOrder.external_id) {
    return { success: false, error: "Платёж не найден в банке" };
  }

  const bankAccount = paymentOrder.bank_accounts as { integration_id: string };
  
  const tokenResult = await ensureValidToken(bankAccount.integration_id);
  
  if (!tokenResult.valid || !tokenResult.token) {
    return { success: false, error: tokenResult.error };
  }

  const { data: integration } = await supabase
    .from("bank_integrations")
    .select("is_sandbox")
    .eq("id", bankAccount.integration_id)
    .single();

  const baseUrl = integration?.is_sandbox ? TINKOFF_SANDBOX_BASE : TINKOFF_API_BASE;

  try {
    const response = await fetch(`${baseUrl}/payments/${paymentOrder.external_id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cancel error:", errorText);
      return { success: false, error: "Ошибка отмены платежа в банке" };
    }

    await supabase
      .from("payment_orders")
      .update({
        status: "cancelled",
        error_message: "Отменено пользователем",
      })
      .eq("id", paymentOrderId);

    return { success: true };
  } catch (error) {
    console.error("Cancel error:", error);
    return { success: false, error: "Ошибка сети" };
  }
}

// Массовая проверка статусов платежей
export async function syncPaymentOrderStatuses(): Promise<{ checked: number; updated: number }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { checked: 0, updated: 0 };
  }

  // Получаем платежи в промежуточных статусах
  const { data: pendingOrders } = await supabase
    .from("payment_orders")
    .select("id")
    .eq("company_id", companyId)
    .in("status", ["sent", "accepted", "processing"])
    .not("external_id", "is", null)
    .limit(50);

  if (!pendingOrders || pendingOrders.length === 0) {
    return { checked: 0, updated: 0 };
  }

  let updated = 0;

  for (const order of pendingOrders) {
    const result = await checkPaymentOrderStatus(order.id);
    if (result.success && result.status) {
      if (!["sent", "accepted", "processing"].includes(result.status)) {
        updated++;
      }
    }
  }

  return { checked: pendingOrders.length, updated };
}

"use server";

import { revalidatePath } from "next/cache";
import { syncTinkoffTransactions, syncTinkoffBalances } from "@/lib/accounting/bank-api-tinkoff";
import { getBankIntegration } from "@/lib/accounting/bank-service";

export async function syncBankTransactionsAction(
  integrationId: string,
  bankAccountId: string,
  dateFrom: string,
  dateTo: string
) {
  const integration = await getBankIntegration(integrationId);
  
  if (!integration) {
    return { success: false, error: "Интеграция не найдена" };
  }

  // Вызываем соответствующий API в зависимости от банка
  let result;
  
  switch (integration.bank_code) {
    case "tinkoff":
      result = await syncTinkoffTransactions(integrationId, bankAccountId, dateFrom, dateTo);
      break;
    default:
      return { success: false, error: `API для банка ${integration.bank_code} пока не реализован` };
  }

  if (result.success) {
    revalidatePath("/tenders/accounting/bank-accounts");
    revalidatePath(`/tenders/accounting/bank-accounts/${bankAccountId}/transactions`);
  }

  return result;
}

export async function syncBankBalancesAction(integrationId: string) {
  const integration = await getBankIntegration(integrationId);
  
  if (!integration) {
    return { success: false, error: "Интеграция не найдена" };
  }

  let result;
  
  switch (integration.bank_code) {
    case "tinkoff":
      result = await syncTinkoffBalances(integrationId);
      break;
    default:
      return { success: false, error: `API для банка ${integration.bank_code} пока не реализован` };
  }

  if (result.success) {
    revalidatePath("/tenders/accounting/bank-accounts");
  }

  return result;
}

export async function startOAuthFlowAction(integrationId: string) {
  const { generateOAuthUrl } = await import("@/lib/accounting/bank-oauth");
  const integration = await getBankIntegration(integrationId);
  
  if (!integration) {
    return { success: false, error: "Интеграция не найдена" };
  }

  const result = await generateOAuthUrl(
    integration.bank_code,
    integrationId,
    integration.is_sandbox
  );

  if (!result) {
    return { success: false, error: "Не удалось сгенерировать URL авторизации" };
  }

  return { success: true, url: result.url };
}

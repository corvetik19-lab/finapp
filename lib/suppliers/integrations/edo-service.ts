"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

// =====================================================
// Интеграция с ЭДО (СБИС, Диадок, Контур)
// =====================================================

export type EDOProvider = "sbis" | "diadoc" | "kontur";

export interface EDOConfig {
  provider: EDOProvider;
  apiKey: string;
  boxId?: string;
  inn: string;
  kpp?: string;
  isActive: boolean;
}

export interface EDOContragent {
  inn: string;
  kpp?: string;
  name: string;
  isConnected: boolean;
  boxId?: string;
  status: "not_invited" | "invited" | "connected" | "rejected";
  invitedAt?: string;
  connectedAt?: string;
}

export interface EDODocument {
  id: string;
  type: "invoice" | "act" | "torg12" | "upd" | "other";
  number: string;
  date: string;
  amount?: number;
  currency?: string;
  status: "draft" | "sent" | "delivered" | "signed" | "rejected";
  counterpartyInn: string;
  counterpartyName: string;
  sentAt?: string;
  signedAt?: string;
  errorMessage?: string;
}

// =====================================================
// Получение конфигурации ЭДО
// =====================================================

export async function getEDOConfig(): Promise<EDOConfig | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data } = await supabase
    .from("organization_integrations")
    .select("config")
    .eq("org_id", companyId)
    .eq("integration_type", "edo")
    .eq("is_active", true)
    .single();

  return data?.config as EDOConfig | null;
}

export async function saveEDOConfig(config: EDOConfig): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return false;

  const { error } = await supabase
    .from("organization_integrations")
    .upsert({
      company_id: companyId,
      integration_type: "edo",
      config,
      is_active: config.isActive,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "company_id,integration_type",
    });

  if (error) {
    logger.error("Error saving EDO config:", error);
    return false;
  }

  return true;
}

// =====================================================
// Работа с контрагентами ЭДО
// =====================================================

export async function checkEDOConnection(inn: string): Promise<EDOContragent | null> {
  const config = await getEDOConfig();
  
  if (!config) {
    logger.warn("EDO not configured");
    return null;
  }

  // TODO: Реализовать проверку подключения через API провайдера
  // Пример для СБИС: POST /edo/v1/counterparty/check
  // Пример для Диадок: GET /GetCounteragents
  
  logger.info("Checking EDO connection", { inn, provider: config.provider });
  
  return {
    inn,
    name: "",
    isConnected: false,
    status: "not_invited",
  };
}

export async function inviteToEDO(
  inn: string,
  kpp?: string,
  _message?: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getEDOConfig();
  
  if (!config) {
    return { success: false, error: "ЭДО не настроен" };
  }

  // TODO: Реализовать отправку приглашения через API провайдера
  
  logger.info("Inviting to EDO", { inn, kpp, provider: config.provider });
  
  // Сохраняем статус приглашения
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (companyId) {
    await supabase
      .from("suppliers")
      .update({
        edo_status: "invited",
        edo_invited_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .eq("inn", inn);
  }

  return { success: true };
}

export async function getEDOStatus(supplierIds: string[]): Promise<Map<string, EDOContragent>> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return new Map();

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, inn, kpp, name, edo_status, edo_invited_at, edo_connected_at")
    .in("id", supplierIds);

  const result = new Map<string, EDOContragent>();

  for (const supplier of suppliers || []) {
    result.set(supplier.id, {
      inn: supplier.inn,
      kpp: supplier.kpp,
      name: supplier.name,
      isConnected: supplier.edo_status === "connected",
      status: supplier.edo_status || "not_invited",
      invitedAt: supplier.edo_invited_at,
      connectedAt: supplier.edo_connected_at,
    });
  }

  return result;
}

// =====================================================
// Отправка документов через ЭДО
// =====================================================

export async function sendDocument(
  supplierInn: string,
  document: {
    type: EDODocument["type"];
    number: string;
    date: string;
    amount?: number;
    filePath?: string;
    fileContent?: string;
  }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  const config = await getEDOConfig();
  
  if (!config) {
    return { success: false, error: "ЭДО не настроен" };
  }

  // TODO: Реализовать отправку документа через API провайдера
  
  logger.info("Sending EDO document", {
    supplierInn,
    type: document.type,
    number: document.number,
    provider: config.provider,
  });

  return { success: true, documentId: `doc_${Date.now()}` };
}

export async function getDocumentStatus(documentId: string): Promise<EDODocument | null> {
  const config = await getEDOConfig();
  
  if (!config) {
    return null;
  }

  // TODO: Реализовать получение статуса документа через API провайдера
  
  logger.info("Getting EDO document status", { documentId, provider: config.provider });
  
  return null;
}

export async function getSupplierDocuments(
  supplierInn: string,
  options?: {
    fromDate?: string;
    toDate?: string;
    type?: EDODocument["type"];
    status?: EDODocument["status"];
  }
): Promise<EDODocument[]> {
  const config = await getEDOConfig();
  
  if (!config) {
    return [];
  }

  // TODO: Реализовать получение документов через API провайдера
  
  logger.info("Getting supplier EDO documents", {
    supplierInn,
    options,
    provider: config.provider,
  });
  
  return [];
}

// =====================================================
// Массовое обновление статусов ЭДО
// =====================================================

export async function syncEDOStatuses(): Promise<{
  updated: number;
  errors: string[];
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { updated: 0, errors: ["Компания не найдена"] };
  }

  const config = await getEDOConfig();
  
  if (!config) {
    return { updated: 0, errors: ["ЭДО не настроен"] };
  }

  // Получаем поставщиков с ИНН
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, inn, kpp")
    .eq("company_id", companyId)
    .not("inn", "is", null);

  if (!suppliers || suppliers.length === 0) {
    return { updated: 0, errors: [] };
  }

  let updated = 0;
  const errors: string[] = [];

  // Проверяем статусы пакетами по 50
  for (let i = 0; i < suppliers.length; i += 50) {
    const batch = suppliers.slice(i, i + 50);
    
    for (const supplier of batch) {
      try {
        const status = await checkEDOConnection(supplier.inn);
        
        if (status) {
          await supabase
            .from("suppliers")
            .update({
              edo_status: status.status,
              edo_connected_at: status.connectedAt,
            })
            .eq("id", supplier.id);
          
          updated++;
        }
      } catch (error) {
        errors.push(`${supplier.inn}: ${error instanceof Error ? error.message : "Ошибка"}`);
      }
    }

    // Пауза между пакетами
    if (i + 50 < suppliers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { updated, errors };
}

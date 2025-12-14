"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import type {
  EdiSettings,
  DiadocOrganization,
  DiadocBox,
  DiadocCounteragent,
  SendDocumentResult,
  GetDocumentsResult,
  EdiDocumentStatus,
} from "./types";

const DIADOC_API_URL = "https://diadoc-api.kontur.ru";

// ============================================
// Получение настроек ЭДО
// ============================================

export async function getEdiSettings(): Promise<EdiSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data } = await supabase
    .from("edi_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();
  
  return data;
}

export async function saveEdiSettings(
  settings: Partial<EdiSettings>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { data: existing } = await supabase
    .from("edi_settings")
    .select("id")
    .eq("company_id", companyId)
    .single();
  
  if (existing) {
    const { error } = await supabase
      .from("edi_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("edi_settings")
      .insert({
        company_id: companyId,
        provider: "diadoc",
        auto_sign: false,
        auto_send_response: false,
        is_active: true,
        ...settings,
      });
    
    if (error) return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Диадок API клиент
// ============================================

async function diadocRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey: string;
    authToken?: string;
  }
): Promise<{ data?: T; error?: string }> {
  const { method = "GET", body, apiKey, authToken } = options;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `DiadocAuth ddauth_api_client_id=${apiKey}`,
  };
  
  if (authToken) {
    headers["Authorization"] += `, ddauth_token=${authToken}`;
  }
  
  try {
    const response = await fetch(`${DIADOC_API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Ошибка API: ${response.status} - ${errorText}` };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: `Ошибка сети: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ============================================
// Аутентификация в Диадок
// ============================================

export async function authenticateDiadoc(
  apiKey: string,
  login: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const { data, error } = await diadocRequest<{ token: string }>(
    "/V3/Authenticate",
    {
      method: "POST",
      apiKey,
      body: { login, password },
    }
  );
  
  if (error) return { success: false, error };
  
  return { success: true, token: data?.token };
}

// ============================================
// Получение организаций
// ============================================

export async function getDiadocOrganizations(
  apiKey: string,
  authToken: string
): Promise<{ organizations: DiadocOrganization[]; error?: string }> {
  const { data, error } = await diadocRequest<{ Organizations: DiadocOrganization[] }>(
    "/GetMyOrganizations",
    { apiKey, authToken }
  );
  
  if (error) return { organizations: [], error };
  
  return { organizations: data?.Organizations || [] };
}

// ============================================
// Получение ящиков организации
// ============================================

export async function getDiadocBoxes(
  apiKey: string,
  authToken: string,
  orgId: string
): Promise<{ boxes: DiadocBox[]; error?: string }> {
  const { data, error } = await diadocRequest<{ Boxes: DiadocBox[] }>(
    `/GetOrganizationsByInnKpp?orgId=${orgId}`,
    { apiKey, authToken }
  );
  
  if (error) return { boxes: [], error };
  
  return { boxes: data?.Boxes || [] };
}

// ============================================
// Поиск контрагентов
// ============================================

export async function searchDiadocCounteragents(
  inn: string
): Promise<{ counteragents: DiadocCounteragent[]; error?: string }> {
  const settings = await getEdiSettings();
  if (!settings?.api_key) {
    return { counteragents: [], error: "ЭДО не настроен" };
  }
  
  const { data, error } = await diadocRequest<{ Counteragents: DiadocCounteragent[] }>(
    `/GetCounteragents?myOrgId=${settings.org_id}&counteragentStatus=IsMyCounteragent&inn=${inn}`,
    { apiKey: settings.api_key }
  );
  
  if (error) return { counteragents: [], error };
  
  return { counteragents: data?.Counteragents || [] };
}

// ============================================
// Отправка документа
// ============================================

export async function sendDocumentToEdi(
  documentId: string,
  counterpartyBoxId: string
): Promise<SendDocumentResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const settings = await getEdiSettings();
  if (!settings?.api_key || !settings?.box_id) {
    return { success: false, error: "ЭДО не настроен" };
  }
  
  // Получаем документ
  const { data: doc } = await supabase
    .from("accounting_documents")
    .select("*, counterparty:accounting_counterparties(*)")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .single();
  
  if (!doc) {
    return { success: false, error: "Документ не найден" };
  }
  
  // TODO: Формирование XML и отправка через Диадок API
  // Это заглушка для демонстрации структуры
  
  // Создаём запись об отправке
  const { data: ediDoc, error: insertError } = await supabase
    .from("edi_documents")
    .insert({
      company_id: companyId,
      accounting_document_id: documentId,
      external_id: `pending_${Date.now()}`,
      document_type: doc.document_type,
      status: "draft" as EdiDocumentStatus,
      counterparty_box_id: counterpartyBoxId,
      counterparty_name: doc.counterparty?.name,
      counterparty_inn: doc.counterparty?.inn,
      document_number: doc.document_number,
      document_date: doc.document_date,
      total: doc.total,
    })
    .select()
    .single();
  
  if (insertError) {
    return { success: false, error: insertError.message };
  }
  
  // В реальной интеграции здесь будет вызов API Диадок
  // const result = await diadocRequest(...)
  
  return {
    success: true,
    messageId: ediDoc?.id,
    entityId: ediDoc?.external_id,
  };
}

// ============================================
// Получение входящих документов
// ============================================

export async function getIncomingEdiDocuments(
  cursor?: string
): Promise<GetDocumentsResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { documents: [], hasMore: false };
  }
  
  // Получаем документы из БД
  let query = supabase
    .from("edi_documents")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);
  
  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  
  const { data, error } = await query;
  
  if (error) {
    return { documents: [], hasMore: false };
  }
  
  return {
    documents: data || [],
    hasMore: (data?.length || 0) >= 50,
    cursor: data?.[data.length - 1]?.created_at,
  };
}

// ============================================
// Подписание документа
// ============================================

export async function signEdiDocument(
  ediDocumentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const settings = await getEdiSettings();
  if (!settings?.certificate_thumbprint) {
    return { success: false, error: "Сертификат ЭЦП не настроен" };
  }
  
  // TODO: Реальное подписание через КриптоПро или другой провайдер ЭЦП
  
  // Обновляем статус
  const { error } = await supabase
    .from("edi_documents")
    .update({
      status: "signed" as EdiDocumentStatus,
      signed_at: new Date().toISOString(),
      our_signature: {
        signer_name: "Подпись",
        signed_at: new Date().toISOString(),
        certificate_thumbprint: settings.certificate_thumbprint,
        is_valid: true,
      },
    })
    .eq("id", ediDocumentId)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Отклонение документа
// ============================================

export async function rejectEdiDocument(
  ediDocumentId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("edi_documents")
    .update({
      status: "rejected" as EdiDocumentStatus,
      rejection_reason: reason,
    })
    .eq("id", ediDocumentId)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Статистика ЭДО
// ============================================

export interface EdiStats {
  total: number;
  sent: number;
  signed: number;
  pending: number;
  rejected: number;
}

export async function getEdiStats(): Promise<EdiStats> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { total: 0, sent: 0, signed: 0, pending: 0, rejected: 0 };
  }
  
  const { data } = await supabase
    .from("edi_documents")
    .select("status")
    .eq("company_id", companyId);
  
  const stats: EdiStats = {
    total: data?.length || 0,
    sent: 0,
    signed: 0,
    pending: 0,
    rejected: 0,
  };
  
  data?.forEach(doc => {
    switch (doc.status) {
      case "sent":
      case "delivered":
        stats.sent++;
        break;
      case "signed":
        stats.signed++;
        break;
      case "draft":
        stats.pending++;
        break;
      case "rejected":
      case "revoked":
        stats.rejected++;
        break;
    }
  });
  
  return stats;
}

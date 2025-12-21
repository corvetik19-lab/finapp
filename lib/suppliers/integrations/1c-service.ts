"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

// =====================================================
// Интеграция с 1С
// =====================================================

export interface OneCContragent {
  guid: string;
  name: string;
  fullName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  actualAddress?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankBik?: string;
  bankAccount?: string;
  corrAccount?: string;
  isSupplier: boolean;
  isCustomer: boolean;
  isActive: boolean;
  group?: string;
  manager?: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OneCIntegrationConfig {
  baseUrl: string;
  username: string;
  password: string;
  database: string;
  syncDirection: "to_1c" | "from_1c" | "bidirectional";
  syncInterval?: number; // минуты
  lastSyncAt?: string;
}

export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  syncedAt: string;
}

// =====================================================
// Получение конфигурации интеграции
// =====================================================

export async function getOneCConfig(): Promise<OneCIntegrationConfig | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data } = await supabase
    .from("organization_integrations")
    .select("config")
    .eq("org_id", companyId)
    .eq("integration_type", "1c")
    .eq("is_active", true)
    .single();

  return data?.config as OneCIntegrationConfig | null;
}

export async function saveOneCConfig(config: OneCIntegrationConfig): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return false;

  const { error } = await supabase
    .from("organization_integrations")
    .upsert({
      company_id: companyId,
      integration_type: "1c",
      config,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "company_id,integration_type",
    });

  if (error) {
    logger.error("Error saving 1C config:", error);
    return false;
  }

  return true;
}

// =====================================================
// Синхронизация с 1С (заглушки)
// =====================================================

async function fetchContragentsFrom1C(
  config: OneCIntegrationConfig
): Promise<OneCContragent[]> {
  // TODO: Реализовать запрос к 1C через OData/HTTP сервис
  // Пример URL: {baseUrl}/odata/standard.odata/Catalog_Контрагенты
  
  logger.info(`Fetching contragents from 1C: ${config.baseUrl}`);
  return [];
}

async function pushContragentsTo1C(
  config: OneCIntegrationConfig,
  contragents: OneCContragent[]
): Promise<{ success: boolean; errors: string[] }> {
  // TODO: Реализовать отправку в 1C через OData/HTTP сервис
  
  logger.info(`Pushing ${contragents.length} contragents to 1C: ${config.baseUrl}`);
  return { success: true, errors: [] };
}

// =====================================================
// Синхронизация поставщиков
// =====================================================

export async function syncSuppliersFrom1C(): Promise<SyncResult> {
  const config = await getOneCConfig();
  
  if (!config) {
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: ["Интеграция с 1С не настроена"],
      syncedAt: new Date().toISOString(),
    };
  }

  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: ["Компания не найдена"],
      syncedAt: new Date().toISOString(),
    };
  }

  const contragents = await fetchContragentsFrom1C(config);
  const suppliers = contragents.filter(c => c.isSupplier);

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const supplier of suppliers) {
    // Ищем по guid или inn
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("org_id", companyId)
      .or(`external_id.eq.${supplier.guid},inn.eq.${supplier.inn}`)
      .single();

    const supplierData = {
      company_id: companyId,
      external_id: supplier.guid,
      name: supplier.fullName || supplier.name,
      short_name: supplier.name,
      inn: supplier.inn,
      kpp: supplier.kpp,
      ogrn: supplier.ogrn,
      legal_address: supplier.legalAddress,
      actual_address: supplier.actualAddress,
      phone: supplier.phone,
      email: supplier.email,
      bank_name: supplier.bankName,
      bank_bik: supplier.bankBik,
      bank_account: supplier.bankAccount,
      corr_account: supplier.corrAccount,
      status: supplier.isActive ? "active" : "inactive",
      source: "1c",
      synced_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("suppliers")
        .update(supplierData)
        .eq("id", existing.id);

      if (error) {
        errors.push(`Update ${supplier.inn}: ${error.message}`);
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase
        .from("suppliers")
        .insert(supplierData);

      if (error) {
        errors.push(`Create ${supplier.inn}: ${error.message}`);
      } else {
        created++;
      }
    }
  }

  // Обновляем время последней синхронизации
  await saveOneCConfig({ ...config, lastSyncAt: new Date().toISOString() });

  return {
    success: errors.length === 0,
    created,
    updated,
    deleted: 0,
    errors,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncSuppliersTo1C(): Promise<SyncResult> {
  const config = await getOneCConfig();
  
  if (!config) {
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: ["Интеграция с 1С не настроена"],
      syncedAt: new Date().toISOString(),
    };
  }

  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: ["Компания не найдена"],
      syncedAt: new Date().toISOString(),
    };
  }

  // Получаем поставщиков, изменённых после последней синхронизации
  let query = supabase
    .from("suppliers")
    .select("*")
    .eq("company_id", companyId);

  if (config.lastSyncAt) {
    query = query.gt("updated_at", config.lastSyncAt);
  }

  const { data: suppliers } = await query;

  if (!suppliers || suppliers.length === 0) {
    return {
      success: true,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    };
  }

  // Преобразуем в формат 1С
  const contragents: OneCContragent[] = suppliers.map(s => ({
    guid: s.external_id || "",
    name: s.short_name || s.name,
    fullName: s.name,
    inn: s.inn,
    kpp: s.kpp,
    ogrn: s.ogrn,
    legalAddress: s.legal_address,
    actualAddress: s.actual_address,
    phone: s.phone,
    email: s.email,
    bankName: s.bank_name,
    bankBik: s.bank_bik,
    bankAccount: s.bank_account,
    corrAccount: s.corr_account,
    isSupplier: true,
    isCustomer: false,
    isActive: s.status === "active",
  }));

  const result = await pushContragentsTo1C(config, contragents);

  // Обновляем время последней синхронизации
  await saveOneCConfig({ ...config, lastSyncAt: new Date().toISOString() });

  return {
    success: result.success,
    created: 0, // 1C определит сам
    updated: contragents.length,
    deleted: 0,
    errors: result.errors,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncSuppliersBidirectional(): Promise<{
  from1C: SyncResult;
  to1C: SyncResult;
}> {
  const from1C = await syncSuppliersFrom1C();
  const to1C = await syncSuppliersTo1C();

  return { from1C, to1C };
}

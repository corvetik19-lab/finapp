"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

export interface Counterparty {
  id: string;
  companyId: string;
  name: string;
  shortName?: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  actualAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  contactPerson?: string;
  notes?: string;
  isCustomer: boolean;
  isSupplier: boolean;
  tenderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CounterpartyFilters {
  search?: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
}

export interface CreateCounterpartyInput {
  name: string;
  shortName?: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  actualAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  contactPerson?: string;
  notes?: string;
  isCustomer?: boolean;
  isSupplier?: boolean;
  tenderId?: string;
}

// Получить список контрагентов
export async function getCounterpartiesList(
  filters: CounterpartyFilters = {}
): Promise<Counterparty[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("accounting_counterparties")
    .select("*")
    .eq("company_id", companyId);

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,inn.ilike.%${filters.search}%,short_name.ilike.%${filters.search}%`
    );
  }

  if (filters.isCustomer !== undefined) {
    query = query.eq("is_customer", filters.isCustomer);
  }

  if (filters.isSupplier !== undefined) {
    query = query.eq("is_supplier", filters.isSupplier);
  }

  const { data, error } = await query.order("name");

  if (error) {
    logger.error("Error fetching counterparties:", error);
    return [];
  }

  return (data || []).map(mapCounterparty);
}

// Получить контрагента по ID
export async function getCounterpartyById(id: string): Promise<Counterparty | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("accounting_counterparties")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching counterparty:", error);
    return null;
  }

  return data ? mapCounterparty(data) : null;
}

// Создать контрагента
export async function createCounterparty(
  input: CreateCounterpartyInput
): Promise<{ success: boolean; counterpartyId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Проверяем уникальность ИНН
  const { data: existing } = await supabase
    .from("accounting_counterparties")
    .select("id")
    .eq("company_id", companyId)
    .eq("inn", input.inn)
    .single();

  if (existing) {
    return { success: false, error: "Контрагент с таким ИНН уже существует" };
  }

  const { data, error } = await supabase
    .from("accounting_counterparties")
    .insert({
      company_id: companyId,
      name: input.name,
      short_name: input.shortName || null,
      inn: input.inn,
      kpp: input.kpp || null,
      ogrn: input.ogrn || null,
      legal_address: input.legalAddress || null,
      actual_address: input.actualAddress || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      bank_name: input.bankName || null,
      bik: input.bik || null,
      checking_account: input.checkingAccount || null,
      correspondent_account: input.correspondentAccount || null,
      contact_person: input.contactPerson || null,
      notes: input.notes || null,
      is_customer: input.isCustomer ?? true,
      is_supplier: input.isSupplier ?? false,
      tender_id: input.tenderId || null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating counterparty:", error);
    return { success: false, error: "Ошибка создания контрагента" };
  }

  return { success: true, counterpartyId: data.id };
}

// Обновить контрагента
export async function updateCounterparty(
  id: string,
  input: Partial<CreateCounterpartyInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.shortName !== undefined) updateData.short_name = input.shortName;
  if (input.inn !== undefined) updateData.inn = input.inn;
  if (input.kpp !== undefined) updateData.kpp = input.kpp;
  if (input.ogrn !== undefined) updateData.ogrn = input.ogrn;
  if (input.legalAddress !== undefined) updateData.legal_address = input.legalAddress;
  if (input.actualAddress !== undefined) updateData.actual_address = input.actualAddress;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.bankName !== undefined) updateData.bank_name = input.bankName;
  if (input.bik !== undefined) updateData.bik = input.bik;
  if (input.checkingAccount !== undefined) updateData.checking_account = input.checkingAccount;
  if (input.correspondentAccount !== undefined) updateData.correspondent_account = input.correspondentAccount;
  if (input.contactPerson !== undefined) updateData.contact_person = input.contactPerson;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.isCustomer !== undefined) updateData.is_customer = input.isCustomer;
  if (input.isSupplier !== undefined) updateData.is_supplier = input.isSupplier;

  const { error } = await supabase
    .from("accounting_counterparties")
    .update(updateData)
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error updating counterparty:", error);
    return { success: false, error: "Ошибка обновления контрагента" };
  }

  return { success: true };
}

// Удалить контрагента
export async function deleteCounterparty(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("accounting_counterparties")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting counterparty:", error);
    return { success: false, error: "Ошибка удаления контрагента" };
  }

  return { success: true };
}

// Импорт контрагентов из тендеров
export async function importCounterpartiesFromTenders(): Promise<{
  success: boolean;
  imported: number;
  error?: string;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, imported: 0, error: "Компания не найдена" };
  }

  // Получаем заказчиков из тендеров
  const { data: tenders } = await supabase
    .from("tenders")
    .select("id, customer_name, customer_inn")
    .eq("company_id", companyId)
    .not("customer_inn", "is", null);

  if (!tenders || tenders.length === 0) {
    return { success: true, imported: 0 };
  }

  // Получаем существующие ИНН
  const { data: existing } = await supabase
    .from("accounting_counterparties")
    .select("inn")
    .eq("company_id", companyId);

  const existingInns = new Set((existing || []).map(e => e.inn));

  // Фильтруем новых
  const newCounterparties = tenders
    .filter(t => t.customer_inn && !existingInns.has(t.customer_inn))
    .map(t => ({
      company_id: companyId,
      name: t.customer_name || `Заказчик (ИНН: ${t.customer_inn})`,
      inn: t.customer_inn,
      is_customer: true,
      is_supplier: false,
      tender_id: t.id,
    }));

  // Убираем дубликаты по ИНН
  const uniqueByInn = new Map<string, typeof newCounterparties[0]>();
  for (const cp of newCounterparties) {
    if (!uniqueByInn.has(cp.inn)) {
      uniqueByInn.set(cp.inn, cp);
    }
  }

  const toInsert = Array.from(uniqueByInn.values());

  if (toInsert.length === 0) {
    return { success: true, imported: 0 };
  }

  const { error } = await supabase
    .from("accounting_counterparties")
    .insert(toInsert);

  if (error) {
    logger.error("Error importing counterparties:", error);
    return { success: false, imported: 0, error: "Ошибка импорта" };
  }

  return { success: true, imported: toInsert.length };
}

// Поиск по DaData API
export async function searchByInn(inn: string): Promise<{
  success: boolean;
  data?: {
    name: string;
    shortName?: string;
    inn: string;
    kpp?: string;
    ogrn?: string;
    address?: string;
    managementName?: string;
  };
  error?: string;
}> {
  const dadataToken = process.env.DADATA_API_KEY;

  if (!dadataToken) {
    return { success: false, error: "API ключ DaData не настроен" };
  }

  try {
    const response = await fetch(
      "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Token ${dadataToken}`,
        },
        body: JSON.stringify({ query: inn }),
      }
    );

    if (!response.ok) {
      return { success: false, error: "Ошибка запроса к DaData" };
    }

    const result = await response.json();

    if (!result.suggestions || result.suggestions.length === 0) {
      return { success: false, error: "Организация не найдена" };
    }

    const suggestion = result.suggestions[0];
    const data = suggestion.data;

    return {
      success: true,
      data: {
        name: suggestion.value,
        shortName: data.name?.short_with_opf,
        inn: data.inn,
        kpp: data.kpp,
        ogrn: data.ogrn,
        address: data.address?.unrestricted_value,
        managementName: data.management?.name,
      },
    };
  } catch (error) {
    logger.error("DaData API error:", error);
    return { success: false, error: "Ошибка подключения к DaData" };
  }
}

// Маппинг из БД в интерфейс
function mapCounterparty(data: Record<string, unknown>): Counterparty {
  return {
    id: data.id as string,
    companyId: data.company_id as string,
    name: data.name as string,
    shortName: data.short_name as string | undefined,
    inn: data.inn as string,
    kpp: data.kpp as string | undefined,
    ogrn: data.ogrn as string | undefined,
    legalAddress: data.legal_address as string | undefined,
    actualAddress: data.actual_address as string | undefined,
    phone: data.phone as string | undefined,
    email: data.email as string | undefined,
    website: data.website as string | undefined,
    bankName: data.bank_name as string | undefined,
    bik: data.bik as string | undefined,
    checkingAccount: data.checking_account as string | undefined,
    correspondentAccount: data.correspondent_account as string | undefined,
    contactPerson: data.contact_person as string | undefined,
    notes: data.notes as string | undefined,
    isCustomer: data.is_customer as boolean,
    isSupplier: data.is_supplier as boolean,
    tenderId: data.tender_id as string | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

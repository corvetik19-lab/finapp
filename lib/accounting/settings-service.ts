"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export type OrganizationType = "ip" | "ooo" | "ao" | "pao" | "zao" | "nko";
export type TaxSystem = "osno" | "usn_income" | "usn_income_expense" | "eshn" | "patent";

export interface OrganizationSettings {
  id: string;
  companyId: string;
  
  // Основные данные
  organizationType: OrganizationType;
  organizationName: string;
  shortName?: string;
  
  // Реквизиты
  inn: string;
  kpp?: string;
  ogrn?: string;
  okpo?: string;
  okved?: string;
  
  // Адреса
  legalAddress?: string;
  actualAddress?: string;
  
  // Контакты
  phone?: string;
  email?: string;
  website?: string;
  
  // Руководство
  directorName?: string;
  directorPosition?: string;
  accountantName?: string;
  
  // Налогообложение
  taxSystem: TaxSystem;
  usnRate?: number;           // 6 или 15
  usnMinTaxRate?: number;     // Минимальный налог (обычно 1%)
  isVatPayer: boolean;
  vatRate?: number;           // 0, 10, 20
  
  // Банковские реквизиты
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  
  // Нумерация документов
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  actPrefix?: string;
  actNextNumber?: number;
  contractPrefix?: string;
  contractNextNumber?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationSettingsInput {
  organizationType?: OrganizationType;
  organizationName?: string;
  shortName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  okpo?: string;
  okved?: string;
  legalAddress?: string;
  actualAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  directorName?: string;
  directorPosition?: string;
  accountantName?: string;
  taxSystem?: TaxSystem;
  usnRate?: number;
  usnMinTaxRate?: number;
  isVatPayer?: boolean;
  vatRate?: number;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  actPrefix?: string;
  actNextNumber?: number;
  contractPrefix?: string;
  contractNextNumber?: number;
}

// Получить настройки организации
export async function getOrganizationSettings(): Promise<OrganizationSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("accounting_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching organization settings:", error);
    return null;
  }

  if (!data) return null;

  return mapSettings(data);
}

// Создать или обновить настройки
export async function upsertOrganizationSettings(
  input: UpdateOrganizationSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Проверяем, существуют ли настройки
  const { data: existing } = await supabase
    .from("accounting_settings")
    .select("id")
    .eq("company_id", companyId)
    .single();

  const updateData = {
    company_id: companyId,
    organization_type: input.organizationType,
    organization_name: input.organizationName,
    short_name: input.shortName,
    inn: input.inn,
    kpp: input.kpp,
    ogrn: input.ogrn,
    okpo: input.okpo,
    okved: input.okved,
    legal_address: input.legalAddress,
    actual_address: input.actualAddress,
    phone: input.phone,
    email: input.email,
    website: input.website,
    director_name: input.directorName,
    director_position: input.directorPosition,
    accountant_name: input.accountantName,
    tax_system: input.taxSystem,
    usn_rate: input.usnRate,
    usn_min_tax_rate: input.usnMinTaxRate,
    is_vat_payer: input.isVatPayer,
    vat_rate: input.vatRate,
    bank_name: input.bankName,
    bik: input.bik,
    checking_account: input.checkingAccount,
    correspondent_account: input.correspondentAccount,
    invoice_prefix: input.invoicePrefix,
    invoice_next_number: input.invoiceNextNumber,
    act_prefix: input.actPrefix,
    act_next_number: input.actNextNumber,
    contract_prefix: input.contractPrefix,
    contract_next_number: input.contractNextNumber,
    updated_at: new Date().toISOString(),
  };

  // Удаляем undefined значения
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  );

  if (existing) {
    // Обновляем
    const { error } = await supabase
      .from("accounting_settings")
      .update(cleanData)
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating settings:", error);
      return { success: false, error: "Ошибка сохранения настроек" };
    }
  } else {
    // Создаём
    const { error } = await supabase
      .from("accounting_settings")
      .insert(cleanData);

    if (error) {
      console.error("Error creating settings:", error);
      return { success: false, error: "Ошибка создания настроек" };
    }
  }

  return { success: true };
}

// Маппинг из БД
function mapSettings(data: Record<string, unknown>): OrganizationSettings {
  return {
    id: data.id as string,
    companyId: data.company_id as string,
    organizationType: (data.organization_type as OrganizationType) || "ip",
    organizationName: (data.organization_name as string) || "",
    shortName: data.short_name as string | undefined,
    inn: (data.inn as string) || "",
    kpp: data.kpp as string | undefined,
    ogrn: data.ogrn as string | undefined,
    okpo: data.okpo as string | undefined,
    okved: data.okved as string | undefined,
    legalAddress: data.legal_address as string | undefined,
    actualAddress: data.actual_address as string | undefined,
    phone: data.phone as string | undefined,
    email: data.email as string | undefined,
    website: data.website as string | undefined,
    directorName: data.director_name as string | undefined,
    directorPosition: data.director_position as string | undefined,
    accountantName: data.accountant_name as string | undefined,
    taxSystem: (data.tax_system as TaxSystem) || "usn_income",
    usnRate: data.usn_rate as number | undefined,
    usnMinTaxRate: data.usn_min_tax_rate as number | undefined,
    isVatPayer: (data.is_vat_payer as boolean) || false,
    vatRate: data.vat_rate as number | undefined,
    bankName: data.bank_name as string | undefined,
    bik: data.bik as string | undefined,
    checkingAccount: data.checking_account as string | undefined,
    correspondentAccount: data.correspondent_account as string | undefined,
    invoicePrefix: data.invoice_prefix as string | undefined,
    invoiceNextNumber: data.invoice_next_number as number | undefined,
    actPrefix: data.act_prefix as string | undefined,
    actNextNumber: data.act_next_number as number | undefined,
    contractPrefix: data.contract_prefix as string | undefined,
    contractNextNumber: data.contract_next_number as number | undefined,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

// Константы
export const ORGANIZATION_TYPES: Record<OrganizationType, string> = {
  ip: "Индивидуальный предприниматель",
  ooo: "Общество с ограниченной ответственностью",
  ao: "Акционерное общество",
  pao: "Публичное акционерное общество",
  zao: "Закрытое акционерное общество",
  nko: "Некоммерческая организация",
};

export const TAX_SYSTEMS: Record<TaxSystem, { name: string; description: string }> = {
  osno: {
    name: "ОСНО",
    description: "Общая система налогообложения",
  },
  usn_income: {
    name: "УСН Доходы",
    description: "Упрощённая система (6% с доходов)",
  },
  usn_income_expense: {
    name: "УСН Доходы-Расходы",
    description: "Упрощённая система (15% с разницы)",
  },
  eshn: {
    name: "ЕСХН",
    description: "Единый сельскохозяйственный налог",
  },
  patent: {
    name: "ПСН",
    description: "Патентная система налогообложения",
  },
};

export const VAT_RATES = [
  { value: 0, label: "0%" },
  { value: 10, label: "10%" },
  { value: 20, label: "20%" },
];

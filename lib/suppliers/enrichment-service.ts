"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// =====================================================
// Типы для обогащения данных
// =====================================================

export interface DaDataCompanyInfo {
  inn: string;
  kpp?: string;
  ogrn?: string;
  name: {
    full: string;
    short: string;
  };
  address: {
    value: string;
    unrestricted_value: string;
    postal_code?: string;
    region?: string;
    city?: string;
    street?: string;
    house?: string;
  };
  management?: {
    name: string;
    post: string;
  };
  state: {
    status: "ACTIVE" | "LIQUIDATING" | "LIQUIDATED" | "REORGANIZING" | "BANKRUPT";
    registration_date?: number;
    liquidation_date?: number;
  };
  type: "LEGAL" | "INDIVIDUAL";
  okved?: string;
  okved_type?: string;
  capital?: {
    value: number;
    type: string;
  };
  finance?: {
    year?: number;
    income?: number;
    expense?: number;
    profit?: number;
    taxes?: number;
  };
}

export interface EnrichmentResult {
  success: boolean;
  source: "dadata" | "manual";
  data?: DaDataCompanyInfo;
  error?: string;
  updatedFields?: string[];
}

export interface VerificationCheck {
  type: "rnp" | "arbitr" | "fssp" | "tax_debt";
  status: "clean" | "warning" | "risk";
  message: string;
  details?: unknown;
}

export interface SupplierVerification {
  id: string;
  supplier_id: string;
  verification_type: string;
  status: "pending" | "success" | "warning" | "error";
  result?: unknown;
  risk_score?: number;
  risk_level?: "low" | "medium" | "high" | "critical";
  verified_at: string;
  valid_until?: string;
}

// =====================================================
// Функции обогащения через DaData
// =====================================================

const DADATA_API_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs";

export async function enrichSupplierByINN(
  supplierId: string,
  inn: string
): Promise<EnrichmentResult> {
  const apiKey = process.env.DADATA_API_KEY;

  if (!apiKey) {
    logger.warn("DaData API key not configured");
    return {
      success: false,
      source: "dadata",
      error: "API ключ DaData не настроен",
    };
  }

  try {
    const response = await fetch(`${DADATA_API_URL}/findById/party`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Token ${apiKey}`,
      },
      body: JSON.stringify({ query: inn }),
    });

    if (!response.ok) {
      throw new Error(`DaData API error: ${response.status}`);
    }

    const result = await response.json();
    const suggestion = result.suggestions?.[0];

    if (!suggestion) {
      return {
        success: false,
        source: "dadata",
        error: "Организация не найдена по ИНН",
      };
    }

    const data = suggestion.data as DaDataCompanyInfo;

    // Обновляем данные поставщика
    const supabase = await createRSCClient();
    const updatedFields: string[] = [];

    const updates: Record<string, unknown> = {};

    if (data.kpp) {
      updates.kpp = data.kpp;
      updatedFields.push("КПП");
    }
    if (data.ogrn) {
      updates.ogrn = data.ogrn;
      updatedFields.push("ОГРН");
    }
    if (data.name?.full && !updates.name) {
      updates.name = data.name.full;
      updatedFields.push("Полное название");
    }
    if (data.name?.short) {
      updates.short_name = data.name.short;
      updatedFields.push("Краткое название");
    }
    if (data.address?.unrestricted_value) {
      updates.legal_address = data.address.unrestricted_value;
      updatedFields.push("Юридический адрес");
    }
    if (data.management?.name) {
      updates.director_name = data.management.name;
      updates.director_position = data.management.post;
      updatedFields.push("Руководитель");
    }

    // Сохраняем полные данные DaData
    updates.dadata_info = data;
    updates.enriched_at = new Date().toISOString();

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("suppliers")
        .update(updates)
        .eq("id", supplierId);

      if (error) {
        logger.error("Error updating supplier with DaData:", error);
      }
    }

    // Сохраняем результат верификации
    await saveVerificationResult(supplierId, "dadata", "success", data, calculateRiskScore(data));

    return {
      success: true,
      source: "dadata",
      data,
      updatedFields,
    };
  } catch (error) {
    logger.error("DaData enrichment error:", error);
    return {
      success: false,
      source: "dadata",
      error: error instanceof Error ? error.message : "Ошибка обогащения данных",
    };
  }
}

export async function searchCompaniesByName(
  query: string,
  limit = 10
): Promise<DaDataCompanyInfo[]> {
  const apiKey = process.env.DADATA_API_KEY;

  if (!apiKey) {
    logger.warn("DaData API key not configured");
    return [];
  }

  try {
    const response = await fetch(`${DADATA_API_URL}/suggest/party`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Token ${apiKey}`,
      },
      body: JSON.stringify({ query, count: limit }),
    });

    if (!response.ok) {
      throw new Error(`DaData API error: ${response.status}`);
    }

    const result = await response.json();
    return result.suggestions?.map((s: { data: DaDataCompanyInfo }) => s.data) || [];
  } catch (error) {
    logger.error("DaData search error:", error);
    return [];
  }
}

// =====================================================
// Функции верификации
// =====================================================

function calculateRiskScore(data: DaDataCompanyInfo): number {
  let score = 0;

  // Статус организации
  switch (data.state?.status) {
    case "ACTIVE":
      score += 0;
      break;
    case "REORGANIZING":
      score += 30;
      break;
    case "LIQUIDATING":
      score += 60;
      break;
    case "LIQUIDATED":
    case "BANKRUPT":
      score += 100;
      break;
  }

  // Возраст организации
  if (data.state?.registration_date) {
    const ageMonths = (Date.now() - data.state.registration_date) / (1000 * 60 * 60 * 24 * 30);
    if (ageMonths < 6) score += 30;
    else if (ageMonths < 12) score += 20;
    else if (ageMonths < 24) score += 10;
  }

  // Уставный капитал
  if (data.type === "LEGAL" && data.capital) {
    if (data.capital.value < 10000) score += 20;
    else if (data.capital.value < 100000) score += 10;
  }

  return Math.min(100, score);
}

function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 20) return "low";
  if (score < 40) return "medium";
  if (score < 70) return "high";
  return "critical";
}

async function saveVerificationResult(
  supplierId: string,
  type: string,
  status: "pending" | "success" | "warning" | "error",
  result: unknown,
  riskScore?: number
): Promise<void> {
  const supabase = await createRSCClient();

  await supabase.from("supplier_verifications").insert({
    supplier_id: supplierId,
    verification_type: type,
    status,
    result,
    risk_score: riskScore,
    risk_level: riskScore !== undefined ? getRiskLevel(riskScore) : undefined,
    verified_at: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 дней
  });
}

export async function getSupplierVerifications(supplierId: string): Promise<SupplierVerification[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_verifications")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("verified_at", { ascending: false });

  if (error) {
    logger.error("Error fetching verifications:", error);
    return [];
  }

  return data as SupplierVerification[];
}

export async function checkRNP(inn: string): Promise<VerificationCheck> {
  // Реестр недобросовестных поставщиков (заглушка)
  logger.debug(`Checking RNP for INN: ${inn}`);
  // TODO: Интегрироваться с API ФАС/ЕИС
  return {
    type: "rnp",
    status: "clean",
    message: "Не найден в реестре недобросовестных поставщиков",
  };
}

export async function checkArbitr(inn: string): Promise<VerificationCheck> {
  // Проверка арбитражных дел (заглушка)
  logger.debug(`Checking Arbitr for INN: ${inn}`);
  // TODO: Интегрироваться с API КАД Арбитр
  return {
    type: "arbitr",
    status: "clean",
    message: "Активных арбитражных дел не найдено",
  };
}

export async function checkFSSP(inn: string): Promise<VerificationCheck> {
  // Проверка исполнительных производств (заглушка)
  logger.debug(`Checking FSSP for INN: ${inn}`);
  // TODO: Интегрироваться с API ФССП
  return {
    type: "fssp",
    status: "clean",
    message: "Исполнительных производств не найдено",
  };
}

export async function runFullVerification(
  supplierId: string,
  inn: string
): Promise<{
  riskScore: number;
  riskLevel: string;
  checks: VerificationCheck[];
}> {
  const checks: VerificationCheck[] = [];

  // Параллельно запускаем все проверки
  const [rnpResult, arbitrResult, fsspResult] = await Promise.all([
    checkRNP(inn),
    checkArbitr(inn),
    checkFSSP(inn),
  ]);

  checks.push(rnpResult, arbitrResult, fsspResult);

  // Рассчитываем общий риск
  let riskScore = 0;
  for (const check of checks) {
    if (check.status === "warning") riskScore += 20;
    if (check.status === "risk") riskScore += 40;
  }

  const riskLevel = getRiskLevel(riskScore);

  // Сохраняем результаты
  const supabase = await createRSCClient();
  await supabase.from("suppliers").update({
    risk_score: riskScore,
    risk_level: riskLevel,
    verified_at: new Date().toISOString(),
  }).eq("id", supplierId);

  return { riskScore, riskLevel, checks };
}

export async function bulkEnrichSuppliers(
  supplierIds: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  const supabase = await createRSCClient();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Получаем поставщиков с ИНН
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, inn")
    .in("id", supplierIds)
    .not("inn", "is", null);

  if (!suppliers) {
    return { success: 0, failed: supplierIds.length, errors: ["Поставщики не найдены"] };
  }

  // Обогащаем пакетами по 5 (ограничение DaData)
  for (let i = 0; i < suppliers.length; i += 5) {
    const batch = suppliers.slice(i, i + 5);

    await Promise.all(
      batch.map(async (supplier) => {
        if (!supplier.inn) {
          failed++;
          errors.push(`${supplier.id}: нет ИНН`);
          return;
        }

        const result = await enrichSupplierByINN(supplier.id, supplier.inn);
        if (result.success) {
          success++;
        } else {
          failed++;
          errors.push(`${supplier.id}: ${result.error}`);
        }
      })
    );

    // Пауза между пакетами
    if (i + 5 < suppliers.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return { success, failed, errors };
}

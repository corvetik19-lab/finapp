"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

// =====================================================
// Интеграция с Госзакупками (zakupki.gov.ru)
// =====================================================

export interface ZakupkiPurchase {
  regNumber: string;
  purchaseNumber: string;
  purchaseName: string;
  publishDate: string;
  endDate?: string;
  maxPrice?: number;
  currency?: string;
  customer: {
    name: string;
    inn?: string;
    kpp?: string;
  };
  status: string;
  purchaseType: string;
  lots?: ZakupkiLot[];
}

export interface ZakupkiLot {
  lotNumber: number;
  name: string;
  maxPrice?: number;
  currency?: string;
  okpd2?: string[];
  deliveryPlace?: string;
  deliveryTerm?: string;
}

export interface ZakupkiParticipant {
  name: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  address?: string;
  status: "winner" | "participant" | "rejected";
  proposedPrice?: number;
  proposedDate?: string;
}

export interface ZakupkiContract {
  regNumber: string;
  signDate: string;
  price: number;
  currency: string;
  supplier: {
    name: string;
    inn?: string;
  };
  customer: {
    name: string;
    inn?: string;
  };
  executionDate?: string;
  status: string;
}

// =====================================================
// API функции (заглушки - требуют API ключ zakupki.gov.ru)
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ZAKUPKI_API_URL = "https://zakupki.gov.ru/epz/order/extendedsearch/results.html";

export async function searchPurchases(query: {
  searchText?: string;
  inn?: string;
  regNumber?: string;
  okpd2?: string;
  minPrice?: number;
  maxPrice?: number;
  publishDateFrom?: string;
  publishDateTo?: string;
  regions?: string[];
}): Promise<ZakupkiPurchase[]> {
  // В реальной реализации здесь будет запрос к API
  // Для демо возвращаем пустой массив
  logger.info("Searching zakupki.gov.ru", query);
  
  // TODO: Реализовать интеграцию с API Госзакупок
  // Возможные варианты:
  // 1. Официальный API (требует регистрацию)
  // 2. Парсинг открытых данных
  // 3. Сторонние сервисы (Контур.Закупки, etc.)
  
  return [];
}

export async function getPurchaseDetails(regNumber: string): Promise<ZakupkiPurchase | null> {
  logger.info("Getting purchase details", { regNumber });
  // TODO: Реализовать получение деталей закупки
  return null;
}

export async function getPurchaseParticipants(regNumber: string): Promise<ZakupkiParticipant[]> {
  logger.info("Getting purchase participants", { regNumber });
  // TODO: Реализовать получение участников закупки
  return [];
}

export async function getSupplierContracts(inn: string): Promise<ZakupkiContract[]> {
  logger.info("Getting supplier contracts", { inn });
  // TODO: Реализовать получение контрактов поставщика
  return [];
}

// =====================================================
// Проверка в РНП (Реестр недобросовестных поставщиков)
// =====================================================

export interface RNPRecord {
  inn: string;
  name: string;
  inclusionDate: string;
  exclusionDate?: string;
  reason: string;
  purchaseRegNumber?: string;
  isActive: boolean;
}

export async function checkRNP(inn: string): Promise<{
  inRegistry: boolean;
  records: RNPRecord[];
}> {
  logger.info("Checking RNP for", { inn });
  
  // TODO: Реализовать проверку в РНП через API ФАС
  // https://rnp.fas.gov.ru/
  
  return {
    inRegistry: false,
    records: [],
  };
}

// =====================================================
// Импорт участников закупки в поставщиков
// =====================================================

export async function importPurchaseParticipants(
  regNumber: string,
  categoryId?: string
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { imported: 0, skipped: 0, errors: ["Компания не найдена"] };
  }

  const participants = await getPurchaseParticipants(regNumber);
  
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const participant of participants) {
    if (!participant.inn) {
      skipped++;
      continue;
    }

    // Проверяем существование
    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("company_id", companyId)
      .eq("inn", participant.inn)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // Создаём поставщика
    const { error } = await supabase.from("suppliers").insert({
      company_id: companyId,
      name: participant.name,
      inn: participant.inn,
      kpp: participant.kpp,
      ogrn: participant.ogrn,
      legal_address: participant.address,
      category_id: categoryId,
      status: "active",
      source: "zakupki",
      source_ref: regNumber,
    });

    if (error) {
      errors.push(`${participant.inn}: ${error.message}`);
    } else {
      imported++;
    }
  }

  return { imported, skipped, errors };
}

// =====================================================
// Получение статистики побед поставщика
// =====================================================

export async function getSupplierWinStats(inn: string): Promise<{
  totalWins: number;
  totalAmount: number;
  lastWinDate?: string;
  customers: { name: string; wins: number }[];
}> {
  const contracts = await getSupplierContracts(inn);
  
  const customerMap = new Map<string, number>();
  let totalAmount = 0;
  let lastWinDate: string | undefined;

  for (const contract of contracts) {
    totalAmount += contract.price;
    
    if (!lastWinDate || contract.signDate > lastWinDate) {
      lastWinDate = contract.signDate;
    }
    
    const customerName = contract.customer.name;
    customerMap.set(customerName, (customerMap.get(customerName) || 0) + 1);
  }

  const customers = Array.from(customerMap.entries())
    .map(([name, wins]) => ({ name, wins }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  return {
    totalWins: contracts.length,
    totalAmount,
    lastWinDate,
    customers,
  };
}

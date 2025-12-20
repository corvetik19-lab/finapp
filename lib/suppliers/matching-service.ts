"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import { Supplier } from "./types";

// =====================================================
// Типы для подбора поставщиков
// =====================================================

export interface MatchingCriteria {
  categoryIds?: string[];
  minRating?: number;
  excludeBlacklisted?: boolean;
  hasPhone?: boolean;
  hasEmail?: boolean;
  region?: string;
  tags?: string[];
  maxResults?: number;
}

export interface MatchedSupplier extends Supplier {
  matchScore: number;
  matchReasons: string[];
  previousTenders?: number;
  winRate?: number;
  lastInteraction?: string;
}

export interface TenderSupplierOffer {
  id: string;
  tender_id: string;
  supplier_id: string;
  supplier: Supplier;
  status: SupplierOfferStatus;
  invited_at?: string;
  responded_at?: string;
  offer_amount?: number;
  offer_currency: string;
  offer_delivery_days?: number;
  offer_payment_terms?: string;
  offer_warranty_months?: number;
  offer_documents?: OfferDocument[];
  evaluation_score?: number;
  evaluation_notes?: string;
  rejection_reason?: string;
}

export type SupplierOfferStatus = 
  | "invited"
  | "confirmed"
  | "requested_docs"
  | "offer_received"
  | "under_review"
  | "negotiating"
  | "winner"
  | "rejected"
  | "reserve";

export const OFFER_STATUSES: Record<SupplierOfferStatus, { name: string; color: string }> = {
  invited: { name: "Приглашён", color: "blue" },
  confirmed: { name: "Подтвердил", color: "cyan" },
  requested_docs: { name: "Запросил ТЗ", color: "purple" },
  offer_received: { name: "КП получено", color: "indigo" },
  under_review: { name: "На рассмотрении", color: "yellow" },
  negotiating: { name: "Переговоры", color: "orange" },
  winner: { name: "Победитель", color: "green" },
  rejected: { name: "Отклонён", color: "red" },
  reserve: { name: "Резерв", color: "gray" },
};

export interface OfferDocument {
  id: string;
  name: string;
  path: string;
  type: string;
  uploaded_at: string;
}

export interface OfferComparison {
  suppliers: TenderSupplierOffer[];
  criteria: ComparisonCriteria[];
  recommendation?: string;
}

export interface ComparisonCriteria {
  id: string;
  name: string;
  weight: number;
  type: "price" | "days" | "rating" | "custom";
}

// =====================================================
// Функции подбора поставщиков
// =====================================================

export async function matchSuppliersForTender(
  tenderId: string,
  criteria: MatchingCriteria
): Promise<MatchedSupplier[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  // Получаем данные тендера
  const { data: tender } = await supabase
    .from("tenders")
    .select("id, subject, status, max_price, category_id")
    .eq("id", tenderId)
    .single();

  if (!tender) return [];

  // Базовый запрос поставщиков
  let query = supabase
    .from("suppliers")
    .select(`
      *,
      category:supplier_categories(id, name, color),
      contacts:supplier_contacts(id, name, phone, email, is_primary)
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  // Фильтр по статусу
  if (criteria.excludeBlacklisted !== false) {
    query = query.neq("status", "blacklisted");
  }

  // Фильтр по рейтингу
  if (criteria.minRating) {
    query = query.gte("rating", criteria.minRating);
  }

  // Фильтр по категориям
  if (criteria.categoryIds && criteria.categoryIds.length > 0) {
    query = query.in("category_id", criteria.categoryIds);
  }

  // Фильтр по тегам
  if (criteria.tags && criteria.tags.length > 0) {
    query = query.overlaps("tags", criteria.tags);
  }

  const { data: suppliers, error } = await query.order("rating", { ascending: false });

  if (error) {
    logger.error("Error matching suppliers:", error);
    return [];
  }

  // Получаем историю тендеров для каждого поставщика
  const supplierIds = suppliers?.map(s => s.id) || [];
  const { data: tenderHistory } = await supabase
    .from("supplier_tenders")
    .select("supplier_id, status")
    .in("supplier_id", supplierIds);

  const historyMap = new Map<string, { total: number; wins: number }>();
  tenderHistory?.forEach(th => {
    const current = historyMap.get(th.supplier_id) || { total: 0, wins: 0 };
    current.total++;
    if (th.status === "won") current.wins++;
    historyMap.set(th.supplier_id, current);
  });

  // Рассчитываем скоринг
  const matchedSuppliers: MatchedSupplier[] = (suppliers || [])
    .filter(s => {
      // Дополнительные фильтры
      if (criteria.hasPhone && !s.phone) return false;
      if (criteria.hasEmail && !s.email) return false;
      return true;
    })
    .map(supplier => {
      const reasons: string[] = [];
      let score = 50; // Базовый скор

      // Рейтинг
      if (supplier.rating) {
        score += supplier.rating * 10;
        if (supplier.rating >= 4) {
          reasons.push(`Высокий рейтинг: ${supplier.rating}`);
        }
      }

      // История тендеров
      const history = historyMap.get(supplier.id);
      if (history) {
        score += Math.min(history.total * 5, 20);
        if (history.wins > 0) {
          const winRate = (history.wins / history.total) * 100;
          score += winRate / 5;
          reasons.push(`Побед: ${history.wins} из ${history.total}`);
        }
      }

      // Полнота данных
      if (supplier.inn) score += 5;
      if (supplier.phone) score += 5;
      if (supplier.email) score += 5;
      if (supplier.contacts?.length > 0) {
        score += 5;
        reasons.push("Есть контактные лица");
      }

      // Категория
      if (supplier.category_id && criteria.categoryIds?.includes(supplier.category_id)) {
        score += 15;
        reasons.push("Подходящая категория");
      }

      // Статус
      if (supplier.status === "active") {
        score += 10;
      }

      return {
        ...supplier,
        matchScore: Math.min(100, Math.round(score)),
        matchReasons: reasons,
        previousTenders: history?.total || 0,
        winRate: history ? (history.wins / history.total) * 100 : undefined,
      } as MatchedSupplier;
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, criteria.maxResults || 20);

  return matchedSuppliers;
}

export async function getTenderOffers(tenderId: string): Promise<TenderSupplierOffer[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_tenders")
    .select(`
      *,
      supplier:suppliers(
        id, name, short_name, inn, phone, email, status, rating,
        category:supplier_categories(id, name, color)
      )
    `)
    .eq("tender_id", tenderId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching tender offers:", error);
    return [];
  }

  return (data || []).map(d => ({
    id: d.id,
    tender_id: d.tender_id,
    supplier_id: d.supplier_id,
    supplier: d.supplier as Supplier,
    status: d.status as SupplierOfferStatus,
    invited_at: d.invited_at,
    responded_at: d.responded_at,
    offer_amount: d.offer_amount,
    offer_currency: d.offer_currency || "RUB",
    offer_delivery_days: d.offer_delivery_days,
    offer_payment_terms: d.offer_payment_terms,
    offer_warranty_months: d.offer_warranty_months,
    offer_documents: d.offer_documents as OfferDocument[] | undefined,
    evaluation_score: d.evaluation_score,
    evaluation_notes: d.evaluation_notes,
    rejection_reason: d.rejection_reason,
  }));
}

export async function inviteSupplierToTender(
  tenderId: string,
  supplierId: string,
  method: "email" | "phone" | "platform" = "platform"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Пользователь не авторизован" };
  }

  // Проверяем, не приглашён ли уже
  const { data: existing } = await supabase
    .from("supplier_tenders")
    .select("id")
    .eq("tender_id", tenderId)
    .eq("supplier_id", supplierId)
    .single();

  if (existing) {
    return { success: false, error: "Поставщик уже приглашён" };
  }

  const { error } = await supabase
    .from("supplier_tenders")
    .insert({
      tender_id: tenderId,
      supplier_id: supplierId,
      status: "invited",
      role: "participant",
      invited_at: new Date().toISOString(),
      invited_by: user.id,
      invitation_method: method,
    });

  if (error) {
    logger.error("Error inviting supplier:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function bulkInviteSuppliers(
  tenderId: string,
  supplierIds: string[],
  method: "email" | "phone" | "platform" = "platform"
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const supplierId of supplierIds) {
    const result = await inviteSupplierToTender(tenderId, supplierId, method);
    if (result.success) {
      success++;
    } else {
      failed++;
      if (result.error) errors.push(`${supplierId}: ${result.error}`);
    }
  }

  return { success, failed, errors };
}

export async function updateOfferStatus(
  offerId: string,
  status: SupplierOfferStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  const updates: Record<string, unknown> = { status };
  
  if (status === "offer_received") {
    updates.responded_at = new Date().toISOString();
  }
  
  if (notes) {
    updates.evaluation_notes = notes;
  }

  const { error } = await supabase
    .from("supplier_tenders")
    .update(updates)
    .eq("id", offerId);

  if (error) {
    logger.error("Error updating offer status:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function saveOfferDetails(
  offerId: string,
  details: {
    offer_amount?: number;
    offer_delivery_days?: number;
    offer_payment_terms?: string;
    offer_warranty_months?: number;
    evaluation_score?: number;
    evaluation_notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("supplier_tenders")
    .update({
      ...details,
      status: "offer_received",
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId);

  if (error) {
    logger.error("Error saving offer details:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function selectWinner(
  tenderId: string,
  offerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  // Сначала снимаем статус победителя с других
  await supabase
    .from("supplier_tenders")
    .update({ status: "rejected" })
    .eq("tender_id", tenderId)
    .eq("status", "winner");

  // Устанавливаем нового победителя
  const { error } = await supabase
    .from("supplier_tenders")
    .update({ 
      status: "winner",
      role: "winner",
    })
    .eq("id", offerId);

  if (error) {
    logger.error("Error selecting winner:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function compareOffers(tenderId: string): Promise<OfferComparison> {
  const offers = await getTenderOffers(tenderId);
  
  // Фильтруем только те, у которых есть предложения
  const offersWithData = offers.filter(o => o.offer_amount);

  // Стандартные критерии
  const criteria: ComparisonCriteria[] = [
    { id: "price", name: "Цена", weight: 40, type: "price" },
    { id: "delivery", name: "Срок поставки", weight: 25, type: "days" },
    { id: "rating", name: "Рейтинг поставщика", weight: 20, type: "rating" },
    { id: "warranty", name: "Гарантия", weight: 15, type: "custom" },
  ];

  // Рекомендация (простая логика - минимальная цена)
  let recommendation: string | undefined;
  if (offersWithData.length > 0) {
    const minPrice = Math.min(...offersWithData.map(o => o.offer_amount || Infinity));
    const cheapest = offersWithData.find(o => o.offer_amount === minPrice);
    if (cheapest) {
      recommendation = `Рекомендуем: ${cheapest.supplier?.name || "Поставщик"} (лучшая цена)`;
    }
  }

  return {
    suppliers: offersWithData,
    criteria,
    recommendation,
  };
}

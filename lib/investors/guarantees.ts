"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import type {
  BankGuarantee,
  CreateGuaranteeInput,
  UpdateGuaranteeInput,
  GuaranteeStatus,
} from "./types";

// ============================================
// Банковские гарантии - CRUD операции
// ============================================

export async function getGuarantees(): Promise<BankGuarantee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("bank_guarantees")
    .select(`
      *,
      source:investment_sources(id, name, source_type),
      tender:tenders(id, subject, purchase_number)
    `)
    .eq("company_id", companyId)
    .order("end_date", { ascending: true });

  if (error) {
    logger.error("Error fetching guarantees:", error);
    return [];
  }

  return (data || []) as BankGuarantee[];
}

export async function getGuaranteeById(id: string): Promise<BankGuarantee | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("bank_guarantees")
    .select(`
      *,
      source:investment_sources(id, name, source_type),
      tender:tenders(id, subject, purchase_number)
    `)
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching guarantee:", error);
    return null;
  }

  return data as BankGuarantee;
}

export async function getGuaranteesByTender(tenderId: string): Promise<BankGuarantee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("bank_guarantees")
    .select(`
      *,
      source:investment_sources(id, name, source_type)
    `)
    .eq("company_id", companyId)
    .eq("tender_id", tenderId)
    .order("guarantee_type");

  if (error) {
    logger.error("Error fetching guarantees by tender:", error);
    return [];
  }

  return (data || []) as BankGuarantee[];
}

export async function createGuarantee(
  input: CreateGuaranteeInput
): Promise<{ success: boolean; data?: BankGuarantee; error?: string }> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  const companyId = await getCurrentCompanyId();

  if (!user || !companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { data, error } = await supabase
    .from("bank_guarantees")
    .insert({
      user_id: user.id,
      company_id: companyId,
      ...input,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating guarantee:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BankGuarantee };
}

export async function updateGuarantee(
  id: string,
  input: UpdateGuaranteeInput
): Promise<{ success: boolean; data?: BankGuarantee; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { data, error } = await supabase
    .from("bank_guarantees")
    .update(input)
    .eq("id", id)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    logger.error("Error updating guarantee:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as BankGuarantee };
}

export async function deleteGuarantee(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("bank_guarantees")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting guarantee:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// Статистика и аналитика
// ============================================

export interface GuaranteeStats {
  total: number;
  active: number;
  expiringSoon: number;
  totalAmount: number;
  totalCommission: number;
  byType: Record<string, { count: number; amount: number }>;
}

export async function getGuaranteeStats(): Promise<GuaranteeStats> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      total: 0,
      active: 0,
      expiringSoon: 0,
      totalAmount: 0,
      totalCommission: 0,
      byType: {},
    };
  }

  const { data: guarantees } = await supabase
    .from("bank_guarantees")
    .select("*")
    .eq("company_id", companyId);

  if (!guarantees || guarantees.length === 0) {
    return {
      total: 0,
      active: 0,
      expiringSoon: 0,
      totalAmount: 0,
      totalCommission: 0,
      byType: {},
    };
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const stats: GuaranteeStats = {
    total: guarantees.length,
    active: 0,
    expiringSoon: 0,
    totalAmount: 0,
    totalCommission: 0,
    byType: {},
  };

  for (const g of guarantees) {
    const endDate = new Date(g.end_date);

    if (g.status === "active") {
      stats.active++;
      stats.totalAmount += g.guarantee_amount || 0;

      if (endDate <= thirtyDaysFromNow && endDate > now) {
        stats.expiringSoon++;
      }
    }

    stats.totalCommission += g.commission_amount || 0;

    const gType = g.guarantee_type as string;
    if (!stats.byType[gType]) {
      stats.byType[gType] = { count: 0, amount: 0 };
    }
    stats.byType[gType].count++;
    stats.byType[gType].amount += g.guarantee_amount || 0;
  }

  return stats;
}

export async function getExpiringGuarantees(days: number = 30): Promise<BankGuarantee[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("bank_guarantees")
    .select(`
      *,
      source:investment_sources(id, name),
      tender:tenders(id, subject, purchase_number)
    `)
    .eq("company_id", companyId)
    .eq("status", "active")
    .gte("end_date", now.toISOString().split("T")[0])
    .lte("end_date", futureDate.toISOString().split("T")[0])
    .order("end_date", { ascending: true });

  if (error) {
    logger.error("Error fetching expiring guarantees:", error);
    return [];
  }

  return (data || []) as BankGuarantee[];
}

// ============================================
// Обновление статусов
// ============================================

export async function updateExpiredGuarantees(): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 0;

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("bank_guarantees")
    .update({ status: "expired" as GuaranteeStatus })
    .eq("company_id", companyId)
    .eq("status", "active")
    .lt("end_date", today)
    .select();

  if (error) {
    logger.error("Error updating expired guarantees:", error);
    return 0;
  }

  return data?.length || 0;
}

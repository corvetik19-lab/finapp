"use server";

import { createRSCClient } from "@/lib/supabase/server";
import type { Investment, InvestorAccess, InvestmentSource } from "./types";

// ============================================
// Логика портала инвестора
// ============================================

export interface InvestorSession {
  accessId: string;
  sourceId: string;
  sourceName: string;
  investorEmail: string;
  permissions: {
    canViewTenderDetails: boolean;
    canViewDocuments: boolean;
    canViewFinancials: boolean;
    canDownloadReports: boolean;
  };
}

export interface InvestorDashboardData {
  source: InvestmentSource;
  investments: Investment[];
  summary: {
    totalInvested: number;
    totalInterest: number;
    totalReturned: number;
    activeCount: number;
    completedCount: number;
  };
}

/**
 * Активация приглашения инвестора по токену
 */
export async function activateInvite(token: string, investorUserId: string): Promise<InvestorAccess> {
  const supabase = await createRSCClient();

  // Находим приглашение по токену
  const { data: access, error } = await supabase
    .from("investor_access")
    .select("*")
    .eq("invite_token", token)
    .eq("status", "pending")
    .single();

  if (error || !access) throw new Error("Приглашение не найдено или уже использовано");

  // Обновляем запись
  const { data: updated, error: updateError } = await supabase
    .from("investor_access")
    .update({
      investor_user_id: investorUserId,
      status: "active",
      activated_at: new Date().toISOString(),
    })
    .eq("id", access.id)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}

/**
 * Получение данных инвестора по его user_id
 */
export async function getInvestorAccesses(investorUserId: string): Promise<InvestorAccess[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("investor_access")
    .select(`
      *,
      source:investment_sources(*)
    `)
    .eq("investor_user_id", investorUserId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Получение инвестиций для инвестора
 */
export async function getInvestorInvestments(
  investorUserId: string,
  sourceId?: string
): Promise<Investment[]> {
  const supabase = await createRSCClient();

  // Сначала получаем доступы инвестора
  const accesses = await getInvestorAccesses(investorUserId);
  if (!accesses.length) return [];

  const sourceIds = sourceId 
    ? [sourceId] 
    : accesses.map((a) => a.source_id);

  // Получаем инвестиции по этим источникам
  const { data, error } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(id, name, source_type)
    `)
    .in("source_id", sourceIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Получение детальной информации об инвестиции для инвестора
 */
export async function getInvestorInvestmentDetails(
  investorUserId: string,
  investmentId: string
): Promise<Investment | null> {
  const supabase = await createRSCClient();

  // Проверяем доступ инвестора
  const accesses = await getInvestorAccesses(investorUserId);
  if (!accesses.length) return null;

  const sourceIds = accesses.map((a) => a.source_id);

  // Получаем инвестицию
  const { data, error } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources(*)
    `)
    .eq("id", investmentId)
    .in("source_id", sourceIds)
    .single();

  if (error) return null;
  return data;
}

/**
 * Получение данных для дашборда инвестора
 */
export async function getInvestorDashboard(
  investorUserId: string,
  sourceId: string
): Promise<InvestorDashboardData | null> {
  const supabase = await createRSCClient();

  // Проверяем доступ
  const accesses = await getInvestorAccesses(investorUserId);
  const access = accesses.find((a) => a.source_id === sourceId);
  if (!access) return null;

  // Получаем источник
  const { data: source } = await supabase
    .from("investment_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (!source) return null;

  // Получаем инвестиции
  const investments = await getInvestorInvestments(investorUserId, sourceId);

  // Подсчитываем статистику
  const activeInvestments = investments.filter(
    (i) => !["completed", "cancelled"].includes(i.status)
  );

  const summary = {
    totalInvested: activeInvestments.reduce((sum, i) => sum + i.approved_amount, 0),
    totalInterest: activeInvestments.reduce((sum, i) => sum + i.interest_amount, 0),
    totalReturned: investments.reduce(
      (sum, i) => sum + i.returned_principal + i.returned_interest, 0
    ),
    activeCount: activeInvestments.length,
    completedCount: investments.filter((i) => i.status === "completed").length,
  };

  return {
    source,
    investments,
    summary,
  };
}

/**
 * Проверка прав доступа инвестора
 */
export async function checkInvestorPermission(
  investorUserId: string,
  sourceId: string,
  permission: keyof InvestorSession["permissions"]
): Promise<boolean> {
  const accesses = await getInvestorAccesses(investorUserId);
  const access = accesses.find((a) => a.source_id === sourceId);
  
  if (!access) return false;

  switch (permission) {
    case "canViewTenderDetails":
      return access.can_view_tender_details;
    case "canViewDocuments":
      return access.can_view_documents;
    case "canViewFinancials":
      return access.can_view_financials;
    case "canDownloadReports":
      return access.can_download_reports;
    default:
      return false;
  }
}

/**
 * Получение информации о сессии инвестора
 */
export async function getInvestorSession(investorUserId: string): Promise<InvestorSession | null> {
  const accesses = await getInvestorAccesses(investorUserId);
  if (!accesses.length) return null;

  const access = accesses[0];
  
  return {
    accessId: access.id,
    sourceId: access.source_id,
    sourceName: access.source?.name || "",
    investorEmail: access.investor_email,
    permissions: {
      canViewTenderDetails: access.can_view_tender_details,
      canViewDocuments: access.can_view_documents,
      canViewFinancials: access.can_view_financials,
      canDownloadReports: access.can_download_reports,
    },
  };
}

/**
 * Проверка токена приглашения
 */
export async function validateInviteToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  sourceName?: string;
}> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("investor_access")
    .select(`
      investor_email,
      source:investment_sources(name)
    `)
    .eq("invite_token", token)
    .eq("status", "pending")
    .single();

  if (error || !data) {
    return { valid: false };
  }

  const sourceData = data.source as { name: string } | { name: string }[] | null;
  const sourceName = Array.isArray(sourceData) ? sourceData[0]?.name : sourceData?.name;
  
  return {
    valid: true,
    email: data.investor_email,
    sourceName,
  };
}

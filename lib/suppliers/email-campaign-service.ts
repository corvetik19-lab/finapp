"use server";

import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";

// =====================================================
// Сервис email-кампаний для поставщиков
// =====================================================

export interface EmailCampaign {
  id: string;
  company_id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  template_id?: string;
  recipient_filter?: Record<string, unknown>;
  recipient_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  supplier_id: string;
  contact_id?: string;
  email: string;
  status: "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed";
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error?: string;
  supplier?: {
    id: string;
    name: string;
  };
}

export interface CreateCampaignInput {
  name: string;
  subject: string;
  body: string;
  template_id?: string;
  recipient_filter?: Record<string, unknown>;
  scheduled_at?: string;
}

// =====================================================
// CRUD операции с кампаниями
// =====================================================

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await getCachedUser();
  return user?.id || null;
}

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_email_campaigns")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching email campaigns:", error);
    return [];
  }

  return (data || []) as EmailCampaign[];
}

export async function getCampaignById(campaignId: string): Promise<EmailCampaign | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("supplier_email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .single();

  if (error) {
    logger.error("Error fetching campaign:", error);
    return null;
  }

  return data as EmailCampaign;
}

export async function createCampaign(
  input: CreateCampaignInput
): Promise<{ success: boolean; campaign?: EmailCampaign; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  const { data, error } = await supabase
    .from("supplier_email_campaigns")
    .insert({
      company_id: companyId,
      user_id: userId,
      name: input.name,
      subject: input.subject,
      body: input.body,
      template_id: input.template_id,
      recipient_filter: input.recipient_filter,
      scheduled_at: input.scheduled_at,
      status: input.scheduled_at ? "scheduled" : "draft",
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating campaign:", error);
    return { success: false, error: "Ошибка создания кампании" };
  }

  return { success: true, campaign: data as EmailCampaign };
}

export async function updateCampaign(
  campaignId: string,
  input: Partial<CreateCampaignInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_email_campaigns")
    .update({
      ...input,
      status: input.scheduled_at ? "scheduled" : "draft",
    })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .eq("status", "draft"); // Можно редактировать только черновики

  if (error) {
    logger.error("Error updating campaign:", error);
    return { success: false, error: "Ошибка обновления кампании" };
  }

  return { success: true };
}

export async function deleteCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_email_campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .in("status", ["draft", "cancelled"]); // Можно удалять только черновики и отменённые

  if (error) {
    logger.error("Error deleting campaign:", error);
    return { success: false, error: "Ошибка удаления кампании" };
  }

  return { success: true };
}

// =====================================================
// Работа с получателями
// =====================================================

export async function getCampaignRecipients(
  campaignId: string
): Promise<CampaignRecipient[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_email_recipients")
    .select(`
      *,
      supplier:suppliers (
        id,
        name
      )
    `)
    .eq("campaign_id", campaignId)
    .order("created_at");

  if (error) {
    logger.error("Error fetching recipients:", error);
    return [];
  }

  return (data || []) as CampaignRecipient[];
}

export async function addRecipientsFromFilter(
  campaignId: string,
  filter: Record<string, unknown>
): Promise<{ success: boolean; addedCount: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, addedCount: 0, error: "Не авторизован" };
  }

  // Получаем поставщиков по фильтру
  let query = supabase
    .from("suppliers")
    .select("id, email")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .not("email", "is", null);

  // Применяем фильтры
  if (filter.categoryIds && Array.isArray(filter.categoryIds)) {
    query = query.in("category_id", filter.categoryIds);
  }
  if (filter.statuses && Array.isArray(filter.statuses)) {
    query = query.in("status", filter.statuses);
  }
  if (filter.ratingMin !== undefined) {
    query = query.gte("rating", filter.ratingMin);
  }
  if (filter.cities && Array.isArray(filter.cities)) {
    // Простой поиск по адресу
    const cityPattern = filter.cities.map((c: string) => `%${c}%`).join("|");
    query = query.or(`legal_address.ilike.${cityPattern},actual_address.ilike.${cityPattern}`);
  }

  const { data: suppliers, error: fetchError } = await query;

  if (fetchError) {
    logger.error("Error fetching suppliers for campaign:", fetchError);
    return { success: false, addedCount: 0, error: "Ошибка получения поставщиков" };
  }

  if (!suppliers || suppliers.length === 0) {
    return { success: true, addedCount: 0 };
  }

  // Добавляем получателей
  const recipients = suppliers
    .filter((s) => s.email)
    .map((s) => ({
      campaign_id: campaignId,
      supplier_id: s.id,
      email: s.email,
      status: "pending" as const,
    }));

  if (recipients.length === 0) {
    return { success: true, addedCount: 0 };
  }

  const { error: insertError } = await supabase
    .from("supplier_email_recipients")
    .upsert(recipients, {
      onConflict: "campaign_id,supplier_id",
      ignoreDuplicates: true,
    });

  if (insertError) {
    logger.error("Error adding recipients:", insertError);
    return { success: false, addedCount: 0, error: "Ошибка добавления получателей" };
  }

  // Обновляем счётчик в кампании
  await supabase
    .from("supplier_email_campaigns")
    .update({ recipient_count: recipients.length })
    .eq("id", campaignId);

  return { success: true, addedCount: recipients.length };
}

export async function removeRecipient(
  recipientId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("supplier_email_recipients")
    .delete()
    .eq("id", recipientId);

  if (error) {
    logger.error("Error removing recipient:", error);
    return { success: false, error: "Ошибка удаления получателя" };
  }

  return { success: true };
}

// =====================================================
// Отправка кампании
// =====================================================

export async function sendCampaign(
  campaignId: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, sentCount: 0, error: "Не авторизован" };
  }

  // Получаем кампанию
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return { success: false, sentCount: 0, error: "Кампания не найдена" };
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return { success: false, sentCount: 0, error: "Кампания уже отправлена" };
  }

  // Обновляем статус на "sending"
  await supabase
    .from("supplier_email_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  // Получаем получателей
  const recipients = await getCampaignRecipients(campaignId);
  const pendingRecipients = recipients.filter((r) => r.status === "pending");

  let sentCount = 0;

  // TODO: Интеграция с реальным email-провайдером (SendGrid, Mailgun, etc.)
  // Сейчас просто помечаем как отправленные

  for (const recipient of pendingRecipients) {
    // Симуляция отправки
    await supabase
      .from("supplier_email_recipients")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);

    sentCount++;
  }

  // Обновляем статус кампании
  await supabase
    .from("supplier_email_campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { success: true, sentCount };
}

export async function cancelCampaign(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_email_campaigns")
    .update({ status: "cancelled" })
    .eq("id", campaignId)
    .eq("company_id", companyId)
    .in("status", ["draft", "scheduled"]);

  if (error) {
    logger.error("Error cancelling campaign:", error);
    return { success: false, error: "Ошибка отмены кампании" };
  }

  return { success: true };
}

// =====================================================
// Статистика кампании
// =====================================================

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_email_recipients")
    .select("status")
    .eq("campaign_id", campaignId);

  if (error || !data) {
    return {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      openRate: 0,
      clickRate: 0,
    };
  }

  const stats = {
    total: data.length,
    sent: data.filter((r) => ["sent", "delivered", "opened", "clicked"].includes(r.status)).length,
    delivered: data.filter((r) => ["delivered", "opened", "clicked"].includes(r.status)).length,
    opened: data.filter((r) => ["opened", "clicked"].includes(r.status)).length,
    clicked: data.filter((r) => r.status === "clicked").length,
    bounced: data.filter((r) => r.status === "bounced").length,
    openRate: 0,
    clickRate: 0,
  };

  if (stats.sent > 0) {
    stats.openRate = Math.round((stats.opened / stats.sent) * 100);
    stats.clickRate = Math.round((stats.clicked / stats.sent) * 100);
  }

  return stats;
}

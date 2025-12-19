"use server";

import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logActivity } from "./tasks-service";
import { logger } from "@/lib/logger";

export interface EmailTemplate {
  id: string;
  company_id: string;
  name: string;
  subject: string;
  body: string;
  template_type: "request_quote" | "order" | "payment_reminder" | "general" | "contract";
  created_at: string;
  updated_at: string;
}

export interface SupplierEmail {
  id: string;
  company_id: string;
  supplier_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed";
  sent_at?: string;
  template_id?: string;
  user_id: string;
  created_at: string;
}

export interface SendEmailInput {
  supplier_id: string;
  to_email: string;
  subject: string;
  body: string;
  template_id?: string;
}

// EMAIL_TEMPLATE_TYPES перенесён в email-constants.ts

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await getCachedUser();
  return user?.id || null;
}

// Получить шаблоны писем
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_email_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) {
    logger.error("Error fetching email templates:", error);
    return [];
  }

  return (data || []) as EmailTemplate[];
}

// Создать шаблон
export async function createEmailTemplate(input: {
  name: string;
  subject: string;
  body: string;
  template_type: EmailTemplate["template_type"];
}): Promise<{ success: boolean; template?: EmailTemplate; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { data, error } = await supabase
    .from("supplier_email_templates")
    .insert({
      company_id: companyId,
      name: input.name,
      subject: input.subject,
      body: input.body,
      template_type: input.template_type,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating email template:", error);
    return { success: false, error: "Ошибка создания шаблона" };
  }

  return { success: true, template: data as EmailTemplate };
}

// Удалить шаблон
export async function deleteEmailTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_email_templates")
    .delete()
    .eq("id", templateId)
    .eq("company_id", companyId);

  if (error) {
    logger.error("Error deleting email template:", error);
    return { success: false, error: "Ошибка удаления шаблона" };
  }

  return { success: true };
}

// Получить историю писем поставщику
export async function getSupplierEmails(supplierId: string): Promise<SupplierEmail[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_emails")
    .select("*")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching supplier emails:", error);
    return [];
  }

  return (data || []) as SupplierEmail[];
}

// Отправить email (сохраняет в историю, реальная отправка требует интеграции)
export async function sendEmail(
  input: SendEmailInput
): Promise<{ success: boolean; email?: SupplierEmail; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  // Получаем email компании (из настроек или используем placeholder)
  const fromEmail = "noreply@company.com"; // TODO: брать из настроек компании

  const { data, error } = await supabase
    .from("supplier_emails")
    .insert({
      company_id: companyId,
      supplier_id: input.supplier_id,
      from_email: fromEmail,
      to_email: input.to_email,
      subject: input.subject,
      body: input.body,
      template_id: input.template_id,
      user_id: userId,
      status: "sent", // В реальности будет "draft" пока не отправлено
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    logger.error("Error sending email:", error);
    return { success: false, error: "Ошибка отправки письма" };
  }

  // Логируем активность
  await logActivity(
    input.supplier_id,
    "email_sent",
    `Отправлено письмо: ${input.subject}`,
    { email_id: data.id, to: input.to_email }
  );

  return { success: true, email: data as SupplierEmail };
}

// Применить шаблон с подстановкой переменных
export async function applyTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): Promise<{ subject: string; body: string }> {
  let subject = template.subject;
  let body = template.body;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g");
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  });

  return { subject, body };
}

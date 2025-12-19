"use server";

import crypto from "crypto";
import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { MangoSettings, MangoCallbackRequest, MangoWebhookEvent } from "./types";
import { logger } from "@/lib/logger";

const MANGO_API_BASE = "https://app.mango-office.ru/vpbx";

// =====================================================
// Утилиты для работы с Mango Office API
// =====================================================

function signRequest(apiKey: string, apiSalt: string, json: string): string {
  return crypto
    .createHash("sha256")
    .update(apiKey + json + apiSalt)
    .digest("hex");
}

async function getMangoCredentials(): Promise<MangoSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("mango_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (error) return null;
  return data as MangoSettings;
}

// =====================================================
// Инициация звонка (callback)
// =====================================================

export async function initiateCall(
  toNumber: string,
  fromExtension: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  const settings = await getMangoCredentials();

  if (!settings || !settings.is_enabled) {
    return { success: false, error: "Телефония не настроена или отключена" };
  }

  const commandId = crypto.randomUUID();

  const requestData: MangoCallbackRequest = {
    command_id: commandId,
    from: {
      extension: fromExtension,
    },
    to_number: toNumber.replace(/\D/g, ""),
  };

  const json = JSON.stringify(requestData);
  const sign = signRequest(settings.api_key, settings.api_salt, json);

  try {
    const response = await fetch(`${MANGO_API_BASE}/commands/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        vpbx_api_key: settings.api_key,
        sign,
        json,
      }),
    });

    const result = await response.json();

    if (result.result === 1000) {
      return { success: true, callId: result.call_id };
    }

    return {
      success: false,
      error: getMangoErrorMessage(result.result),
    };
  } catch (error) {
    logger.error("Error initiating call:", error);
    return { success: false, error: "Ошибка соединения с Mango Office" };
  }
}

// =====================================================
// Обработка webhook события
// =====================================================

export async function processWebhookEvent(
  event: MangoWebhookEvent,
  companyId: string
): Promise<void> {
  const supabase = await createRSCClient();

  // Определяем направление звонка
  const direction = event.from.extension ? "outbound" : "inbound";
  const phoneNumber = direction === "inbound" ? event.from.number : event.to.number;

  // Ищем поставщика по номеру телефона
  const { supplier, contact } = await findSupplierByPhoneInternal(
    phoneNumber,
    companyId
  );

  if (event.call_state === "Appeared") {
    // Новый звонок
    await supabase.from("call_history").insert({
      company_id: companyId,
      mango_call_id: event.call_id,
      mango_entry_id: event.entry_id,
      direction,
      from_number: event.from.number,
      to_number: event.to.number,
      extension: direction === "outbound" ? event.from.extension : event.to.extension,
      started_at: new Date(event.timestamp * 1000).toISOString(),
      status: "ringing",
      supplier_id: supplier?.id,
      contact_id: contact?.id,
    });
  } else if (event.call_state === "Connected") {
    // Звонок отвечен
    await supabase
      .from("call_history")
      .update({
        answered_at: new Date(event.timestamp * 1000).toISOString(),
        status: "answered",
      })
      .eq("mango_call_id", event.call_id);
  } else if (event.call_state === "Disconnected") {
    // Звонок завершён
    const status = event.disconnect_reason === 1110 ? "completed" : 
                   event.disconnect_reason === 1115 ? "missed" :
                   event.disconnect_reason === 1120 ? "busy" : "completed";

    await supabase
      .from("call_history")
      .update({
        ended_at: new Date(event.timestamp * 1000).toISOString(),
        talk_duration: event.talk_time || 0,
        duration: event.end_time && event.create_time 
          ? Math.floor((event.end_time - event.create_time) / 1000) 
          : 0,
        status,
      })
      .eq("mango_call_id", event.call_id);
  }
}

// =====================================================
// Получение записи разговора
// =====================================================

export async function getCallRecording(
  recordingId: string
): Promise<string | null> {
  const settings = await getMangoCredentials();

  if (!settings) return null;

  const requestData = {
    recording_id: recordingId,
    action: "download",
  };

  const json = JSON.stringify(requestData);
  const sign = signRequest(settings.api_key, settings.api_salt, json);

  try {
    const response = await fetch(`${MANGO_API_BASE}/queries/recording/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        vpbx_api_key: settings.api_key,
        sign,
        json,
      }),
    });

    if (response.ok) {
      // Mango возвращает URL для скачивания
      const result = await response.json();
      return result.url || null;
    }

    return null;
  } catch (error) {
    logger.error("Error getting recording:", error);
    return null;
  }
}

// =====================================================
// Внутренний поиск поставщика по телефону
// =====================================================

async function findSupplierByPhoneInternal(
  phone: string,
  companyId: string
): Promise<{ supplier: { id: string } | null; contact: { id: string } | null }> {
  const supabase = await createRSCClient();

  const normalizedPhone = phone.replace(/\D/g, "");
  const phoneVariants = [
    normalizedPhone,
    normalizedPhone.startsWith("7")
      ? "8" + normalizedPhone.slice(1)
      : normalizedPhone,
    normalizedPhone.length === 10 ? "7" + normalizedPhone : normalizedPhone,
    normalizedPhone.length === 10 ? "8" + normalizedPhone : normalizedPhone,
  ];

  // Ищем в контактах
  const { data: contacts } = await supabase
    .from("supplier_contacts")
    .select(`
      id,
      supplier:suppliers!inner(id, company_id)
    `)
    .eq("supplier.company_id", companyId)
    .is("supplier.deleted_at", null)
    .or(
      phoneVariants.map((p) => `phone.ilike.%${p}%`).join(",") +
        "," +
        phoneVariants.map((p) => `phone_mobile.ilike.%${p}%`).join(",")
    )
    .limit(1);

  if (contacts && contacts.length > 0) {
    const contact = contacts[0];
    return {
      supplier: { id: (contact.supplier as unknown as { id: string }).id },
      contact: { id: contact.id },
    };
  }

  // Ищем в основных телефонах поставщиков
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .or(phoneVariants.map((p) => `phone.ilike.%${p}%`).join(","))
    .limit(1);

  if (suppliers && suppliers.length > 0) {
    return {
      supplier: { id: suppliers[0].id },
      contact: null,
    };
  }

  return { supplier: null, contact: null };
}

// =====================================================
// Коды ошибок Mango Office
// =====================================================

function getMangoErrorMessage(code: number): string {
  const errors: Record<number, string> = {
    1000: "Успешно",
    2000: "Неверный ключ API",
    2001: "Неверная подпись",
    2002: "Неверный формат запроса",
    2003: "Превышен лимит запросов",
    2004: "Недостаточно средств",
    2100: "Внутренний номер не найден",
    2101: "Внешний номер недоступен",
    2102: "Номер заблокирован",
  };

  return errors[code] || `Неизвестная ошибка (код ${code})`;
}

// =====================================================
// Получение внутреннего номера пользователя
// =====================================================

export async function getUserExtension(userId: string): Promise<string | null> {
  const settings = await getMangoCredentials();

  if (!settings || !settings.extension_mapping) return null;

  return settings.extension_mapping[userId] || null;
}

// =====================================================
// Сохранение маппинга пользователей
// =====================================================

export async function updateExtensionMapping(
  mapping: Record<string, string>
): Promise<boolean> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return false;

  const { error } = await supabase
    .from("mango_settings")
    .update({ extension_mapping: mapping })
    .eq("company_id", companyId);

  return !error;
}

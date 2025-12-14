"use server";

import { createRSCClient, getCachedUser } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logActivity } from "./tasks-service";
import { SupplierPricelist } from "./types";

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await getCachedUser();
  return user?.id || null;
}

// Получить прайс-листы поставщика
export async function getSupplierPricelists(
  supplierId: string
): Promise<SupplierPricelist[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_pricelists")
    .select("*")
    .eq("company_id", companyId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching supplier pricelists:", error);
    return [];
  }

  return (data || []) as SupplierPricelist[];
}

// Загрузить прайс-лист
export async function uploadPricelist(input: {
  supplier_id: string;
  title: string;
  description?: string;
  file: File;
  valid_from?: string;
  valid_until?: string;
}): Promise<{ success: boolean; pricelist?: SupplierPricelist; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const userId = await getCurrentUserId();

  if (!companyId || !userId) {
    return { success: false, error: "Не авторизован" };
  }

  // Загружаем файл в Storage
  const fileExt = input.file.name.split(".").pop();
  const fileName = `${companyId}/${input.supplier_id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("supplier-pricelists")
    .upload(fileName, input.file);

  if (uploadError) {
    console.error("Error uploading pricelist file:", uploadError);
    return { success: false, error: "Ошибка загрузки файла" };
  }

  // Создаём запись в БД
  const { data, error } = await supabase
    .from("supplier_pricelists")
    .insert({
      company_id: companyId,
      supplier_id: input.supplier_id,
      title: input.title,
      description: input.description,
      file_path: fileName,
      file_name: input.file.name,
      file_size: input.file.size,
      file_type: input.file.type,
      valid_from: input.valid_from,
      valid_until: input.valid_until,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating pricelist record:", error);
    return { success: false, error: "Ошибка сохранения прайс-листа" };
  }

  // Логируем активность
  await logActivity(
    input.supplier_id,
    "file_uploaded",
    `Загружен прайс-лист: ${input.title}`,
    { pricelist_id: data.id }
  );

  return { success: true, pricelist: data as SupplierPricelist };
}

// Удалить прайс-лист
export async function deletePricelist(
  pricelistId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  // Получаем информацию о прайс-листе
  const { data: pricelist } = await supabase
    .from("supplier_pricelists")
    .select("file_path")
    .eq("id", pricelistId)
    .eq("company_id", companyId)
    .single();

  if (pricelist?.file_path) {
    // Удаляем файл из Storage
    await supabase.storage.from("supplier-pricelists").remove([pricelist.file_path]);
  }

  // Удаляем запись из БД
  const { error } = await supabase
    .from("supplier_pricelists")
    .delete()
    .eq("id", pricelistId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error deleting pricelist:", error);
    return { success: false, error: "Ошибка удаления прайс-листа" };
  }

  return { success: true };
}

// Установить прайс-лист активным/неактивным
export async function togglePricelistActive(
  pricelistId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }

  const { error } = await supabase
    .from("supplier_pricelists")
    .update({ is_active: isActive })
    .eq("id", pricelistId)
    .eq("company_id", companyId);

  if (error) {
    console.error("Error toggling pricelist active:", error);
    return { success: false, error: "Ошибка обновления" };
  }

  return { success: true };
}

// Получить URL для скачивания прайс-листа
export async function getPricelistDownloadUrl(
  filePath: string
): Promise<string | null> {
  const supabase = await createRSCClient();

  const { data } = await supabase.storage
    .from("supplier-pricelists")
    .createSignedUrl(filePath, 3600); // 1 час

  return data?.signedUrl || null;
}

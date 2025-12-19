"use server";

import { createRouteClient } from "@/lib/supabase/helpers";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import type { TransactionItem, TransactionItemInput } from "@/types/transaction";
import { logger } from "@/lib/logger";

/**
 * Создать позиции товаров для транзакции
 */
export async function createTransactionItems(
  transactionId: string,
  items: TransactionItemInput[]
): Promise<TransactionItem[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  if (items.length === 0) {
    return [];
  }

  // Получаем company_id
  const companyId = await getCurrentCompanyId();

  // Подготовка данных для вставки
  const itemsToInsert = items.map((item) => ({
    transaction_id: transactionId,
    user_id: user.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    price_per_unit: item.price_per_unit,
    total_amount: Math.round(item.quantity * item.price_per_unit),
    product_id: item.product_id || null, // связь с товаром из справочника
    company_id: companyId,
  }));

  const { data, error } = await supabase
    .from("transaction_items")
    .insert(itemsToInsert)
    .select();

  if (error) {
    logger.error("Error creating transaction items:", error);
    throw new Error(`Ошибка при создании позиций товаров: ${error.message}`);
  }

  return data as TransactionItem[];
}

/**
 * Получить позиции товаров для транзакции
 * Использует VIEW для получения актуальных данных из справочника товаров
 */
export async function getTransactionItems(transactionId: string): Promise<TransactionItem[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  // Используем VIEW для получения актуальных данных из product_items
  const { data, error } = await supabase
    .from("transaction_items_with_products")
    .select("id, transaction_id, user_id, name, quantity, unit, price_per_unit, total_amount, product_id, category_id, category_name, created_at, updated_at")
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Error fetching transaction items:", error);
    throw new Error(`Ошибка при получении позиций товаров: ${error.message}`);
  }

  return (data as TransactionItem[]) || [];
}

/**
 * Обновить позиции товаров для транзакции
 * Удаляет старые и создаёт новые
 */
export async function updateTransactionItems(
  transactionId: string,
  items: TransactionItemInput[]
): Promise<TransactionItem[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  // Удаляем старые позиции
  const { error: deleteError } = await supabase
    .from("transaction_items")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id);

  if (deleteError) {
    logger.error("Error deleting old transaction items:", deleteError);
    throw new Error(`Ошибка при удалении старых позиций: ${deleteError.message}`);
  }

  // Создаём новые позиции
  if (items.length === 0) {
    return [];
  }

  return createTransactionItems(transactionId, items);
}

/**
 * Удалить все позиции товаров для транзакции
 */
export async function deleteTransactionItems(transactionId: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const { error } = await supabase
    .from("transaction_items")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id);

  if (error) {
    logger.error("Error deleting transaction items:", error);
    throw new Error(`Ошибка при удалении позиций товаров: ${error.message}`);
  }
}


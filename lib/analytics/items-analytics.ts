"use server";

import { createRouteClient } from "@/lib/supabase/helpers";

export type ItemAnalytics = {
  name: string;
  totalQuantity: number;
  totalAmount: number;
  avgPrice: number;
  purchaseCount: number;
  lastPurchaseDate: string;
  unit: string;
};

export type ItemTrend = {
  name: string;
  month: string;
  quantity: number;
  amount: number;
};

export type CategoryItemsAnalytics = {
  categoryName: string;
  items: ItemAnalytics[];
  totalAmount: number;
};

/**
 * Получить топ покупаемых товаров
 */
export async function getTopItems(limit: number = 20): Promise<ItemAnalytics[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const { data, error } = await supabase
    .from("transaction_items")
    .select("name, quantity, unit, price_per_unit, total_amount, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching top items:", error);
    throw new Error(`Ошибка при получении данных: ${error.message}`);
  }

  // Группируем по названию товара
  const itemsMap = new Map<string, ItemAnalytics>();

  for (const item of data || []) {
    const existing = itemsMap.get(item.name);
    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.totalAmount += item.total_amount;
      existing.purchaseCount += 1;
      existing.avgPrice = existing.totalAmount / existing.totalQuantity;
      if (new Date(item.created_at) > new Date(existing.lastPurchaseDate)) {
        existing.lastPurchaseDate = item.created_at;
      }
    } else {
      itemsMap.set(item.name, {
        name: item.name,
        totalQuantity: item.quantity,
        totalAmount: item.total_amount,
        avgPrice: item.price_per_unit,
        purchaseCount: 1,
        lastPurchaseDate: item.created_at,
        unit: item.unit,
      });
    }
  }

  // Сортируем по общей сумме и берём топ
  const sortedItems = Array.from(itemsMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);

  return sortedItems;
}

/**
 * Получить тренды покупок товаров по месяцам
 */
export async function getItemTrends(itemName: string): Promise<ItemTrend[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const { data, error } = await supabase
    .from("transaction_items")
    .select("name, quantity, total_amount, created_at")
    .eq("user_id", user.id)
    .eq("name", itemName)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching item trends:", error);
    throw new Error(`Ошибка при получении трендов: ${error.message}`);
  }

  // Группируем по месяцам
  const trendsMap = new Map<string, { quantity: number; amount: number }>();

  for (const item of data || []) {
    const date = new Date(item.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const existing = trendsMap.get(monthKey);
    if (existing) {
      existing.quantity += item.quantity;
      existing.amount += item.total_amount;
    } else {
      trendsMap.set(monthKey, {
        quantity: item.quantity,
        amount: item.total_amount,
      });
    }
  }

  // Преобразуем в массив
  const trends: ItemTrend[] = Array.from(trendsMap.entries()).map(([month, data]) => ({
    name: itemName,
    month,
    quantity: data.quantity,
    amount: data.amount,
  }));

  return trends;
}

/**
 * Получить аналитику по товарам в разрезе категорий
 */
export async function getItemsByCategory(): Promise<CategoryItemsAnalytics[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  // Получаем транзакции с позициями и категориями
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select(`
      id,
      category_id,
      categories (
        name
      )
    `)
    .eq("user_id", user.id)
    .not("category_id", "is", null);

  if (txError) {
    console.error("Error fetching transactions:", txError);
    throw new Error(`Ошибка при получении транзакций: ${txError.message}`);
  }

  // Получаем все позиции товаров
  const { data: items, error: itemsError } = await supabase
    .from("transaction_items")
    .select("*")
    .eq("user_id", user.id);

  if (itemsError) {
    console.error("Error fetching items:", itemsError);
    throw new Error(`Ошибка при получении позиций: ${itemsError.message}`);
  }

  // Группируем по категориям
  const categoryMap = new Map<string, Map<string, ItemAnalytics>>();

  for (const tx of transactions || []) {
    const categories = tx.categories as unknown as { name: string } | null;
    const categoryName = categories?.name || "Без категории";
    const txItems = items?.filter((item) => item.transaction_id === tx.id) || [];

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, new Map());
    }

    const itemsMap = categoryMap.get(categoryName)!;

    for (const item of txItems) {
      const existing = itemsMap.get(item.name);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalAmount += item.total_amount;
        existing.purchaseCount += 1;
        existing.avgPrice = existing.totalAmount / existing.totalQuantity;
        if (new Date(item.created_at) > new Date(existing.lastPurchaseDate)) {
          existing.lastPurchaseDate = item.created_at;
        }
      } else {
        itemsMap.set(item.name, {
          name: item.name,
          totalQuantity: item.quantity,
          totalAmount: item.total_amount,
          avgPrice: item.price_per_unit,
          purchaseCount: 1,
          lastPurchaseDate: item.created_at,
          unit: item.unit,
        });
      }
    }
  }

  // Преобразуем в массив
  const result: CategoryItemsAnalytics[] = Array.from(categoryMap.entries()).map(
    ([categoryName, itemsMap]) => {
      const items = Array.from(itemsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
      const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);

      return {
        categoryName,
        items,
        totalAmount,
      };
    }
  );

  // Сортируем категории по общей сумме
  result.sort((a, b) => b.totalAmount - a.totalAmount);

  return result;
}

"use server";

import { createRouteClient } from "@/lib/supabase/helpers";
import type { ProductItem, ProductItemInput, ProductItemUpdate } from "@/types/product-item";
import { getCurrentCompanyId } from "@/lib/platform/organization";

/**
 * Получить все активные товары пользователя
 */
export async function getProductItems(
  activeOnly: boolean = true,
  categoryType?: "income" | "expense"
): Promise<ProductItem[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const companyId = await getCurrentCompanyId();

  let query = supabase
    .from("product_items")
    .select(`
      *,
      categories:category_id (
        id,
        name,
        kind
      )
    `)
    .eq("user_id", user.id);

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  query = query.order("name", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching product items:", error);
    throw new Error(`Ошибка при получении товаров: ${error.message}`);
  }

  let items = (data as ProductItem[]) || [];

  // Фильтруем по типу категории на клиенте
  if (categoryType) {
    items = items.filter((item) => {
      // Если у товара нет категории, показываем его всегда
      if (!item.categories) return true;
      
      // Если категория "both", проверяем category_type товара
      if (item.categories.kind === "both") {
        return item.category_type === categoryType;
      }
      
      // Иначе проверяем kind категории
      return item.categories.kind === categoryType;
    });
  }

  return items;
}

/**
 * Поиск товаров по названию (для автодополнения)
 */
export async function searchProductItems(
  query: string,
  categoryType?: "income" | "expense"
): Promise<ProductItem[]> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const companyId = await getCurrentCompanyId();

  let dbQuery = supabase
    .from("product_items")
    .select(`
      *,
      categories:category_id (
        id,
        name,
        kind
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(50); // Увеличиваем лимит для фильтрации на клиенте

  if (companyId) {
    dbQuery = dbQuery.eq("company_id", companyId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error("Error searching product items:", error);
    throw new Error(`Ошибка при поиске товаров: ${error.message}`);
  }

  let items = (data as ProductItem[]) || [];

  // Фильтруем по типу категории на клиенте
  if (categoryType) {
    items = items.filter((item) => {
      // Если у товара нет категории, показываем его всегда
      if (!item.categories) return true;
      
      // Если категория "both", проверяем category_type товара
      if (item.categories.kind === "both") {
        return item.category_type === categoryType;
      }
      
      // Иначе проверяем kind категории
      return item.categories.kind === categoryType;
    });
  }

  // Ограничиваем результат до 10 товаров после фильтрации
  return items.slice(0, 10);
}

/**
 * Создать новый товар
 */
export async function createProductItem(input: ProductItemInput): Promise<ProductItem> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const companyId = await getCurrentCompanyId();

  const { data, error } = await supabase
    .from("product_items")
    .insert({
      user_id: user.id,
      company_id: companyId,
      name: input.name,
      default_unit: input.default_unit,
      default_price_per_unit: input.default_price_per_unit || null,
      category_id: input.category_id || null,
      category_type: input.category_type || null,
      description: input.description || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating product item:", error);
    throw new Error(`Ошибка при создании товара: ${error.message}`);
  }

  return data as ProductItem;
}

/**
 * Обновить товар
 */
export async function updateProductItem(update: ProductItemUpdate): Promise<ProductItem> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  const updateData: Partial<Omit<ProductItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {};
  if (update.name !== undefined) updateData.name = update.name;
  if (update.default_unit !== undefined) updateData.default_unit = update.default_unit;
  if (update.default_price_per_unit !== undefined) updateData.default_price_per_unit = update.default_price_per_unit;
  if (update.category_id !== undefined) updateData.category_id = update.category_id;
  if (update.category_type !== undefined) updateData.category_type = update.category_type;
  if (update.description !== undefined) updateData.description = update.description;
  if (update.is_active !== undefined) updateData.is_active = update.is_active;

  const { data, error } = await supabase
    .from("product_items")
    .update(updateData)
    .eq("id", update.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating product item:", error);
    throw new Error(`Ошибка при обновлении товара: ${error.message}`);
  }

  return data as ProductItem;
}

/**
 * Удалить товар (мягкое удаление - деактивация)
 */
export async function deleteProductItem(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  // Сначала получаем название товара
  const { data: productData, error: productError } = await supabase
    .from("product_items")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (productError) {
    console.error("Error fetching product item:", productError);
    throw new Error(`Ошибка при получении товара: ${productError.message}`);
  }

  // Проверяем, используется ли товар в транзакциях
  const { data: usageCheck, error: checkError } = await supabase
    .from("transaction_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", productData.name)
    .limit(1);

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking product usage:", checkError);
    throw new Error(`Ошибка при проверке использования товара: ${checkError.message}`);
  }

  if (usageCheck && usageCheck.length > 0) {
    throw new Error("Невозможно удалить товар, так как он используется в транзакциях");
  }

  // Мягкое удаление - деактивация
  const { error } = await supabase
    .from("product_items")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting product item:", error);
    throw new Error(`Ошибка при удалении товара: ${error.message}`);
  }
}

/**
 * Полное удаление товара (физическое удаление из БД)
 */
export async function permanentDeleteProductItem(id: string): Promise<void> {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Пользователь не авторизован");
  }

  // Сначала получаем название товара
  const { data: productData, error: productError } = await supabase
    .from("product_items")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (productError) {
    console.error("Error fetching product item:", productError);
    throw new Error(`Ошибка при получении товара: ${productError.message}`);
  }

  // Проверяем, используется ли товар в транзакциях
  const { data: usageCheck, error: checkError } = await supabase
    .from("transaction_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", productData.name)
    .limit(1);

  if (checkError && checkError.code !== "PGRST116") {
    console.error("Error checking product usage:", checkError);
    throw new Error(`Ошибка при проверке использования товара: ${checkError.message}`);
  }

  if (usageCheck && usageCheck.length > 0) {
    throw new Error("Невозможно удалить товар, так как он используется в транзакциях");
  }

  const { error } = await supabase
    .from("product_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error permanently deleting product item:", error);
    throw new Error(`Ошибка при удалении товара: ${error.message}`);
  }
}

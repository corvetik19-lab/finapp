"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { logger } from "@/lib/logger";
import {
  WarehouseLocation,
  WarehouseItem,
  WarehouseStock,
  WarehouseDocument,
  WarehouseMovement,
  WarehouseSummary,
  CreateWarehouseInput,
  CreateItemInput,
  CreateDocumentInput,
} from "./types";

// ============================================
// Склады
// ============================================

export async function getWarehouses(): Promise<WarehouseLocation[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("warehouse_locations")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    logger.error("Error fetching warehouses:", error);
    return [];
  }

  return data || [];
}

export async function createWarehouse(
  input: CreateWarehouseInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data, error } = await supabase
    .from("warehouse_locations")
    .insert({
      company_id: companyId,
      name: input.name,
      code: input.code,
      address: input.address,
      responsible_person: input.responsible_person,
      warehouse_type: input.warehouse_type || "main",
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating warehouse:", error);
    return { success: false, error: "Ошибка создания склада" };
  }

  return { success: true, id: data.id };
}

// ============================================
// Номенклатура
// ============================================

export async function getWarehouseItems(filters?: {
  category?: string;
  tenderId?: string;
}): Promise<WarehouseItem[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("warehouse_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.tenderId) {
    query = query.eq("tender_id", filters.tenderId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching warehouse items:", error);
    return [];
  }

  return data || [];
}

export async function createWarehouseItem(
  input: CreateItemInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data, error } = await supabase
    .from("warehouse_items")
    .insert({
      company_id: companyId,
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      category: input.category,
      subcategory: input.subcategory,
      unit_name: input.unit_name || "шт",
      purchase_price: input.purchase_price || 0,
      selling_price: input.selling_price || 0,
      vat_rate: input.vat_rate || 20,
      min_stock: input.min_stock || 0,
      tender_id: input.tender_id,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) {
    logger.error("Error creating warehouse item:", error);
    return { success: false, error: "Ошибка создания товара" };
  }

  return { success: true, id: data.id };
}

// ============================================
// Остатки
// ============================================

export async function getStock(filters?: {
  warehouseId?: string;
  itemId?: string;
  lowStock?: boolean;
}): Promise<WarehouseStock[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("warehouse_stock")
    .select(`
      *,
      warehouse:warehouse_locations(*),
      item:warehouse_items(*)
    `)
    .eq("company_id", companyId);

  if (filters?.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId);
  }
  if (filters?.itemId) {
    query = query.eq("item_id", filters.itemId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching stock:", error);
    return [];
  }

  let result = (data || []).map((s) => ({
    ...s,
    warehouse: Array.isArray(s.warehouse) ? s.warehouse[0] : s.warehouse,
    item: Array.isArray(s.item) ? s.item[0] : s.item,
  }));

  // Фильтруем низкие остатки
  if (filters?.lowStock) {
    result = result.filter((s) => s.item && s.quantity <= s.item.min_stock);
  }

  return result;
}

export async function getItemStock(itemId: string): Promise<WarehouseStock[]> {
  return getStock({ itemId });
}

// ============================================
// Документы
// ============================================

export async function getWarehouseDocuments(filters?: {
  documentType?: string;
  warehouseId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<WarehouseDocument[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("warehouse_documents")
    .select(`
      *,
      warehouse:warehouse_locations!warehouse_id(*),
      target_warehouse:warehouse_locations!target_warehouse_id(*)
    `)
    .eq("company_id", companyId)
    .order("document_date", { ascending: false })
    .order("document_number", { ascending: false });

  if (filters?.documentType) {
    query = query.eq("document_type", filters.documentType);
  }
  if (filters?.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("document_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("document_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching warehouse documents:", error);
    return [];
  }

  return (data || []).map((d) => ({
    ...d,
    warehouse: Array.isArray(d.warehouse) ? d.warehouse[0] : d.warehouse,
    target_warehouse: Array.isArray(d.target_warehouse) ? d.target_warehouse[0] : d.target_warehouse,
  }));
}

export async function getWarehouseDocument(id: string): Promise<WarehouseDocument | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data: doc, error } = await supabase
    .from("warehouse_documents")
    .select(`
      *,
      warehouse:warehouse_locations!warehouse_id(*),
      target_warehouse:warehouse_locations!target_warehouse_id(*)
    `)
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error || !doc) {
    logger.error("Error fetching warehouse document:", error);
    return null;
  }

  // Получаем позиции
  const { data: items } = await supabase
    .from("warehouse_document_items")
    .select(`
      *,
      item:warehouse_items(*)
    `)
    .eq("document_id", id)
    .order("position", { ascending: true });

  return {
    ...doc,
    warehouse: Array.isArray(doc.warehouse) ? doc.warehouse[0] : doc.warehouse,
    target_warehouse: Array.isArray(doc.target_warehouse) ? doc.target_warehouse[0] : doc.target_warehouse,
    items: (items || []).map((i) => ({
      ...i,
      item: Array.isArray(i.item) ? i.item[0] : i.item,
    })),
  };
}

export async function getNextDocumentNumber(documentType: string): Promise<number> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return 1;

  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data } = await supabase
    .from("warehouse_documents")
    .select("document_number")
    .eq("company_id", companyId)
    .eq("document_type", documentType)
    .gte("document_date", startOfYear)
    .order("document_number", { ascending: false })
    .limit(1)
    .single();

  return (data?.document_number || 0) + 1;
}

export async function createWarehouseDocument(
  input: CreateDocumentInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();
  const documentNumber = await getNextDocumentNumber(input.document_type);

  // Считаем итоги
  const totalQuantity = input.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = input.items.reduce((sum, i) => sum + Math.round(i.quantity * i.price), 0);

  // Создаём документ
  const { data: doc, error: docError } = await supabase
    .from("warehouse_documents")
    .insert({
      company_id: companyId,
      document_type: input.document_type,
      document_number: documentNumber,
      document_date: input.document_date,
      warehouse_id: input.warehouse_id,
      target_warehouse_id: input.target_warehouse_id,
      counterparty_id: input.counterparty_id,
      counterparty_name: input.counterparty_name,
      tender_id: input.tender_id,
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      notes: input.notes,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (docError || !doc) {
    logger.error("Error creating warehouse document:", docError);
    return { success: false, error: "Ошибка создания документа" };
  }

  // Создаём позиции
  const items = input.items.map((item, index) => ({
    document_id: doc.id,
    item_id: item.item_id,
    quantity: item.quantity,
    price: item.price,
    vat_rate: item.vat_rate || 20,
    position: index + 1,
    notes: item.notes,
  }));

  const { error: itemsError } = await supabase
    .from("warehouse_document_items")
    .insert(items);

  if (itemsError) {
    logger.error("Error creating document items:", itemsError);
  }

  return { success: true, id: doc.id };
}

export async function confirmDocument(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("warehouse_documents")
    .update({
      status: "confirmed",
      confirmed_by: user?.user?.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error confirming document:", error);
    return { success: false, error: "Ошибка проведения документа" };
  }

  return { success: true };
}

export async function cancelDocument(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const { error } = await supabase
    .from("warehouse_documents")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("status", "draft");

  if (error) {
    logger.error("Error cancelling document:", error);
    return { success: false, error: "Ошибка отмены документа" };
  }

  return { success: true };
}

// ============================================
// Движения
// ============================================

export async function getMovements(filters?: {
  warehouseId?: string;
  itemId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<WarehouseMovement[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("warehouse_movements")
    .select(`
      *,
      warehouse:warehouse_locations(*),
      item:warehouse_items(*)
    `)
    .eq("company_id", companyId)
    .order("movement_date", { ascending: false });

  if (filters?.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId);
  }
  if (filters?.itemId) {
    query = query.eq("item_id", filters.itemId);
  }
  if (filters?.startDate) {
    query = query.gte("movement_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("movement_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching movements:", error);
    return [];
  }

  return (data || []).map((m) => ({
    ...m,
    warehouse: Array.isArray(m.warehouse) ? m.warehouse[0] : m.warehouse,
    item: Array.isArray(m.item) ? m.item[0] : m.item,
  }));
}

// ============================================
// Сводка
// ============================================

export async function getWarehouseSummary(warehouseId?: string): Promise<WarehouseSummary> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  const emptySummary: WarehouseSummary = {
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  if (!companyId) return emptySummary;

  let query = supabase
    .from("warehouse_stock")
    .select(`
      quantity,
      total_cost,
      item:warehouse_items(min_stock)
    `)
    .eq("company_id", companyId);

  if (warehouseId) {
    query = query.eq("warehouse_id", warehouseId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Error fetching warehouse summary:", error);
    return emptySummary;
  }

  const stock = data || [];

  return {
    totalItems: stock.length,
    totalQuantity: stock.reduce((sum, s) => sum + (s.quantity || 0), 0),
    totalValue: stock.reduce((sum, s) => sum + (s.total_cost || 0), 0),
    lowStockCount: stock.filter((s) => {
      const item = Array.isArray(s.item) ? s.item[0] : s.item;
      return item && s.quantity > 0 && s.quantity <= (item.min_stock || 0);
    }).length,
    outOfStockCount: stock.filter((s) => s.quantity <= 0).length,
  };
}

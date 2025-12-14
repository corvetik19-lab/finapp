"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import {
  Supplier,
  SupplierCategory,
  SupplierContact,
  SupplierNote,
  SupplierFile,
  SupplierTender,
  CallHistory,
  MangoSettings,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreateSupplierContactInput,
  UpdateSupplierContactInput,
  CreateSupplierNoteInput,
  CreateSupplierFileInput,
  CreateSupplierTenderInput,
  SuppliersFilter,
  CallHistoryFilter,
  SaveMangoSettingsInput,
} from "./types";

// =====================================================
// Категории поставщиков
// =====================================================

export async function getSupplierCategories(): Promise<SupplierCategory[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  const { data, error } = await supabase
    .from("supplier_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order");

  if (error) {
    console.error("Error fetching supplier categories:", error);
    return [];
  }

  return data as SupplierCategory[];
}

export async function createSupplierCategory(
  name: string,
  color?: string,
  icon?: string
): Promise<SupplierCategory | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("supplier_categories")
    .insert({
      company_id: companyId,
      name,
      color: color || "#6366f1",
      icon: icon || "Package",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating supplier category:", error);
    return null;
  }

  return data as SupplierCategory;
}

export async function updateSupplierCategory(
  id: string,
  updates: { name?: string; color?: string; icon?: string; sort_order?: number }
): Promise<SupplierCategory | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating supplier category:", error);
    return null;
  }

  return data as SupplierCategory;
}

export async function deleteSupplierCategory(id: string): Promise<boolean> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("supplier_categories")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting supplier category:", error);
    return false;
  }

  return true;
}

// =====================================================
// Поставщики
// =====================================================

export async function getSuppliers(
  filter?: SuppliersFilter
): Promise<Supplier[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("suppliers")
    .select(`
      *,
      category:supplier_categories(id, name, color, icon),
      contacts:supplier_contacts(id, name, phone, phone_mobile, is_primary)
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (filter?.search) {
    query = query.or(
      `name.ilike.%${filter.search}%,inn.ilike.%${filter.search}%,short_name.ilike.%${filter.search}%`
    );
  }

  if (filter?.category_id) {
    query = query.eq("category_id", filter.category_id);
  }

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  if (filter?.rating) {
    query = query.eq("rating", filter.rating);
  }

  const { data, error } = await query.order("name");

  if (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }

  return data as Supplier[];
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select(`
      *,
      category:supplier_categories(id, name, color, icon)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching supplier:", error);
    return null;
  }

  return data as Supplier;
}

export async function createSupplier(
  input: Omit<CreateSupplierInput, "company_id" | "user_id">
): Promise<Supplier | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!companyId || !user) return null;

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      ...input,
      company_id: companyId,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating supplier:", error);
    return null;
  }

  return data as Supplier;
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput
): Promise<Supplier | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating supplier:", error);
    return null;
  }

  return data as Supplier;
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const supabase = await createRSCClient();

  // Soft delete
  const { error } = await supabase
    .from("suppliers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error deleting supplier:", error);
    return false;
  }

  return true;
}

// =====================================================
// Контакты поставщиков
// =====================================================

export async function getSupplierContacts(
  supplierId: string
): Promise<SupplierContact[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_contacts")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("is_primary", { ascending: false })
    .order("name");

  if (error) {
    console.error("Error fetching supplier contacts:", error);
    return [];
  }

  return data as SupplierContact[];
}

export async function createSupplierContact(
  input: CreateSupplierContactInput
): Promise<SupplierContact | null> {
  const supabase = await createRSCClient();

  // Если это основной контакт, сбрасываем флаг у других
  if (input.is_primary) {
    await supabase
      .from("supplier_contacts")
      .update({ is_primary: false })
      .eq("supplier_id", input.supplier_id);
  }

  const { data, error } = await supabase
    .from("supplier_contacts")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error creating supplier contact:", error);
    return null;
  }

  return data as SupplierContact;
}

export async function updateSupplierContact(
  id: string,
  supplierId: string,
  input: UpdateSupplierContactInput
): Promise<SupplierContact | null> {
  const supabase = await createRSCClient();

  // Если это основной контакт, сбрасываем флаг у других
  if (input.is_primary) {
    await supabase
      .from("supplier_contacts")
      .update({ is_primary: false })
      .eq("supplier_id", supplierId)
      .neq("id", id);
  }

  const { data, error } = await supabase
    .from("supplier_contacts")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating supplier contact:", error);
    return null;
  }

  return data as SupplierContact;
}

export async function deleteSupplierContact(id: string): Promise<boolean> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("supplier_contacts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting supplier contact:", error);
    return false;
  }

  return true;
}

// =====================================================
// Заметки поставщиков
// =====================================================

export async function getSupplierNotes(
  supplierId: string
): Promise<SupplierNote[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_notes")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching supplier notes:", error);
    return [];
  }

  return data as SupplierNote[];
}

export async function createSupplierNote(
  input: Omit<CreateSupplierNoteInput, "user_id">
): Promise<SupplierNote | null> {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("supplier_notes")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating supplier note:", error);
    return null;
  }

  return data as SupplierNote;
}

export async function updateSupplierNote(
  id: string,
  updates: { title?: string; content?: string; is_pinned?: boolean }
): Promise<SupplierNote | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_notes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating supplier note:", error);
    return null;
  }

  return data as SupplierNote;
}

export async function deleteSupplierNote(id: string): Promise<boolean> {
  const supabase = await createRSCClient();

  const { error } = await supabase.from("supplier_notes").delete().eq("id", id);

  if (error) {
    console.error("Error deleting supplier note:", error);
    return false;
  }

  return true;
}

// =====================================================
// Файлы поставщиков
// =====================================================

export async function getSupplierFiles(
  supplierId: string
): Promise<SupplierFile[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_files")
    .select(`
      *,
      tender:tenders(id, purchase_number, subject)
    `)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching supplier files:", error);
    return [];
  }

  return data as SupplierFile[];
}

export async function createSupplierFile(
  input: Omit<CreateSupplierFileInput, "user_id">
): Promise<SupplierFile | null> {
  const supabase = await createRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("supplier_files")
    .insert({
      ...input,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating supplier file:", error);
    return null;
  }

  return data as SupplierFile;
}

export async function deleteSupplierFile(id: string): Promise<boolean> {
  const supabase = await createRSCClient();

  // Получаем файл для удаления из storage
  const { data: file } = await supabase
    .from("supplier_files")
    .select("file_path")
    .eq("id", id)
    .single();

  if (file?.file_path) {
    await supabase.storage.from("supplier-files").remove([file.file_path]);
  }

  const { error } = await supabase.from("supplier_files").delete().eq("id", id);

  if (error) {
    console.error("Error deleting supplier file:", error);
    return false;
  }

  return true;
}

// =====================================================
// Связь с тендерами
// =====================================================

export async function getSupplierTenders(
  supplierId: string
): Promise<SupplierTender[]> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_tenders")
    .select(`
      *,
      tender:tenders(id, purchase_number, subject, status, our_price, bid_price)
    `)
    .eq("supplier_id", supplierId)
    .order("invited_at", { ascending: false });

  if (error) {
    console.error("Error fetching supplier tenders:", error);
    return [];
  }

  return data as SupplierTender[];
}

export async function addSupplierToTender(
  input: CreateSupplierTenderInput
): Promise<SupplierTender | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_tenders")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error adding supplier to tender:", error);
    return null;
  }

  return data as SupplierTender;
}

export async function updateSupplierTender(
  id: string,
  updates: Partial<CreateSupplierTenderInput>
): Promise<SupplierTender | null> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase
    .from("supplier_tenders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating supplier tender:", error);
    return null;
  }

  return data as SupplierTender;
}

export async function removeSupplierFromTender(id: string): Promise<boolean> {
  const supabase = await createRSCClient();

  const { error } = await supabase
    .from("supplier_tenders")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error removing supplier from tender:", error);
    return false;
  }

  return true;
}

// =====================================================
// История звонков
// =====================================================

export async function getCallHistory(
  filter?: CallHistoryFilter
): Promise<CallHistory[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return [];

  let query = supabase
    .from("call_history")
    .select(`
      *,
      supplier:suppliers(id, name, short_name),
      contact:supplier_contacts(id, name, position)
    `)
    .eq("company_id", companyId);

  if (filter?.supplier_id) {
    query = query.eq("supplier_id", filter.supplier_id);
  }

  if (filter?.direction) {
    query = query.eq("direction", filter.direction);
  }

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  if (filter?.date_from) {
    query = query.gte("started_at", filter.date_from);
  }

  if (filter?.date_to) {
    query = query.lte("started_at", filter.date_to);
  }

  const { data, error } = await query
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching call history:", error);
    return [];
  }

  return data as CallHistory[];
}

export async function getSupplierCalls(
  supplierId: string
): Promise<CallHistory[]> {
  return getCallHistory({ supplier_id: supplierId });
}

// =====================================================
// Настройки Mango Office
// =====================================================

export async function getMangoSettings(): Promise<MangoSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("mango_settings")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching mango settings:", error);
    return null;
  }

  return data as MangoSettings | null;
}

export async function saveMangoSettings(
  input: Omit<SaveMangoSettingsInput, "company_id">
): Promise<MangoSettings | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return null;

  const { data, error } = await supabase
    .from("mango_settings")
    .upsert({
      ...input,
      company_id: companyId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving mango settings:", error);
    return null;
  }

  return data as MangoSettings;
}

// =====================================================
// Статистика
// =====================================================

export async function getSuppliersStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  blacklisted: number;
  withTenders: number;
  categories: { id: string; name: string; count: number }[];
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      blacklisted: 0,
      withTenders: 0,
      categories: [],
    };
  }

  // Получаем всех поставщиков
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, status, category_id")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  // Получаем поставщиков с тендерами
  const { data: withTenders } = await supabase
    .from("supplier_tenders")
    .select("supplier_id")
    .in(
      "supplier_id",
      (suppliers || []).map((s) => s.id)
    );

  // Получаем категории
  const categories = await getSupplierCategories();

  const uniqueWithTenders = new Set(
    (withTenders || []).map((t) => t.supplier_id)
  );

  const categoryCounts = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    count: (suppliers || []).filter((s) => s.category_id === cat.id).length,
  }));

  return {
    total: suppliers?.length || 0,
    active: suppliers?.filter((s) => s.status === "active").length || 0,
    inactive: suppliers?.filter((s) => s.status === "inactive").length || 0,
    blacklisted:
      suppliers?.filter((s) => s.status === "blacklisted").length || 0,
    withTenders: uniqueWithTenders.size,
    categories: categoryCounts,
  };
}

// =====================================================
// Поиск поставщика по телефону (для входящих звонков)
// =====================================================

export async function findSupplierByPhone(phone: string): Promise<{
  supplier: Supplier | null;
  contact: SupplierContact | null;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) return { supplier: null, contact: null };

  // Нормализуем номер
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
    .select(
      `
      *,
      supplier:suppliers!inner(
        id, company_id, name, short_name, status, category_id,
        category:supplier_categories(id, name, color)
      )
    `
    )
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
      supplier: contact.supplier as unknown as Supplier,
      contact: contact as SupplierContact,
    };
  }

  // Ищем в основных телефонах поставщиков
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select(
      `
      *,
      category:supplier_categories(id, name, color, icon)
    `
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .or(phoneVariants.map((p) => `phone.ilike.%${p}%`).join(","))
    .limit(1);

  if (suppliers && suppliers.length > 0) {
    return {
      supplier: suppliers[0] as Supplier,
      contact: null,
    };
  }

  return { supplier: null, contact: null };
}

// =====================================================
// Связь с бухгалтерией (контрагенты)
// =====================================================

// Синхронизация поставщика с контрагентом бухгалтерии
export async function syncSupplierWithCounterparty(
  supplierId: string
): Promise<{ success: boolean; counterpartyId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Получаем поставщика
  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .eq("company_id", companyId)
    .single();

  if (supplierError || !supplier) {
    return { success: false, error: "Поставщик не найден" };
  }

  // Проверяем, есть ли уже связанный контрагент
  if (supplier.counterparty_id) {
    // Обновляем существующего контрагента
    const { error: updateError } = await supabase
      .from("accounting_counterparties")
      .update({
        name: supplier.name,
        short_name: supplier.short_name,
        inn: supplier.inn,
        kpp: supplier.kpp,
        ogrn: supplier.ogrn,
        legal_address: supplier.legal_address,
        actual_address: supplier.actual_address,
        phone: supplier.phone,
        email: supplier.email,
        is_supplier: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", supplier.counterparty_id);

    if (updateError) {
      console.error("Error updating counterparty:", updateError);
      return { success: false, error: "Ошибка обновления контрагента" };
    }

    return { success: true, counterpartyId: supplier.counterparty_id };
  }

  // Ищем контрагента по ИНН
  if (supplier.inn) {
    const { data: existingCounterparty } = await supabase
      .from("accounting_counterparties")
      .select("id")
      .eq("company_id", companyId)
      .eq("inn", supplier.inn)
      .is("deleted_at", null)
      .single();

    if (existingCounterparty) {
      // Связываем с существующим контрагентом
      await supabase
        .from("suppliers")
        .update({ counterparty_id: existingCounterparty.id })
        .eq("id", supplierId);

      // Обновляем контрагента
      await supabase
        .from("accounting_counterparties")
        .update({
          is_supplier: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCounterparty.id);

      return { success: true, counterpartyId: existingCounterparty.id };
    }
  }

  // Создаём нового контрагента
  const { data: newCounterparty, error: createError } = await supabase
    .from("accounting_counterparties")
    .insert({
      company_id: companyId,
      name: supplier.name,
      short_name: supplier.short_name,
      inn: supplier.inn,
      kpp: supplier.kpp,
      ogrn: supplier.ogrn,
      legal_address: supplier.legal_address,
      actual_address: supplier.actual_address,
      phone: supplier.phone,
      email: supplier.email,
      is_customer: false,
      is_supplier: true,
    })
    .select("id")
    .single();

  if (createError || !newCounterparty) {
    console.error("Error creating counterparty:", createError);
    return { success: false, error: "Ошибка создания контрагента" };
  }

  // Связываем поставщика с контрагентом
  await supabase
    .from("suppliers")
    .update({ counterparty_id: newCounterparty.id })
    .eq("id", supplierId);

  return { success: true, counterpartyId: newCounterparty.id };
}

// Получить документы бухгалтерии для поставщика
export async function getSupplierAccountingDocuments(
  supplierId: string
): Promise<{ documents: unknown[]; totals: { income: number; expense: number } }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { documents: [], totals: { income: 0, expense: 0 } };
  }

  // Получаем поставщика с counterparty_id
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("counterparty_id")
    .eq("id", supplierId)
    .eq("company_id", companyId)
    .single();

  if (!supplier?.counterparty_id) {
    return { documents: [], totals: { income: 0, expense: 0 } };
  }

  // Получаем документы контрагента
  const { data: documents } = await supabase
    .from("accounting_documents")
    .select("*")
    .eq("company_id", companyId)
    .eq("counterparty_id", supplier.counterparty_id)
    .is("deleted_at", null)
    .order("document_date", { ascending: false })
    .limit(50);

  // Считаем итоги
  let income = 0;
  let expense = 0;

  (documents || []).forEach((doc: { document_type: string; total_amount: number }) => {
    if (doc.document_type === "invoice_in" || doc.document_type === "act_in") {
      expense += doc.total_amount || 0;
    } else if (doc.document_type === "invoice_out" || doc.document_type === "act_out") {
      income += doc.total_amount || 0;
    }
  });

  return {
    documents: documents || [],
    totals: { income, expense },
  };
}

// Получить статистику закупок у поставщика
export async function getSupplierPurchaseStats(
  supplierId: string,
  period?: { from: string; to: string }
): Promise<{
  totalAmount: number;
  documentCount: number;
  avgAmount: number;
  lastPurchaseDate: string | null;
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { totalAmount: 0, documentCount: 0, avgAmount: 0, lastPurchaseDate: null };
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("counterparty_id")
    .eq("id", supplierId)
    .eq("company_id", companyId)
    .single();

  if (!supplier?.counterparty_id) {
    return { totalAmount: 0, documentCount: 0, avgAmount: 0, lastPurchaseDate: null };
  }

  let query = supabase
    .from("accounting_documents")
    .select("total_amount, document_date")
    .eq("company_id", companyId)
    .eq("counterparty_id", supplier.counterparty_id)
    .in("document_type", ["invoice_in", "act_in"])
    .is("deleted_at", null);

  if (period?.from) {
    query = query.gte("document_date", period.from);
  }
  if (period?.to) {
    query = query.lte("document_date", period.to);
  }

  const { data: documents } = await query.order("document_date", { ascending: false });

  if (!documents || documents.length === 0) {
    return { totalAmount: 0, documentCount: 0, avgAmount: 0, lastPurchaseDate: null };
  }

  const totalAmount = documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);

  return {
    totalAmount,
    documentCount: documents.length,
    avgAmount: Math.round(totalAmount / documents.length),
    lastPurchaseDate: documents[0]?.document_date || null,
  };
}

// Импорт поставщика из контрагента бухгалтерии
export async function importSupplierFromCounterparty(
  counterpartyId: string,
  categoryId?: string
): Promise<{ success: boolean; supplierId?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Пользователь не авторизован" };
  }

  // Получаем контрагента
  const { data: counterparty, error: cpError } = await supabase
    .from("accounting_counterparties")
    .select("*")
    .eq("id", counterpartyId)
    .eq("company_id", companyId)
    .single();

  if (cpError || !counterparty) {
    return { success: false, error: "Контрагент не найден" };
  }

  // Проверяем, не существует ли уже поставщик с таким counterparty_id
  const { data: existingSupplier } = await supabase
    .from("suppliers")
    .select("id")
    .eq("counterparty_id", counterpartyId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .single();

  if (existingSupplier) {
    return { success: true, supplierId: existingSupplier.id };
  }

  // Создаём поставщика
  const { data: newSupplier, error: createError } = await supabase
    .from("suppliers")
    .insert({
      company_id: companyId,
      user_id: user.id,
      name: counterparty.name,
      short_name: counterparty.short_name,
      inn: counterparty.inn,
      kpp: counterparty.kpp,
      ogrn: counterparty.ogrn,
      legal_address: counterparty.legal_address,
      actual_address: counterparty.actual_address,
      phone: counterparty.phone,
      email: counterparty.email,
      counterparty_id: counterpartyId,
      category_id: categoryId || null,
      status: "active",
    })
    .select("id")
    .single();

  if (createError || !newSupplier) {
    console.error("Error creating supplier from counterparty:", createError);
    return { success: false, error: "Ошибка создания поставщика" };
  }

  // Помечаем контрагента как поставщика
  await supabase
    .from("accounting_counterparties")
    .update({ is_supplier: true })
    .eq("id", counterpartyId);

  return { success: true, supplierId: newSupplier.id };
}

// =====================================================
// Массовые операции
// =====================================================

// Массовое изменение статуса
export async function bulkUpdateSupplierStatus(
  supplierIds: string[],
  status: "active" | "inactive" | "blacklisted"
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, count: 0, error: "Компания не найдена" };
  }

  const { error, count } = await supabase
    .from("suppliers")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", supplierIds)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error bulk updating status:", error);
    return { success: false, count: 0, error: "Ошибка обновления" };
  }

  return { success: true, count: count || supplierIds.length };
}

// Массовое изменение категории
export async function bulkUpdateSupplierCategory(
  supplierIds: string[],
  categoryId: string | null
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, count: 0, error: "Компания не найдена" };
  }

  const { error, count } = await supabase
    .from("suppliers")
    .update({ category_id: categoryId, updated_at: new Date().toISOString() })
    .in("id", supplierIds)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error bulk updating category:", error);
    return { success: false, count: 0, error: "Ошибка обновления" };
  }

  return { success: true, count: count || supplierIds.length };
}

// Массовое удаление (мягкое)
export async function bulkDeleteSuppliers(
  supplierIds: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, count: 0, error: "Компания не найдена" };
  }

  const { error, count } = await supabase
    .from("suppliers")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", supplierIds)
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error bulk deleting:", error);
    return { success: false, count: 0, error: "Ошибка удаления" };
  }

  return { success: true, count: count || supplierIds.length };
}

// Массовая синхронизация с бухгалтерией
export async function bulkSyncWithAccounting(
  supplierIds: string[]
): Promise<{ success: boolean; synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  for (const id of supplierIds) {
    const result = await syncSupplierWithCounterparty(id);
    if (result.success) {
      synced++;
    } else {
      errors++;
    }
  }

  return { success: errors === 0, synced, errors };
}

"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

export interface ExportSuppliersOptions {
  format: "csv" | "xlsx";
  includeContacts?: boolean;
  includeNotes?: boolean;
  categoryId?: string;
  status?: string;
}

interface SupplierExportRow {
  name: string;
  short_name: string;
  inn: string;
  kpp: string;
  ogrn: string;
  phone: string;
  email: string;
  website: string;
  legal_address: string;
  actual_address: string;
  category: string;
  status: string;
  rating: number | null;
  tags: string;
  description: string;
  contacts?: string;
  notes?: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Активный",
  inactive: "Неактивный",
  blacklisted: "Чёрный список",
};

export async function exportSuppliers(
  options: ExportSuppliersOptions
): Promise<{ success: boolean; data?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { success: false, error: "Компания не найдена" };
  }

  // Запрос поставщиков
  let query = supabase
    .from("suppliers")
    .select(`
      *,
      category:supplier_categories(name)
    `)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("name");

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data: suppliers, error } = await query;

  if (error) {
    console.error("Error fetching suppliers for export:", error);
    return { success: false, error: "Ошибка получения данных" };
  }

  if (!suppliers || suppliers.length === 0) {
    return { success: false, error: "Нет данных для экспорта" };
  }

  // Получаем контакты если нужно
  let contactsMap: Record<string, string> = {};
  if (options.includeContacts) {
    const { data: contacts } = await supabase
      .from("supplier_contacts")
      .select("supplier_id, name, position, phone, email")
      .in("supplier_id", suppliers.map((s) => s.id));

    if (contacts) {
      contactsMap = contacts.reduce((acc, c) => {
        const info = `${c.name}${c.position ? ` (${c.position})` : ""}: ${c.phone || ""} ${c.email || ""}`.trim();
        acc[c.supplier_id] = acc[c.supplier_id]
          ? `${acc[c.supplier_id]}; ${info}`
          : info;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Получаем заметки если нужно
  let notesMap: Record<string, string> = {};
  if (options.includeNotes) {
    const { data: notes } = await supabase
      .from("supplier_notes")
      .select("supplier_id, title, content")
      .in("supplier_id", suppliers.map((s) => s.id))
      .order("created_at", { ascending: false });

    if (notes) {
      notesMap = notes.reduce((acc, n) => {
        const noteText = n.title ? `${n.title}: ${n.content}` : n.content;
        acc[n.supplier_id] = acc[n.supplier_id]
          ? `${acc[n.supplier_id]}\n---\n${noteText}`
          : noteText;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  // Формируем данные для экспорта
  const rows: SupplierExportRow[] = suppliers.map((s) => ({
    name: s.name || "",
    short_name: s.short_name || "",
    inn: s.inn || "",
    kpp: s.kpp || "",
    ogrn: s.ogrn || "",
    phone: s.phone || "",
    email: s.email || "",
    website: s.website || "",
    legal_address: s.legal_address || "",
    actual_address: s.actual_address || "",
    category: (s.category as { name: string } | null)?.name || "",
    status: STATUS_LABELS[s.status] || s.status,
    rating: s.rating,
    tags: (s.tags || []).join(", "),
    description: s.description || "",
    ...(options.includeContacts && { contacts: contactsMap[s.id] || "" }),
    ...(options.includeNotes && { notes: notesMap[s.id] || "" }),
  }));

  // Формируем CSV
  const headers = [
    "Название",
    "Краткое название",
    "ИНН",
    "КПП",
    "ОГРН",
    "Телефон",
    "Email",
    "Сайт",
    "Юридический адрес",
    "Фактический адрес",
    "Категория",
    "Статус",
    "Рейтинг",
    "Теги",
    "Описание",
    ...(options.includeContacts ? ["Контакты"] : []),
    ...(options.includeNotes ? ["Заметки"] : []),
  ];

  const escapeCSV = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      [
        escapeCSV(row.name),
        escapeCSV(row.short_name),
        escapeCSV(row.inn),
        escapeCSV(row.kpp),
        escapeCSV(row.ogrn),
        escapeCSV(row.phone),
        escapeCSV(row.email),
        escapeCSV(row.website),
        escapeCSV(row.legal_address),
        escapeCSV(row.actual_address),
        escapeCSV(row.category),
        escapeCSV(row.status),
        escapeCSV(row.rating),
        escapeCSV(row.tags),
        escapeCSV(row.description),
        ...(options.includeContacts ? [escapeCSV(row.contacts || "")] : []),
        ...(options.includeNotes ? [escapeCSV(row.notes || "")] : []),
      ].join(",")
    ),
  ].join("\n");

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const bom = "\uFEFF";
  
  return {
    success: true,
    data: bom + csvContent,
  };
}

export async function getExportStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byCategory: { id: string; name: string; count: number }[];
}> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { total: 0, byStatus: {}, byCategory: [] };
  }

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, status, category_id, category:supplier_categories(id, name)")
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (!suppliers) {
    return { total: 0, byStatus: {}, byCategory: [] };
  }

  const byStatus: Record<string, number> = {};
  const categoryMap: Record<string, { id: string; name: string; count: number }> = {};

  suppliers.forEach((s) => {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    
    if (s.category && typeof s.category === "object" && "id" in s.category) {
      const cat = s.category as unknown as { id: string; name: string };
      if (!categoryMap[cat.id]) {
        categoryMap[cat.id] = { id: cat.id, name: cat.name, count: 0 };
      }
      categoryMap[cat.id].count++;
    }
  });

  return {
    total: suppliers.length,
    byStatus,
    byCategory: Object.values(categoryMap).sort((a, b) => b.count - a.count),
  };
}

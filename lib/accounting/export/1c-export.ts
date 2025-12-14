"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import { getAccountingSettings } from "../service";

// ============================================
// Типы для экспорта в 1С
// ============================================

export interface Export1COptions {
  startDate: string;
  endDate: string;
  includeDocuments: boolean;
  includeCounterparties: boolean;
  includeKudir: boolean;
}

export interface Export1CResult {
  success: boolean;
  xml?: string;
  filename?: string;
  error?: string;
  stats?: {
    documents: number;
    counterparties: number;
    kudirEntries: number;
  };
}

// ============================================
// Генерация XML для 1С
// ============================================

function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate1C(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

function formatMoney1C(kopeks: number): string {
  return (kopeks / 100).toFixed(2);
}

// ============================================
// Экспорт документов в XML формат 1С
// ============================================

export async function exportTo1C(options: Export1COptions): Promise<Export1CResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const settings = await getAccountingSettings();
  if (!settings) {
    return { success: false, error: "Настройки бухгалтерии не заполнены" };
  }
  
  const stats = {
    documents: 0,
    counterparties: 0,
    kudirEntries: 0,
  };
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<Файл xmlns="http://v8.1c.ru/edi/edi_stnd/EnterpriseData/1.0" ВерсияФормата="2.0">\n';
  
  // Информация об отправителе
  xml += '  <Отправитель>\n';
  xml += `    <Наименование>${escapeXml(settings.full_name)}</Наименование>\n`;
  xml += `    <ИНН>${escapeXml(settings.inn)}</ИНН>\n`;
  if (settings.kpp) {
    xml += `    <КПП>${escapeXml(settings.kpp)}</КПП>\n`;
  }
  xml += '  </Отправитель>\n';
  
  // Документы
  if (options.includeDocuments) {
    const { data: documents } = await supabase
      .from("accounting_documents")
      .select("*, counterparty:accounting_counterparties(*), items:document_items(*)")
      .eq("company_id", companyId)
      .gte("document_date", options.startDate)
      .lte("document_date", options.endDate)
      .is("deleted_at", null)
      .order("document_date");
    
    if (documents && documents.length > 0) {
      xml += '  <Документы>\n';
      
      for (const doc of documents) {
        stats.documents++;
        xml += generateDocumentXml(doc, settings);
      }
      
      xml += '  </Документы>\n';
    }
  }
  
  // Контрагенты
  if (options.includeCounterparties) {
    const { data: counterparties } = await supabase
      .from("accounting_counterparties")
      .select("*")
      .eq("company_id", companyId)
      .is("deleted_at", null);
    
    if (counterparties && counterparties.length > 0) {
      xml += '  <Контрагенты>\n';
      
      for (const cp of counterparties) {
        stats.counterparties++;
        xml += generateCounterpartyXml(cp);
      }
      
      xml += '  </Контрагенты>\n';
    }
  }
  
  // КУДиР
  if (options.includeKudir) {
    const { data: kudirEntries } = await supabase
      .from("kudir_entries")
      .select("*")
      .eq("company_id", companyId)
      .gte("entry_date", options.startDate)
      .lte("entry_date", options.endDate)
      .order("entry_date");
    
    if (kudirEntries && kudirEntries.length > 0) {
      xml += '  <КнигаУчетаДоходовИРасходов>\n';
      
      for (const entry of kudirEntries) {
        stats.kudirEntries++;
        xml += generateKudirEntryXml(entry);
      }
      
      xml += '  </КнигаУчетаДоходовИРасходов>\n';
    }
  }
  
  xml += '</Файл>';
  
  const filename = `export_1c_${options.startDate}_${options.endDate}.xml`;
  
  return {
    success: true,
    xml,
    filename,
    stats,
  };
}

// ============================================
// Генерация XML для документа
// ============================================

interface DocumentData {
  id: string;
  document_type: string;
  document_number: string;
  document_date: string;
  direction: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  status: string;
  counterparty?: {
    name?: string;
    inn?: string;
    kpp?: string;
  } | unknown;
  items?: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    amount: number;
    vat_rate: number;
    vat_amount: number;
  }>;
}

interface SettingsData {
  full_name: string;
  inn: string;
  kpp?: string | null;
}

function generateDocumentXml(doc: DocumentData, settings: SettingsData): string {
  let xml = '';
  
  const docTypeMap: Record<string, string> = {
    invoice: "СчетНаОплату",
    act: "АктВыполненныхРабот",
    waybill: "ТоварнаяНакладная",
    upd: "УниверсальныйПередаточныйДокумент",
    contract: "Договор",
  };
  
  const xmlDocType = docTypeMap[doc.document_type] || "ПрочийДокумент";
  
  // Normalize counterparty
  const cpData = doc.counterparty as unknown;
  const cp = (Array.isArray(cpData) ? cpData[0] : cpData) as { name?: string; inn?: string; kpp?: string } | undefined;
  
  xml += `    <${xmlDocType}>\n`;
  xml += `      <Номер>${escapeXml(doc.document_number)}</Номер>\n`;
  xml += `      <Дата>${formatDate1C(doc.document_date)}</Дата>\n`;
  xml += `      <Направление>${doc.direction === "outgoing" ? "Исходящий" : "Входящий"}</Направление>\n`;
  
  // Организация
  xml += '      <Организация>\n';
  xml += `        <Наименование>${escapeXml(settings.full_name)}</Наименование>\n`;
  xml += `        <ИНН>${escapeXml(settings.inn)}</ИНН>\n`;
  if (settings.kpp) {
    xml += `        <КПП>${escapeXml(settings.kpp)}</КПП>\n`;
  }
  xml += '      </Организация>\n';
  
  // Контрагент
  if (cp) {
    xml += '      <Контрагент>\n';
    xml += `        <Наименование>${escapeXml(cp.name)}</Наименование>\n`;
    if (cp.inn) {
      xml += `        <ИНН>${escapeXml(cp.inn)}</ИНН>\n`;
    }
    if (cp.kpp) {
      xml += `        <КПП>${escapeXml(cp.kpp)}</КПП>\n`;
    }
    xml += '      </Контрагент>\n';
  }
  
  // Суммы
  xml += '      <Суммы>\n';
  xml += `        <СуммаБезНДС>${formatMoney1C(doc.subtotal)}</СуммаБезНДС>\n`;
  xml += `        <СуммаНДС>${formatMoney1C(doc.vat_amount)}</СуммаНДС>\n`;
  xml += `        <ВсегоСНДС>${formatMoney1C(doc.total)}</ВсегоСНДС>\n`;
  xml += '      </Суммы>\n';
  
  // Товары/услуги
  if (doc.items && doc.items.length > 0) {
    xml += '      <Товары>\n';
    for (const item of doc.items) {
      xml += '        <Товар>\n';
      xml += `          <Наименование>${escapeXml(item.name)}</Наименование>\n`;
      xml += `          <Количество>${item.quantity}</Количество>\n`;
      xml += `          <ЕдиницаИзмерения>${escapeXml(item.unit)}</ЕдиницаИзмерения>\n`;
      xml += `          <Цена>${formatMoney1C(item.price)}</Цена>\n`;
      xml += `          <Сумма>${formatMoney1C(item.amount)}</Сумма>\n`;
      xml += `          <СтавкаНДС>${item.vat_rate}</СтавкаНДС>\n`;
      xml += `          <СуммаНДС>${formatMoney1C(item.vat_amount)}</СуммаНДС>\n`;
      xml += '        </Товар>\n';
    }
    xml += '      </Товары>\n';
  }
  
  xml += `    </${xmlDocType}>\n`;
  
  return xml;
}

// ============================================
// Генерация XML для контрагента
// ============================================

interface CounterpartyData {
  id: string;
  name: string;
  short_name?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legal_address?: string | null;
  actual_address?: string | null;
  phone?: string | null;
  email?: string | null;
}

function generateCounterpartyXml(cp: CounterpartyData): string {
  let xml = '';
  
  xml += '    <Контрагент>\n';
  xml += `      <Ид>${cp.id}</Ид>\n`;
  xml += `      <Наименование>${escapeXml(cp.name)}</Наименование>\n`;
  if (cp.short_name) {
    xml += `      <СокращенноеНаименование>${escapeXml(cp.short_name)}</СокращенноеНаименование>\n`;
  }
  if (cp.inn) {
    xml += `      <ИНН>${escapeXml(cp.inn)}</ИНН>\n`;
  }
  if (cp.kpp) {
    xml += `      <КПП>${escapeXml(cp.kpp)}</КПП>\n`;
  }
  if (cp.ogrn) {
    xml += `      <ОГРН>${escapeXml(cp.ogrn)}</ОГРН>\n`;
  }
  if (cp.legal_address) {
    xml += `      <ЮридическийАдрес>${escapeXml(cp.legal_address)}</ЮридическийАдрес>\n`;
  }
  if (cp.actual_address) {
    xml += `      <ФактическийАдрес>${escapeXml(cp.actual_address)}</ФактическийАдрес>\n`;
  }
  if (cp.phone) {
    xml += `      <Телефон>${escapeXml(cp.phone)}</Телефон>\n`;
  }
  if (cp.email) {
    xml += `      <Email>${escapeXml(cp.email)}</Email>\n`;
  }
  xml += '    </Контрагент>\n';
  
  return xml;
}

// ============================================
// Генерация XML для записи КУДиР
// ============================================

interface KudirEntryData {
  id: string;
  entry_number: number;
  entry_date: string;
  document_number?: string | null;
  document_date?: string | null;
  operation_description?: string | null;
  income: number;
  expense: number;
}

function generateKudirEntryXml(entry: KudirEntryData): string {
  let xml = '';
  
  xml += '    <Запись>\n';
  xml += `      <НомерЗаписи>${entry.entry_number}</НомерЗаписи>\n`;
  xml += `      <ДатаОперации>${formatDate1C(entry.entry_date)}</ДатаОперации>\n`;
  if (entry.document_number) {
    xml += `      <НомерДокумента>${escapeXml(entry.document_number)}</НомерДокумента>\n`;
  }
  if (entry.document_date) {
    xml += `      <ДатаДокумента>${formatDate1C(entry.document_date)}</ДатаДокумента>\n`;
  }
  if (entry.operation_description) {
    xml += `      <СодержаниеОперации>${escapeXml(entry.operation_description)}</СодержаниеОперации>\n`;
  }
  xml += `      <Доход>${formatMoney1C(entry.income)}</Доход>\n`;
  xml += `      <Расход>${formatMoney1C(entry.expense)}</Расход>\n`;
  xml += '    </Запись>\n';
  
  return xml;
}

// ============================================
// API endpoint для скачивания
// ============================================

export async function downloadExport1C(
  startDate: string,
  endDate: string
): Promise<{ blob?: Blob; filename?: string; error?: string }> {
  const result = await exportTo1C({
    startDate,
    endDate,
    includeDocuments: true,
    includeCounterparties: true,
    includeKudir: true,
  });
  
  if (!result.success || !result.xml) {
    return { error: result.error || "Ошибка экспорта" };
  }
  
  const blob = new Blob([result.xml], { type: "application/xml" });
  
  return {
    blob,
    filename: result.filename,
  };
}

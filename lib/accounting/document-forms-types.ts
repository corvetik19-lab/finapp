// Типы и константы для форм документов
// (вынесены из document-forms-service.ts для совместимости с "use server")

// Типы документов
export type DocumentFormType = 
  | "invoice"           // Счёт на оплату
  | "act"               // Акт выполненных работ
  | "invoice_factura"   // Счёт-фактура
  | "upd"               // УПД
  | "waybill"           // Товарная накладная (ТОРГ-12)
  | "payment_order"     // Платёжное поручение
  | "contract";         // Договор

export type DocumentStatus = "draft" | "issued" | "paid" | "cancelled";

// Позиция документа
export interface DocumentItem {
  id?: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  price: number;      // в копейках
  vatRate: number;    // НДС в процентах (0, 10, 20)
  vatAmount: number;  // сумма НДС в копейках
  totalAmount: number; // итого с НДС в копейках
}

// Данные документа
export interface DocumentFormData {
  id?: string;
  documentType: DocumentFormType;
  documentNumber: string;
  documentDate: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyInn?: string;
  counterpartyKpp?: string;
  counterpartyAddress?: string;
  counterpartyBank?: string;
  counterpartyBik?: string;
  counterpartyAccount?: string;
  items: DocumentItem[];
  subtotalAmount: number;  // сумма без НДС
  vatAmount: number;       // сумма НДС
  totalAmount: number;     // итого с НДС
  status: DocumentStatus;
  notes?: string;
  paymentDueDate?: string;
  paymentDate?: string;
  tenderId?: string;
}

// Названия документов
export const DOCUMENT_TYPE_NAMES: Record<DocumentFormType, string> = {
  invoice: "Счёт на оплату",
  act: "Акт выполненных работ",
  invoice_factura: "Счёт-фактура",
  upd: "УПД",
  waybill: "Товарная накладная",
  payment_order: "Платёжное поручение",
  contract: "Договор",
};

export const DOCUMENT_STATUS_NAMES: Record<DocumentStatus, string> = {
  draft: "Черновик",
  issued: "Выставлен",
  paid: "Оплачен",
  cancelled: "Отменён",
};

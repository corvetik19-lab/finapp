// Типы и константы для налогового календаря
// (вынесены из tax-calendar-service.ts для совместимости с "use server")

// Типы налоговых платежей
export type TaxType = 
  | "usn"           // УСН
  | "usn_advance"   // Авансовые платежи УСН
  | "ndfl"          // НДФЛ
  | "nds"           // НДС
  | "insurance"     // Страховые взносы
  | "property"      // Налог на имущество
  | "transport"     // Транспортный налог
  | "land"          // Земельный налог
  | "patent"        // Патент
  | "other";        // Прочие

export type TaxPaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface TaxPayment {
  id: string;
  companyId: string;
  taxType: TaxType;
  taxName: string;
  period: string;
  dueDate: string;
  amount: number | null;
  calculatedAmount: number | null;
  paidAmount: number;
  paidDate: string | null;
  status: TaxPaymentStatus;
  notes: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaxCalendarEntry {
  id: string;
  taxType: TaxType;
  taxName: string;
  period: string;
  dueDate: string;
  amount: number | null;
  status: TaxPaymentStatus;
  daysUntilDue: number;
  isOverdue: boolean;
  paidAmount: number;
}

// Стандартные сроки налогов для РФ
export const TAX_DEADLINES: Record<TaxType, { name: string; deadlines: string[] }> = {
  usn: {
    name: "УСН (годовой)",
    deadlines: ["04-28"],
  },
  usn_advance: {
    name: "УСН (авансовый платёж)",
    deadlines: ["04-28", "07-28", "10-28"],
  },
  ndfl: {
    name: "НДФЛ",
    deadlines: ["01-28", "02-28", "03-28", "04-28", "05-28", "06-28", "07-28", "08-28", "09-28", "10-28", "11-28", "12-28"],
  },
  nds: {
    name: "НДС",
    deadlines: ["01-28", "02-28", "03-28", "04-28", "05-28", "06-28", "07-28", "08-28", "09-28", "10-28", "11-28", "12-28"],
  },
  insurance: {
    name: "Страховые взносы",
    deadlines: ["01-28", "02-28", "03-28", "04-28", "05-28", "06-28", "07-28", "08-28", "09-28", "10-28", "11-28", "12-28"],
  },
  property: {
    name: "Налог на имущество",
    deadlines: ["02-28"],
  },
  transport: {
    name: "Транспортный налог",
    deadlines: ["02-28"],
  },
  land: {
    name: "Земельный налог",
    deadlines: ["02-28"],
  },
  patent: {
    name: "Патент",
    deadlines: [],
  },
  other: {
    name: "Прочие налоги",
    deadlines: [],
  },
};

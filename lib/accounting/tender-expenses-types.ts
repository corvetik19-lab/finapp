// Типы и константы для расходов по тендерам
// (вынесены из tender-expenses.ts для совместимости с "use server")

export interface TenderExpense {
  id: string;
  tender_id: string;
  company_id: string;
  
  source_type: "document" | "transaction" | "manual";
  document_id?: string;
  transaction_id?: string;
  
  expense_date: string;
  description: string;
  amount: number;
  
  category: "materials" | "services" | "logistics" | "salary" | "overhead" | "other";
  
  counterparty_id?: string;
  counterparty_name?: string;
  
  created_at: string;
  updated_at: string;
}

export interface TenderExpenseSummary {
  tender_id: string;
  purchase_number: string;
  subject: string;
  contract_price: number;
  
  materials: number;
  services: number;
  logistics: number;
  salary: number;
  overhead: number;
  other: number;
  
  total_expenses: number;
  gross_profit: number;
  margin_percent: number;
}

export const EXPENSE_CATEGORIES: { value: TenderExpense["category"]; label: string }[] = [
  { value: "materials", label: "Материалы" },
  { value: "services", label: "Услуги" },
  { value: "logistics", label: "Логистика" },
  { value: "salary", label: "Зарплата" },
  { value: "overhead", label: "Накладные" },
  { value: "other", label: "Прочее" },
];

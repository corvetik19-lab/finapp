// Типы и константы для шаблонов договоров
// (вынесены из contract-templates.ts для совместимости с "use server")

export type ContractType = 
  | "supply"      // Поставка
  | "service"     // Услуги
  | "work"        // Подряд
  | "lease"       // Аренда
  | "agency"      // Агентский
  | "loan"        // Займ
  | "other";      // Прочее

export interface ContractTemplateVariable {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required: boolean;
  default_value?: string;
  options?: string[];
  placeholder?: string;
}

export interface ContractTemplate {
  id?: string;
  company_id: string;
  
  name: string;
  contract_type: ContractType;
  description?: string;
  
  content: string;
  variables: ContractTemplateVariable[];
  is_system: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface GeneratedContract {
  id?: string;
  company_id: string;
  template_id: string;
  
  contract_number: string;
  contract_date: string;
  
  counterparty_id?: string;
  counterparty_name: string;
  
  variables: Record<string, string>;
  content: string;
  
  status: "draft" | "signed" | "active" | "completed" | "cancelled";
  
  created_at: string;
}

export const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: "supply", label: "Поставка" },
  { value: "service", label: "Услуги" },
  { value: "work", label: "Подряд" },
  { value: "lease", label: "Аренда" },
  { value: "agency", label: "Агентский" },
  { value: "loan", label: "Займ" },
  { value: "other", label: "Прочее" },
];

// Типы и константы для настроек организации
// (вынесены из settings-service.ts для совместимости с "use server")

export type OrganizationType = "ip" | "ooo" | "ao" | "pao" | "zao" | "nko";
export type TaxSystem = "osno" | "usn_income" | "usn_income_expense" | "eshn" | "patent";

export interface OrganizationSettings {
  id: string;
  companyId: string;
  
  // Основные данные
  organizationType: OrganizationType;
  organizationName: string;
  shortName?: string;
  
  // Реквизиты
  inn: string;
  kpp?: string;
  ogrn?: string;
  okpo?: string;
  okved?: string;
  
  // Адреса
  legalAddress?: string;
  actualAddress?: string;
  
  // Контакты
  phone?: string;
  email?: string;
  website?: string;
  
  // Руководство
  directorName?: string;
  directorPosition?: string;
  accountantName?: string;
  
  // Налогообложение
  taxSystem: TaxSystem;
  usnRate?: number;
  usnMinTaxRate?: number;
  isVatPayer: boolean;
  vatRate?: number;
  
  // Банковские реквизиты
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  
  // Нумерация документов
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  actPrefix?: string;
  actNextNumber?: number;
  contractPrefix?: string;
  contractNextNumber?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationSettingsInput {
  organizationType?: OrganizationType;
  organizationName?: string;
  shortName?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  okpo?: string;
  okved?: string;
  legalAddress?: string;
  actualAddress?: string;
  phone?: string;
  email?: string;
  website?: string;
  directorName?: string;
  directorPosition?: string;
  accountantName?: string;
  taxSystem?: TaxSystem;
  usnRate?: number;
  usnMinTaxRate?: number;
  isVatPayer?: boolean;
  vatRate?: number;
  bankName?: string;
  bik?: string;
  checkingAccount?: string;
  correspondentAccount?: string;
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  actPrefix?: string;
  actNextNumber?: number;
  contractPrefix?: string;
  contractNextNumber?: number;
}

// Константы
export const ORGANIZATION_TYPES: Record<OrganizationType, string> = {
  ip: "Индивидуальный предприниматель",
  ooo: "Общество с ограниченной ответственностью",
  ao: "Акционерное общество",
  pao: "Публичное акционерное общество",
  zao: "Закрытое акционерное общество",
  nko: "Некоммерческая организация",
};

export const TAX_SYSTEMS: Record<TaxSystem, { name: string; description: string }> = {
  osno: {
    name: "ОСНО",
    description: "Общая система налогообложения",
  },
  usn_income: {
    name: "УСН Доходы",
    description: "Упрощённая система (6% с доходов)",
  },
  usn_income_expense: {
    name: "УСН Доходы-Расходы",
    description: "Упрощённая система (15% с разницы)",
  },
  eshn: {
    name: "ЕСХН",
    description: "Единый сельскохозяйственный налог",
  },
  patent: {
    name: "ПСН",
    description: "Патентная система налогообложения",
  },
};

export const VAT_RATES = [
  { value: 0, label: "0%" },
  { value: 10, label: "10%" },
  { value: 20, label: "20%" },
];

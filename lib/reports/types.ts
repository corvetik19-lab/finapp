// Типы для работы с отчётами

export type ReportPeriod = "month" | "last_month" | "quarter" | "year" | "custom";
export type ReportDataType = "income" | "expense" | "loans" | "cards";
export type ReportType = "table" | "chart" | "pie" | "combined";
export type ReportFormat = "pdf" | "excel" | "preview";

export type ReportRecord = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  period: ReportPeriod;
  date_from: string | null;
  date_to: string | null;
  data_types: ReportDataType[];
  categories: string[]; // category IDs
  accounts: string[]; // account IDs
  report_type: ReportType;
  format: ReportFormat;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Report = {
  id: string;
  name: string;
  category: string;
  period: ReportPeriod;
  dateFrom: string | null;
  dateTo: string | null;
  dataTypes: ReportDataType[];
  categories: string[];
  accounts: string[];
  reportType: ReportType;
  format: ReportFormat;
  note: string | null;
  createdAt: string;
};

export type ReportData = {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
  };
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  byAccount: Array<{
    accountId: string;
    accountName: string;
    amount: number;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    category: string;
    account: string;
    amount: number;
    direction: "income" | "expense";
  }>;
};

export type ReportBuilderConfig = {
  name: string;
  period: ReportPeriod;
  dateFrom?: string;
  dateTo?: string;
  dataTypes: ReportDataType[];
  categories: string[];
  accounts: string[];
};

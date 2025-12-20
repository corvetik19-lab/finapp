// Типы для дашборда бухгалтерии

export type DashboardPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardFilters {
  period: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

// Финансовый обзор
export interface FinancialOverviewData {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  profitMargin: number;
  balance: number;
  incomeChange: number; // % изменения к предыдущему периоду
  expenseChange: number;
  profitChange: number;
  trend: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  income: number;
  expense: number;
  profit: number;
}

// Денежный поток
export interface CashFlowData {
  openingBalance: number;
  closingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  inflowByCategory: CategoryAmount[];
  outflowByCategory: CategoryAmount[];
  dailyFlow: DailyFlowPoint[];
}

export interface CategoryAmount {
  category: string;
  amount: number;
  percent: number;
}

export interface DailyFlowPoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

// Дебиторская задолженность
export interface ReceivablesData {
  totalAmount: number;
  overdueAmount: number;
  overdueCount: number;
  byAge: AgingBucket[];
  topDebtors: DebtorInfo[];
}

export interface AgingBucket {
  label: string; // "До 30 дней", "30-60 дней", "60-90 дней", "Более 90 дней"
  amount: number;
  count: number;
  percent: number;
}

export interface DebtorInfo {
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  overdueAmount: number;
  overdueDays: number;
  oldestInvoiceDate: string;
  invoicesCount: number;
}

// Кредиторская задолженность
export interface PayablesData {
  totalAmount: number;
  overdueAmount: number;
  overdueCount: number;
  byAge: AgingBucket[];
  topCreditors: CreditorInfo[];
}

export interface CreditorInfo {
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  overdueAmount: number;
  overdueDays: number;
  oldestInvoiceDate: string;
  invoicesCount: number;
}

// Рентабельность тендеров
export interface TenderProfitabilityData {
  activeTendersCount: number;
  totalContractValue: number;
  totalExpenses: number;
  totalProfit: number;
  averageMargin: number;
  tenders: TenderProfitInfo[];
}

export interface TenderProfitInfo {
  tenderId: string;
  purchaseNumber: string;
  subject: string;
  customer: string;
  contractValue: number;
  expenses: number;
  profit: number;
  margin: number;
  status: string;
  stage: string;
}

// Налоговый календарь
export interface TaxCalendarData {
  upcomingPayments: TaxPaymentInfo[];
  overduePayments: TaxPaymentInfo[];
  totalUpcoming: number;
  totalOverdue: number;
  nextPaymentDate: string | null;
}

export interface TaxPaymentInfo {
  id: string;
  taxType: string;
  taxName: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  status: 'pending' | 'overdue' | 'paid';
  periodYear: number;
  periodQuarter?: number;
  periodMonth?: number;
}

// Неоплаченные счета
export interface UnpaidInvoicesData {
  totalCount: number;
  totalAmount: number;
  overdueCount: number;
  overdueAmount: number;
  byStatus: InvoiceStatusGroup[];
  invoices: UnpaidInvoiceInfo[];
}

export interface InvoiceStatusGroup {
  status: string;
  label: string;
  count: number;
  amount: number;
}

export interface UnpaidInvoiceInfo {
  id: string;
  documentNumber: string;
  documentDate: string;
  counterpartyName: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate?: string;
  overdueDays: number;
  tenderId?: string;
  tenderNumber?: string;
}

// Быстрые действия
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  color?: string;
}

// Сводные данные дашборда
export interface DashboardData {
  filters: DashboardFilters;
  financialOverview: FinancialOverviewData;
  cashFlow: CashFlowData;
  receivables: ReceivablesData;
  payables: PayablesData;
  tenderProfitability: TenderProfitabilityData;
  taxCalendar: TaxCalendarData;
  unpaidInvoices: UnpaidInvoicesData;
  lastUpdated: string;
}

// Тип для экспорта в PDF
export interface DashboardExportOptions {
  title: string;
  period: string;
  includeSections: {
    financialOverview: boolean;
    cashFlow: boolean;
    receivables: boolean;
    payables: boolean;
    tenderProfitability: boolean;
    taxCalendar: boolean;
    unpaidInvoices: boolean;
  };
}

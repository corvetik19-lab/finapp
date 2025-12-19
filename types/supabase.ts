/**
 * Типы для Supabase таблиц
 * Автоматически сгенерированные типы можно получить через:
 * npx supabase gen types typescript --project-id <id> > types/database.ts
 */

// Базовые поля для всех таблиц
export type BaseRow = {
  id: string;
  created_at: string;
  updated_at?: string;
};

// Типы направлений транзакций
export type TransactionDirection = "income" | "expense" | "transfer";

// Типы категорий
export type CategoryKind = "income" | "expense" | "transfer" | "both";

// Accounts
export type AccountType = "cash" | "card" | "deposit" | "debit_card" | "credit_card" | "other";

export type AccountRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  name: string;
  type: AccountType;
  currency: string;
  balance?: number | null;
  credit_limit?: number | null;
  bank?: string | null;
  card_number?: string | null;
  archived: boolean;
  deleted_at?: string | null;
};

// Categories
export type CategoryRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  name: string;
  parent_id?: string | null;
  kind: CategoryKind;
  deleted_at?: string | null;
};

// Transactions
export type TransactionRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  account_id: string;
  category_id?: string | null;
  direction: TransactionDirection;
  amount: number;
  currency: string;
  occurred_at: string;
  note?: string | null;
  counterparty?: string | null;
  tags?: unknown;
  attachment_count?: number | null;
  embedding?: number[] | null;
  deleted_at?: string | null;
  transfer_from_account_id?: string | null;
  transfer_to_account_id?: string | null;
};

// Transaction with category join
export type TransactionWithCategory = TransactionRow & {
  category?: CategoryRow | CategoryRow[] | null;
};

// Transaction transfers
export type TransactionTransferRow = BaseRow & {
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency: string;
  occurred_at: string;
  note?: string | null;
  expense_txn_id: string;
  income_txn_id: string;
};

// Tender types
export type TenderStatus = "draft" | "active" | "won" | "lost" | "cancelled";

export type TenderRow = BaseRow & {
  organization_id: string;
  name: string;
  number?: string | null;
  status: TenderStatus;
  stage_id?: string | null;
  type_id?: string | null;
  description?: string | null;
  start_price?: number | null;
  currency: string;
  deadline?: string | null;
  published_at?: string | null;
  platform_id?: string | null;
  platform_url?: string | null;
  customer_id?: string | null;
  responsible_id?: string | null;
  deleted_at?: string | null;
};

// Tender comments
export type TenderCommentRow = BaseRow & {
  tender_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
};

// Tender tasks
export type TenderTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TenderTaskRow = BaseRow & {
  tender_id: string;
  user_id: string;
  assigned_to?: string | null;
  title: string;
  description?: string | null;
  status: TenderTaskStatus;
  priority?: number | null;
  due_date?: string | null;
  due_time?: string | null;
  completed_at?: string | null;
};

// Tender with relations
export type TenderWithRelations = TenderRow & {
  tender_comments?: TenderCommentRow[];
  tender_tasks?: TenderTaskRow[];
  tender_stage?: { id: string; name: string; order: number } | null;
  tender_type?: { id: string; name: string } | null;
};

// Profiles
export type GlobalRole = "user" | "admin" | "super_admin";

export type ProfileRow = {
  id: string;
  global_role?: GlobalRole | null;
  avatar_url?: string | null;
  updated_at?: string | null;
};

// Organization members
export type OrganizationMemberRole = "member" | "admin" | "owner";

export type OrganizationMemberRow = BaseRow & {
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
};

// Company members
export type CompanyMemberRole = "member" | "admin";

export type CompanyMemberRow = BaseRow & {
  company_id: string;
  user_id: string;
  role: CompanyMemberRole;
  role_id?: string | null;
  employee_id?: string | null;
  status: "active" | "inactive";
};

// Employees
export type EmployeeRow = BaseRow & {
  user_id?: string | null;
  company_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  department_id?: string | null;
  role_id?: string | null;
  avatar_url?: string | null;
  hire_date?: string | null;
  status: "active" | "inactive" | "terminated";
};

// Roles
export type RoleRow = BaseRow & {
  company_id?: string | null;
  name: string;
  description?: string | null;
  permissions?: unknown;
};

// Departments
export type DepartmentRow = BaseRow & {
  company_id?: string | null;
  name: string;
  parent_id?: string | null;
};

// Loan payments
export type LoanPaymentRow = BaseRow & {
  loan_id: string;
  user_id: string;
  amount: number;
  principal_amount: number;
  interest_amount?: number | null;
  payment_date: string;
};

// Loans
export type LoanRow = BaseRow & {
  user_id: string;
  name: string;
  principal_amount: number;
  principal_paid?: number | null;
  interest_rate?: number | null;
  currency: string;
  start_date?: string | null;
  end_date?: string | null;
  last_payment_date?: string | null;
  status: "active" | "paid" | "defaulted";
};

// Attachments
export type AttachmentRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  transaction_id?: string | null;
  storage_path: string;
  file_name?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  deleted_at?: string | null;
};

// Product items
export type ProductItemRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_type?: "income" | "expense" | null;
  default_unit?: string | null;
  default_price_per_unit?: number | null;
};

// Debts
export type DebtRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  name: string;
  amount: number;
  currency: string;
  direction: "owe" | "owed";
  counterparty?: string | null;
  due_date?: string | null;
  status: "active" | "paid" | "cancelled";
  note?: string | null;
};

// Upcoming payments
export type UpcomingPaymentRow = BaseRow & {
  user_id: string;
  company_id?: string | null;
  name: string;
  amount: number;
  currency: string;
  due_date: string;
  category_id?: string | null;
  account_id?: string | null;
  status: "pending" | "paid" | "skipped";
  paid_transaction_id?: string | null;
};

// Supabase client types helper
export type SupabaseClientType = {
  from: (table: string) => unknown;
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null };
      error: Error | null;
    }>;
  };
};

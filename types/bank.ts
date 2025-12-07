export interface Bank {
  id: string;
  company_id: string;
  name: string;
  short_name: string | null;
  bik: string;
  correspondent_account: string | null;
  swift: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankInput {
  name: string;
  short_name?: string | null;
  bik: string;
  correspondent_account?: string | null;
  swift?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface BankFilters {
  search: string;
  is_active: "all" | boolean;
}

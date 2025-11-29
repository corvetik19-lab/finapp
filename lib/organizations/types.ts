// Типы для организационной структуры

export type AppMode = 'finance' | 'tenders' | 'personal' | 'investments';

export interface Organization {
  id: string;
  name: string;
  slug?: string; // Добавлено для совместимости
  description: string | null;
  logo_url: string | null;
  website: string | null;
  settings: OrganizationSettings;
  allowed_modes: AppMode[]; 
  contact_email: string | null;
  contact_phone: string | null;
  address: Address | null;
  status: 'active' | 'suspended' | 'archived';
  is_active: boolean; // Добавлено (из миграции)
  subscription_plan?: string; // Добавлено (в миграции subscription_plan)
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrganizationSettings {
  features: {
    tenders: boolean;
    analytics: boolean;
    reports: boolean;
  };
  limits: {
    max_companies: number;
    max_users_per_company: number;
  };
}

export interface Address {
  country?: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  postal_code?: string;
}

export interface Company {
  id: string;
  organization_id: string;
  name: string;
  full_name: string | null;
  logo_url: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_address: string | null;
  actual_address: string | null;
  settings: CompanySettings;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CompanySettings {
  notifications: {
    email: boolean;
    push: boolean;
  };
  features: {
    tender_import: boolean;
    auto_categorization: boolean;
  };
}

export type CompanyRole = 'admin' | 'manager' | 'specialist' | 'viewer';

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  permissions: MemberPermissions;
  invited_by: string | null;
  invited_at: string;
  joined_at: string;
  status: 'invited' | 'active' | 'suspended' | 'left';
  created_at: string;
  updated_at: string;
  
  // Joined data
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

export interface MemberPermissions {
  allowed_modes?: AppMode[]; // НОВОЕ
  tenders: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
  };
  settings: {
    manage: boolean;
  };
}

export interface CompanyInvitation {
  id: string;
  company_id: string;
  email: string;
  role: CompanyRole;
  invited_by: string;
  token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
}

// Helper функции для прав доступа
export const DEFAULT_PERMISSIONS: Record<CompanyRole, MemberPermissions> = {
  admin: {
    allowed_modes: ['finance', 'tenders', 'personal', 'investments'],
    tenders: { create: true, read: true, update: true, delete: true },
    reports: { view: true, export: true },
    settings: { manage: true },
  },
  manager: {
    allowed_modes: ['tenders'],
    tenders: { create: true, read: true, update: true, delete: true },
    reports: { view: true, export: true },
    settings: { manage: false },
  },
  specialist: {
    allowed_modes: ['tenders'],
    tenders: { create: false, read: true, update: true, delete: false },
    reports: { view: true, export: false },
    settings: { manage: false },
  },
  viewer: {
    allowed_modes: ['tenders'],
    tenders: { create: false, read: true, update: false, delete: false },
    reports: { view: true, export: false },
    settings: { manage: false },
  },
};

export function hasPermission(
  member: CompanyMember,
  resource: keyof MemberPermissions,
  action: string
): boolean {
  if (member.role === 'admin') return true;
  
  const resourcePermissions = member.permissions[resource] as Record<string, boolean>;
  return resourcePermissions?.[action] === true;
}

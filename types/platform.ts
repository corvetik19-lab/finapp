/**
 * Типы для справочника площадок
 */

export interface Platform {
  id: string;
  organization_id: string;
  name: string;
  short_name: string | null;
  url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PlatformInput {
  name: string;
  short_name?: string | null;
  url?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface PlatformFilters {
  search?: string;
  is_active?: boolean | 'all';
}

/**
 * Типы для справочника товаров/позиций
 */

export type ProductItem = {
  id: string;
  user_id: string;
  name: string;
  default_unit: string;
  default_price_per_unit: number | null; // в копейках
  category_id: string | null; // UUID ссылка на categories
  category_type: "income" | "expense" | null; // тип категории для товаров с both
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // JOIN с таблицей categories
  categories?: {
    id: string;
    name: string;
    kind: "income" | "expense" | "both";
  } | null;
};

export type ProductItemInput = {
  name: string;
  default_unit: string;
  default_price_per_unit?: number | null;
  category_id?: string | null; // UUID ссылка на categories
  category_type?: "income" | "expense" | null;
  description?: string | null;
  is_active?: boolean;
};

export type ProductItemUpdate = Partial<ProductItemInput> & {
  id: string;
};

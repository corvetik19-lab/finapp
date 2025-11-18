// Типы для транзакций и позиций товаров

export type TransactionItem = {
  id: string;
  transaction_id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  price_per_unit: number; // в копейках
  total_amount: number; // в копейках
  product_id: string | null; // связь с товаром из справочника
  created_at: string;
  updated_at: string;
};

export type TransactionItemInput = Omit<
  TransactionItem,
  'id' | 'transaction_id' | 'user_id' | 'created_at' | 'updated_at' | 'total_amount'
> & {
  total_amount?: number; // опционально, будет рассчитано автоматически
  category_id?: string | null; // категория товара
  category_type?: 'income' | 'expense' | null; // тип категории для both категорий
  product_id?: string | null; // ID товара из справочника (если привязан)
};

export type TransactionWithItems = {
  id: string;
  amount_minor: number;
  direction: 'income' | 'expense' | 'transfer';
  category_id: string | null;
  account_id: string;
  description: string | null;
  occurred_at: string;
  items?: TransactionItem[];
};

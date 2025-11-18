// Типы для быстрых пресетов транзакций

export type QuickTransactionPreset = {
  id: string;
  user_id: string;
  name: string;
  amount: number; // в копейках
  direction: 'income' | 'expense';
  category_id: string | null;
  account_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type QuickPresetInput = Omit<
  QuickTransactionPreset,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export type QuickPresetUpdate = Partial<QuickPresetInput> & {
  id: string;
};

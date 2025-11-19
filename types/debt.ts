export type DebtType = 'owe' | 'owed';
export type DebtStatus = 'active' | 'paid' | 'partially_paid';

// Этапы взыскания долгов (претензионная работа)
export type ClaimStage = 
  | 'new'        // Новые
  | 'claim'      // Претензия отправлена
  | 'court'      // Реестр заседаний (суд)
  | 'writ'       // Исполнительный лист получен
  | 'bailiff'    // Отправлено приставам
  | 'paid';      // Оплачено

export interface Debt {
  id: string;
  user_id: string;
  type: DebtType;
  creditor_debtor_name: string;
  amount: number; // in minor units (kopecks)
  currency: string;
  date_created: string;
  date_due: string | null;
  status: DebtStatus;
  amount_paid: number; // in minor units
  description: string | null;
  
  // Новые поля для претензионной работы
  tender_id: string | null;           // Связь с тендером
  application_number: string | null;  // Номер заявки
  contract_number: string | null;     // Номер договора
  stage: ClaimStage;                  // Этап взыскания
  plaintiff: string | null;           // Истец (наша организация)
  defendant: string | null;           // Ответчик (должник)
  comments: string | null;            // Комментарии
  
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Названия этапов для UI
export const CLAIM_STAGE_LABELS: Record<ClaimStage, string> = {
  new: 'Новые',
  claim: 'Претензия',
  court: 'Суд',
  writ: 'Исполнительный лист',
  bailiff: 'Приставы',
  paid: 'Оплачено',
};

// Типы для ЭДО (Электронный документооборот)

// ============================================
// Статусы документов в ЭДО
// ============================================

export type EdiDocumentStatus = 
  | "draft"           // Черновик
  | "sent"            // Отправлен
  | "delivered"       // Доставлен
  | "signed"          // Подписан контрагентом
  | "rejected"        // Отклонён
  | "revoked"         // Аннулирован
  | "error";          // Ошибка

export type EdiDocumentType = 
  | "invoice"         // Счёт
  | "act"             // Акт
  | "upd"             // УПД
  | "ukd"             // УКД (корректировка)
  | "torg12"          // ТОРГ-12
  | "contract";       // Договор

// ============================================
// Настройки ЭДО
// ============================================

export interface EdiSettings {
  id: string;
  company_id: string;
  
  // Провайдер ЭДО
  provider: "diadoc" | "sbis" | "kontur";
  
  // Учётные данные
  api_key: string;
  login?: string;
  password_encrypted?: string;
  
  // ID организации в системе ЭДО
  box_id?: string;
  org_id?: string;
  
  // Сертификат ЭЦП
  certificate_thumbprint?: string;
  certificate_subject?: string;
  certificate_valid_until?: string;
  
  // Настройки
  auto_sign: boolean;          // Автоподпись входящих
  auto_send_response: boolean; // Автоотправка ответов
  notify_email?: string;       // Email для уведомлений
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Документ ЭДО
// ============================================

export interface EdiDocument {
  id: string;
  company_id: string;
  
  // Связь с внутренним документом
  accounting_document_id?: string;
  
  // Данные из системы ЭДО
  external_id: string;          // ID в системе ЭДО
  message_id?: string;          // ID сообщения
  entity_id?: string;           // ID сущности
  
  // Тип и статус
  document_type: EdiDocumentType;
  status: EdiDocumentStatus;
  
  // Контрагент
  counterparty_box_id?: string;
  counterparty_name?: string;
  counterparty_inn?: string;
  
  // Метаданные документа
  document_number?: string;
  document_date?: string;
  total?: number;
  
  // Файлы
  file_name?: string;
  file_size?: number;
  
  // Подписи
  our_signature?: EdiSignature;
  counterparty_signature?: EdiSignature;
  
  // Ошибки и комментарии
  error_message?: string;
  rejection_reason?: string;
  
  // Даты событий
  sent_at?: string;
  delivered_at?: string;
  signed_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface EdiSignature {
  signer_name: string;
  signer_position?: string;
  signed_at: string;
  certificate_thumbprint?: string;
  is_valid: boolean;
}

// ============================================
// Диадок API типы
// ============================================

export interface DiadocOrganization {
  OrgId: string;
  Inn: string;
  Kpp?: string;
  FullName: string;
  ShortName?: string;
  Boxes: DiadocBox[];
}

export interface DiadocBox {
  BoxId: string;
  Title: string;
  Organization: {
    OrgId: string;
    Inn: string;
    FullName: string;
  };
}

export interface DiadocMessage {
  MessageId: string;
  TimestampTicks: number;
  FromBoxId: string;
  ToBoxId: string;
  Entities: DiadocEntity[];
}

export interface DiadocEntity {
  EntityId: string;
  ParentEntityId?: string;
  FileName: string;
  DocumentInfo?: {
    DocumentType: string;
    DocumentNumber?: string;
    DocumentDate?: string;
    Total?: string;
  };
  SignerBoxId?: string;
  SignerDepartmentId?: string;
}

export interface DiadocCounteragent {
  IndexKey: string;
  Organization: DiadocOrganization;
  CurrentStatus: "IsMyCounteragent" | "InvitesMe" | "IsInvitedByMe" | "Rejected" | "NotInCounteragentList";
}

// ============================================
// API ответы
// ============================================

export interface SendDocumentResult {
  success: boolean;
  messageId?: string;
  entityId?: string;
  error?: string;
}

export interface SignDocumentResult {
  success: boolean;
  signatureId?: string;
  error?: string;
}

export interface GetDocumentsResult {
  documents: EdiDocument[];
  hasMore: boolean;
  cursor?: string;
}

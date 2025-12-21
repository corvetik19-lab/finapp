-- Фаза 3: Онлайн-подписание документов для портала инвестора

-- Таблица электронных подписей документов
CREATE TABLE IF NOT EXISTS investor_document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES investor_documents(id) ON DELETE CASCADE,
  
  -- Данные подписи
  signature_type TEXT NOT NULL CHECK (signature_type IN ('simple', 'qualified', 'enhanced')),
  signature_data TEXT, -- Base64 encoded signature or hash
  signature_hash TEXT NOT NULL,
  
  -- IP и устройство
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'rejected', 'expired')),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Подтверждение
  confirmation_code TEXT,
  confirmation_method TEXT CHECK (confirmation_method IN ('email', 'sms', 'push')),
  confirmed_at TIMESTAMPTZ,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(document_id, user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_doc_signatures_user ON investor_document_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_doc_signatures_document ON investor_document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_investor_doc_signatures_status ON investor_document_signatures(status);

-- RLS
ALTER TABLE investor_document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_doc_signatures_select ON investor_document_signatures
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY investor_doc_signatures_insert ON investor_document_signatures
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY investor_doc_signatures_update ON investor_document_signatures
  FOR UPDATE USING (user_id = auth.uid());

-- Таблица запросов на подпись (для отправки инвесторам)
CREATE TABLE IF NOT EXISTS investor_signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES investor_documents(id) ON DELETE CASCADE,
  investor_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_email TEXT,
  
  -- Статус запроса
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'rejected', 'expired')),
  
  -- Сроки
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Токен доступа для внешних инвесторов
  access_token UUID DEFAULT gen_random_uuid(),
  
  -- Напоминания
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_investor_sig_requests_user ON investor_signature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_sig_requests_document ON investor_signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_investor_sig_requests_investor ON investor_signature_requests(investor_user_id);
CREATE INDEX IF NOT EXISTS idx_investor_sig_requests_token ON investor_signature_requests(access_token);
CREATE INDEX IF NOT EXISTS idx_investor_sig_requests_status ON investor_signature_requests(status);

-- RLS
ALTER TABLE investor_signature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY investor_sig_requests_select ON investor_signature_requests
  FOR SELECT USING (user_id = auth.uid() OR investor_user_id = auth.uid());

CREATE POLICY investor_sig_requests_insert ON investor_signature_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY investor_sig_requests_update ON investor_signature_requests
  FOR UPDATE USING (user_id = auth.uid() OR investor_user_id = auth.uid());

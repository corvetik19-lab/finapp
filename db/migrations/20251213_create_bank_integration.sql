-- Банковские интеграции и расчётные счета
-- Каждая организация может подключить свой банк по API

-- ============================================
-- 1. Расчётные счета организации
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Основная информация
  name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  
  -- Банковские реквизиты
  bank_name TEXT NOT NULL,
  bank_bik TEXT NOT NULL,
  bank_corr_account TEXT,
  bank_swift TEXT,
  
  -- Тип счёта: checking (расчётный), savings (накопительный), deposit (депозит), card (карточный)
  account_type TEXT NOT NULL DEFAULT 'checking',
  
  -- Текущий баланс (в копейках) - синхронизируется с банком
  balance BIGINT DEFAULT 0,
  balance_updated_at TIMESTAMPTZ,
  
  -- Статус счёта: active, blocked, closed
  status TEXT NOT NULL DEFAULT 'active',
  
  -- Основной счёт для платежей
  is_primary BOOLEAN DEFAULT false,
  
  -- Дата открытия/закрытия
  opened_at DATE,
  closed_at DATE,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Банковские интеграции (API подключения)
-- ============================================
CREATE TABLE IF NOT EXISTS bank_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Банк и тип интеграции
  bank_code TEXT NOT NULL, -- sber, tinkoff, alfa, vtb, raiffeisen, modulbank, tochka
  bank_name TEXT NOT NULL,
  integration_type TEXT NOT NULL DEFAULT 'api', -- api, 1c, manual
  
  -- API credentials (зашифрованы)
  api_client_id TEXT,
  api_client_secret TEXT,
  api_access_token TEXT,
  api_refresh_token TEXT,
  api_token_expires_at TIMESTAMPTZ,
  
  -- OAuth
  oauth_redirect_uri TEXT,
  oauth_state TEXT,
  
  -- Sandbox/Production
  is_sandbox BOOLEAN DEFAULT true,
  api_base_url TEXT,
  
  -- Статус подключения: pending, active, expired, error, disconnected
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Настройки синхронизации
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  sync_transactions BOOLEAN DEFAULT true,
  sync_statements BOOLEAN DEFAULT true,
  
  -- Связанные счета
  linked_account_ids UUID[] DEFAULT '{}',
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. Банковские транзакции (выписка)
-- ============================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES bank_integrations(id) ON DELETE SET NULL,
  
  -- Идентификатор транзакции в банке
  external_id TEXT,
  
  -- Дата и время операции
  transaction_date DATE NOT NULL,
  transaction_time TIMESTAMPTZ,
  
  -- Тип операции: credit (поступление), debit (списание)
  operation_type TEXT NOT NULL,
  
  -- Суммы (в копейках)
  amount BIGINT NOT NULL,
  fee BIGINT DEFAULT 0,
  
  -- Баланс после операции
  balance_after BIGINT,
  
  -- Контрагент
  counterparty_name TEXT,
  counterparty_inn TEXT,
  counterparty_kpp TEXT,
  counterparty_account TEXT,
  counterparty_bank_name TEXT,
  counterparty_bank_bik TEXT,
  
  -- Назначение платежа
  purpose TEXT,
  
  -- Категория (автоматическая или ручная)
  category TEXT,
  
  -- Связи с бухгалтерией
  accounting_document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  kudir_entry_id UUID REFERENCES kudir_entries(id) ON DELETE SET NULL,
  
  -- Статус обработки: new, processed, ignored, error
  processing_status TEXT NOT NULL DEFAULT 'new',
  
  -- Метаданные от банка
  raw_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. Платёжные поручения
-- ============================================
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Номер и дата
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  
  -- Сумма (в копейках)
  amount BIGINT NOT NULL,
  
  -- Получатель
  recipient_name TEXT NOT NULL,
  recipient_inn TEXT,
  recipient_kpp TEXT,
  recipient_account TEXT NOT NULL,
  recipient_bank_name TEXT NOT NULL,
  recipient_bank_bik TEXT NOT NULL,
  recipient_bank_corr_account TEXT,
  
  -- Назначение платежа
  purpose TEXT NOT NULL,
  
  -- Очередность платежа (1-6)
  priority INTEGER DEFAULT 5,
  
  -- НДС
  vat_type TEXT DEFAULT 'none', -- none, included, excluded
  vat_amount BIGINT DEFAULT 0,
  
  -- Связи
  accounting_document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  
  -- Статус: draft, pending, sent, accepted, executed, rejected, cancelled
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Ответ от банка
  bank_status TEXT,
  bank_response JSONB DEFAULT '{}',
  executed_at TIMESTAMPTZ,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. Логи синхронизации
-- ============================================
CREATE TABLE IF NOT EXISTS bank_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES bank_integrations(id) ON DELETE CASCADE,
  
  -- Тип операции: sync_transactions, sync_balance, send_payment, refresh_token
  operation_type TEXT NOT NULL,
  
  -- Статус: started, success, error
  status TEXT NOT NULL,
  
  -- Детали
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  
  -- Результаты
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  
  -- Ошибка
  error_message TEXT,
  error_details JSONB,
  
  -- Запрос/ответ (для отладки)
  request_data JSONB,
  response_data JSONB
);

-- ============================================
-- Индексы
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_number ON bank_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON bank_accounts(status);

CREATE INDEX IF NOT EXISTS idx_bank_integrations_company ON bank_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_integrations_bank ON bank_integrations(bank_code);
CREATE INDEX IF NOT EXISTS idx_bank_integrations_status ON bank_integrations(status);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_external ON bank_transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(processing_status);

CREATE INDEX IF NOT EXISTS idx_payment_orders_company ON payment_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_account ON payment_orders(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_date ON payment_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

CREATE INDEX IF NOT EXISTS idx_bank_sync_logs_integration ON bank_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_bank_sync_logs_status ON bank_sync_logs(status);

-- ============================================
-- RLS политики
-- ============================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_sync_logs ENABLE ROW LEVEL SECURITY;

-- bank_accounts policies
CREATE POLICY "bank_accounts_select" ON bank_accounts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bank_accounts_insert" ON bank_accounts
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "bank_accounts_update" ON bank_accounts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "bank_accounts_delete" ON bank_accounts
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- bank_integrations policies
CREATE POLICY "bank_integrations_select" ON bank_integrations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bank_integrations_insert" ON bank_integrations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "bank_integrations_update" ON bank_integrations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "bank_integrations_delete" ON bank_integrations
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- bank_transactions policies
CREATE POLICY "bank_transactions_select" ON bank_transactions
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bank_transactions_insert" ON bank_transactions
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "bank_transactions_update" ON bank_transactions
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "bank_transactions_delete" ON bank_transactions
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- payment_orders policies
CREATE POLICY "payment_orders_select" ON payment_orders
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "payment_orders_insert" ON payment_orders
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "payment_orders_update" ON payment_orders
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "payment_orders_delete" ON payment_orders
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- bank_sync_logs policies
CREATE POLICY "bank_sync_logs_select" ON bank_sync_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "bank_sync_logs_insert" ON bank_sync_logs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- Триггеры для updated_at
-- ============================================
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_bank_integrations_updated_at
  BEFORE UPDATE ON bank_integrations
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

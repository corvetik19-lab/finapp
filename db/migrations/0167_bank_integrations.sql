-- Банковские интеграции (Сбер, Альфа, ВТБ, Точка, Райффайзен)

-- Банковские подключения
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Банк
  bank_code VARCHAR(20) NOT NULL CHECK (bank_code IN (
    'sber', 'alfa', 'vtb', 'tochka', 'raiffeisen', 'tinkoff', 'otkritie', 'other'
  )),
  bank_name VARCHAR(200) NOT NULL,
  
  -- Учётные данные (зашифрованы)
  credentials JSONB, -- client_id, client_secret, etc.
  
  -- Токены
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'active', 'expired', 'error', 'disabled'
  )),
  
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Настройки
  settings JSONB DEFAULT '{}',
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval_minutes INTEGER DEFAULT 60,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_company ON bank_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_bank ON bank_connections(bank_code);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);

-- Связь банковских счетов с подключениями
ALTER TABLE accounting_bank_accounts 
ADD COLUMN IF NOT EXISTS bank_connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS external_account_id VARCHAR(100), -- ID счёта в API банка
ADD COLUMN IF NOT EXISTS last_statement_date DATE;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON accounting_bank_accounts(bank_connection_id);

-- Банковские выписки
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES accounting_bank_accounts(id) ON DELETE CASCADE,
  
  -- Период выписки
  statement_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Остатки
  opening_balance BIGINT NOT NULL,
  closing_balance BIGINT NOT NULL,
  
  -- Обороты
  total_debit BIGINT DEFAULT 0,
  total_credit BIGINT DEFAULT 0,
  
  -- Количество операций
  transaction_count INTEGER DEFAULT 0,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN (
    'new', 'processing', 'processed', 'error'
  )),
  
  -- Источник
  source VARCHAR(20) DEFAULT 'api' CHECK (source IN (
    'api', 'import', 'manual'
  )),
  
  -- Файл выписки (если импорт)
  file_path TEXT,
  file_format VARCHAR(20), -- 1c, mt940, csv
  
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(bank_account_id, statement_date)
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_company ON bank_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_account ON bank_statements(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON bank_statements(statement_date);

-- Банковские операции (из выписок)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES accounting_bank_accounts(id) ON DELETE CASCADE,
  statement_id UUID REFERENCES bank_statements(id) ON DELETE SET NULL,
  
  -- Внешний ID
  external_id VARCHAR(100), -- ID транзакции в банке
  
  -- Дата и время
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  value_date DATE, -- дата валютирования
  
  -- Тип операции
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
    'debit', 'credit'
  )),
  
  -- Сумма
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'RUB',
  
  -- Контрагент
  counterparty_name VARCHAR(500),
  counterparty_inn VARCHAR(12),
  counterparty_kpp VARCHAR(9),
  counterparty_account VARCHAR(20),
  counterparty_bank_bik VARCHAR(9),
  counterparty_bank_name VARCHAR(200),
  
  -- Назначение платежа
  purpose TEXT,
  
  -- Документ
  document_number VARCHAR(50),
  document_date DATE,
  
  -- Статус обработки
  processing_status VARCHAR(20) DEFAULT 'new' CHECK (processing_status IN (
    'new', 'matched', 'created', 'ignored', 'error'
  )),
  
  -- Связь с документом учёта
  linked_document_type VARCHAR(50),
  linked_document_id UUID,
  
  -- Связь с контрагентом в системе
  matched_counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  
  -- Категоризация
  category_suggestion VARCHAR(100), -- предложенная категория
  category_confidence DECIMAL(3,2), -- уверенность (0-1)
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  UNIQUE(bank_account_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(processing_status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_counterparty ON bank_transactions(counterparty_inn);

-- Правила автоматической обработки
CREATE TABLE IF NOT EXISTS bank_processing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  
  -- Условия
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN (
    'counterparty', 'purpose', 'amount', 'combined'
  )),
  
  -- Фильтры (JSONB для гибкости)
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Примеры:
  -- { "counterparty_inn": "7707083893" }
  -- { "purpose_contains": ["аренда", "арендная плата"] }
  -- { "amount_min": 10000, "amount_max": 50000 }
  
  -- Действия
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN (
    'categorize', 'link_counterparty', 'create_document', 'ignore'
  )),
  
  action_params JSONB DEFAULT '{}',
  -- Примеры:
  -- { "category": "rent", "counterparty_id": "uuid" }
  -- { "document_type": "invoice" }
  
  -- Приоритет (меньше = выше)
  priority INTEGER DEFAULT 100,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_rules_company ON bank_processing_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_processing_rules_active ON bank_processing_rules(is_active);

-- Логи синхронизации
CREATE TABLE IF NOT EXISTS bank_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN (
    'full', 'incremental', 'manual'
  )),
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN (
    'running', 'success', 'partial', 'error'
  )),
  
  -- Статистика
  accounts_synced INTEGER DEFAULT 0,
  transactions_fetched INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  transactions_updated INTEGER DEFAULT 0,
  
  error_message TEXT,
  details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_company ON bank_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_connection ON bank_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON bank_sync_logs(started_at);

-- RLS policies
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_processing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS для подключений
CREATE POLICY "Users can manage bank connections of their company"
  ON bank_connections FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для выписок
CREATE POLICY "Users can manage bank statements of their company"
  ON bank_statements FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для транзакций
CREATE POLICY "Users can manage bank transactions of their company"
  ON bank_transactions FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для правил
CREATE POLICY "Users can manage processing rules of their company"
  ON bank_processing_rules FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для логов
CREATE POLICY "Users can view sync logs of their company"
  ON bank_sync_logs FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Triggers
CREATE TRIGGER update_bank_connections_updated_at
  BEFORE UPDATE ON bank_connections
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_processing_rules_updated_at
  BEFORE UPDATE ON bank_processing_rules
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

-- Функция применения правил к транзакции
CREATE OR REPLACE FUNCTION apply_bank_processing_rules(p_transaction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_transaction bank_transactions%ROWTYPE;
  v_rule bank_processing_rules%ROWTYPE;
  v_matched BOOLEAN := FALSE;
BEGIN
  -- Получаем транзакцию
  SELECT * INTO v_transaction FROM bank_transactions WHERE id = p_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Проходим по правилам
  FOR v_rule IN
    SELECT * FROM bank_processing_rules
    WHERE company_id = v_transaction.company_id
      AND is_active = TRUE
    ORDER BY priority ASC
  LOOP
    -- Проверяем условия (упрощённо)
    CASE v_rule.rule_type
      WHEN 'counterparty' THEN
        IF v_transaction.counterparty_inn = v_rule.conditions->>'counterparty_inn' THEN
          v_matched := TRUE;
        END IF;
      WHEN 'purpose' THEN
        IF v_transaction.purpose ILIKE '%' || (v_rule.conditions->>'purpose_contains') || '%' THEN
          v_matched := TRUE;
        END IF;
      ELSE
        v_matched := FALSE;
    END CASE;
    
    IF v_matched THEN
      -- Применяем действие
      CASE v_rule.action_type
        WHEN 'categorize' THEN
          UPDATE bank_transactions
          SET category_suggestion = v_rule.action_params->>'category',
              category_confidence = 1.0,
              processing_status = 'matched'
          WHERE id = p_transaction_id;
        WHEN 'link_counterparty' THEN
          UPDATE bank_transactions
          SET matched_counterparty_id = (v_rule.action_params->>'counterparty_id')::UUID,
              processing_status = 'matched'
          WHERE id = p_transaction_id;
        WHEN 'ignore' THEN
          UPDATE bank_transactions
          SET processing_status = 'ignored'
          WHERE id = p_transaction_id;
      END CASE;
      
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

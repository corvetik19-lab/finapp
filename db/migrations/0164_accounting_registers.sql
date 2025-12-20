-- Бухгалтерские регистры (ОСВ, карточка счёта, книги покупок/продаж)

-- План счетов
CREATE TABLE IF NOT EXISTS accounting_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  account_code VARCHAR(10) NOT NULL,
  account_name VARCHAR(500) NOT NULL,
  
  -- Тип счёта
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'income', 'expense', 'off_balance'
  )),
  
  -- Характеристики
  is_active BOOLEAN DEFAULT TRUE,
  is_analytical BOOLEAN DEFAULT FALSE,
  parent_account_id UUID REFERENCES accounting_chart_of_accounts(id) ON DELETE SET NULL,
  
  -- Субконто (аналитика)
  analytics_1 VARCHAR(50), -- Контрагенты
  analytics_2 VARCHAR(50), -- Договоры
  analytics_3 VARCHAR(50), -- Статьи ДДС
  
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_chart_accounts_company ON accounting_chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_code ON accounting_chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_type ON accounting_chart_of_accounts(account_type);

-- Бухгалтерские проводки
CREATE TABLE IF NOT EXISTS accounting_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  entry_date DATE NOT NULL,
  entry_number INTEGER,
  
  -- Дебет
  debit_account_id UUID NOT NULL REFERENCES accounting_chart_of_accounts(id),
  debit_amount BIGINT NOT NULL CHECK (debit_amount >= 0),
  
  -- Кредит
  credit_account_id UUID NOT NULL REFERENCES accounting_chart_of_accounts(id),
  credit_amount BIGINT NOT NULL CHECK (credit_amount >= 0),
  
  -- Описание
  description TEXT,
  
  -- Связи с документами
  document_type VARCHAR(50),
  document_id UUID,
  
  -- Аналитика
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  
  -- Метаданные
  is_auto BOOLEAN DEFAULT FALSE, -- Автоматически сформирована
  is_reversed BOOLEAN DEFAULT FALSE, -- Сторно
  reversed_entry_id UUID REFERENCES accounting_journal_entries(id) ON DELETE SET NULL,
  
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT debit_credit_equal CHECK (debit_amount = credit_amount)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_company ON accounting_journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON accounting_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_debit ON accounting_journal_entries(debit_account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_credit ON accounting_journal_entries(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_document ON accounting_journal_entries(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_counterparty ON accounting_journal_entries(counterparty_id);

-- Остатки по счетам (для быстрого расчёта ОСВ)
CREATE TABLE IF NOT EXISTS accounting_account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounting_chart_of_accounts(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL, -- Начало периода (обычно 1 число месяца)
  
  -- Остаток на начало
  opening_debit BIGINT DEFAULT 0,
  opening_credit BIGINT DEFAULT 0,
  
  -- Обороты за период
  turnover_debit BIGINT DEFAULT 0,
  turnover_credit BIGINT DEFAULT 0,
  
  -- Остаток на конец (вычисляемый)
  closing_debit BIGINT GENERATED ALWAYS AS (
    GREATEST(0, opening_debit - opening_credit + turnover_debit - turnover_credit)
  ) STORED,
  closing_credit BIGINT GENERATED ALWAYS AS (
    GREATEST(0, opening_credit - opening_debit + turnover_credit - turnover_debit)
  ) STORED,
  
  -- Аналитика
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, account_id, period_start, counterparty_id)
);

CREATE INDEX IF NOT EXISTS idx_account_balances_company ON accounting_account_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_account ON accounting_account_balances(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_period ON accounting_account_balances(period_start);

-- Книга покупок
CREATE TABLE IF NOT EXISTS accounting_purchase_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Период
  period_year INTEGER NOT NULL,
  period_quarter INTEGER NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),
  
  -- Номер записи
  entry_number INTEGER NOT NULL,
  
  -- Поставщик
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name VARCHAR(500) NOT NULL,
  counterparty_inn VARCHAR(12),
  counterparty_kpp VARCHAR(9),
  
  -- Документ
  document_type VARCHAR(50) NOT NULL, -- invoice, upd, act
  document_number VARCHAR(100) NOT NULL,
  document_date DATE NOT NULL,
  
  -- Суммы
  total_amount BIGINT NOT NULL,
  vat_amount BIGINT NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 20,
  
  -- Оплата (для вычета)
  payment_date DATE,
  payment_document VARCHAR(200),
  
  -- Код операции
  operation_code VARCHAR(10) DEFAULT '01',
  
  -- Статус
  is_included BOOLEAN DEFAULT TRUE, -- Включена в книгу
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, period_year, period_quarter, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_purchase_ledger_company ON accounting_purchase_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_ledger_period ON accounting_purchase_ledger(period_year, period_quarter);
CREATE INDEX IF NOT EXISTS idx_purchase_ledger_counterparty ON accounting_purchase_ledger(counterparty_id);

-- Книга продаж
CREATE TABLE IF NOT EXISTS accounting_sales_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Период
  period_year INTEGER NOT NULL,
  period_quarter INTEGER NOT NULL CHECK (period_quarter BETWEEN 1 AND 4),
  
  -- Номер записи
  entry_number INTEGER NOT NULL,
  
  -- Покупатель
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name VARCHAR(500) NOT NULL,
  counterparty_inn VARCHAR(12),
  counterparty_kpp VARCHAR(9),
  
  -- Документ (счёт-фактура)
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  
  -- Корректировка
  correction_number VARCHAR(100),
  correction_date DATE,
  
  -- Суммы
  total_amount BIGINT NOT NULL,
  vat_amount BIGINT NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 20,
  
  -- Код операции
  operation_code VARCHAR(10) DEFAULT '01',
  
  -- Статус
  is_included BOOLEAN DEFAULT TRUE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, period_year, period_quarter, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_ledger_company ON accounting_sales_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_period ON accounting_sales_ledger(period_year, period_quarter);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_counterparty ON accounting_sales_ledger(counterparty_id);

-- RLS policies
ALTER TABLE accounting_chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_purchase_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_sales_ledger ENABLE ROW LEVEL SECURITY;

-- RLS для плана счетов
CREATE POLICY "Users can manage chart of accounts"
  ON accounting_chart_of_accounts FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для проводок
CREATE POLICY "Users can manage journal entries"
  ON accounting_journal_entries FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для остатков
CREATE POLICY "Users can manage account balances"
  ON accounting_account_balances FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для книги покупок
CREATE POLICY "Users can manage purchase ledger"
  ON accounting_purchase_ledger FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для книги продаж
CREATE POLICY "Users can manage sales ledger"
  ON accounting_sales_ledger FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Функция для расчёта ОСВ
CREATE OR REPLACE FUNCTION calculate_osv(
  p_company_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  account_code VARCHAR(10),
  account_name VARCHAR(500),
  opening_debit BIGINT,
  opening_credit BIGINT,
  turnover_debit BIGINT,
  turnover_credit BIGINT,
  closing_debit BIGINT,
  closing_credit BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH account_movements AS (
    SELECT 
      coa.account_code,
      coa.account_name,
      COALESCE(SUM(CASE WHEN je.debit_account_id = coa.id AND je.entry_date < p_start_date THEN je.debit_amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN je.credit_account_id = coa.id AND je.entry_date < p_start_date THEN je.credit_amount ELSE 0 END), 0) AS opening_balance,
      COALESCE(SUM(CASE WHEN je.debit_account_id = coa.id AND je.entry_date BETWEEN p_start_date AND p_end_date THEN je.debit_amount ELSE 0 END), 0) AS period_debit,
      COALESCE(SUM(CASE WHEN je.credit_account_id = coa.id AND je.entry_date BETWEEN p_start_date AND p_end_date THEN je.credit_amount ELSE 0 END), 0) AS period_credit
    FROM accounting_chart_of_accounts coa
    LEFT JOIN accounting_journal_entries je ON 
      (je.debit_account_id = coa.id OR je.credit_account_id = coa.id)
      AND je.company_id = p_company_id
      AND je.entry_date <= p_end_date
    WHERE coa.company_id = p_company_id
      AND coa.is_active = TRUE
    GROUP BY coa.id, coa.account_code, coa.account_name
  )
  SELECT 
    am.account_code,
    am.account_name,
    GREATEST(am.opening_balance, 0)::BIGINT AS opening_debit,
    GREATEST(-am.opening_balance, 0)::BIGINT AS opening_credit,
    am.period_debit::BIGINT AS turnover_debit,
    am.period_credit::BIGINT AS turnover_credit,
    GREATEST(am.opening_balance + am.period_debit - am.period_credit, 0)::BIGINT AS closing_debit,
    GREATEST(-(am.opening_balance + am.period_debit - am.period_credit), 0)::BIGINT AS closing_credit
  FROM account_movements am
  WHERE am.opening_balance != 0 OR am.period_debit != 0 OR am.period_credit != 0
  ORDER BY am.account_code;
END;
$$ LANGUAGE plpgsql;

-- Функция для карточки счёта
CREATE OR REPLACE FUNCTION get_account_card(
  p_company_id UUID,
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  entry_date DATE,
  entry_number INTEGER,
  description TEXT,
  correspondent_account VARCHAR(10),
  debit_amount BIGINT,
  credit_amount BIGINT,
  balance BIGINT
) AS $$
DECLARE
  v_opening_balance BIGINT;
BEGIN
  -- Получаем начальный остаток
  SELECT COALESCE(SUM(
    CASE WHEN je.debit_account_id = p_account_id THEN je.debit_amount ELSE 0 END -
    CASE WHEN je.credit_account_id = p_account_id THEN je.credit_amount ELSE 0 END
  ), 0)
  INTO v_opening_balance
  FROM accounting_journal_entries je
  WHERE je.company_id = p_company_id
    AND (je.debit_account_id = p_account_id OR je.credit_account_id = p_account_id)
    AND je.entry_date < p_start_date;

  RETURN QUERY
  WITH movements AS (
    SELECT 
      je.entry_date,
      je.entry_number,
      je.description,
      CASE 
        WHEN je.debit_account_id = p_account_id THEN 
          (SELECT account_code FROM accounting_chart_of_accounts WHERE id = je.credit_account_id)
        ELSE 
          (SELECT account_code FROM accounting_chart_of_accounts WHERE id = je.debit_account_id)
      END AS correspondent,
      CASE WHEN je.debit_account_id = p_account_id THEN je.debit_amount ELSE 0 END AS debit_amt,
      CASE WHEN je.credit_account_id = p_account_id THEN je.credit_amount ELSE 0 END AS credit_amt
    FROM accounting_journal_entries je
    WHERE je.company_id = p_company_id
      AND (je.debit_account_id = p_account_id OR je.credit_account_id = p_account_id)
      AND je.entry_date BETWEEN p_start_date AND p_end_date
    ORDER BY je.entry_date, je.entry_number
  )
  SELECT 
    m.entry_date,
    m.entry_number,
    m.description,
    m.correspondent,
    m.debit_amt,
    m.credit_amt,
    v_opening_balance + SUM(m.debit_amt - m.credit_amt) OVER (ORDER BY m.entry_date, m.entry_number)
  FROM movements m;
END;
$$ LANGUAGE plpgsql;

-- Вставка стандартного плана счетов (основные счета для УСН)
-- Это будет выполнено при создании компании или вручную

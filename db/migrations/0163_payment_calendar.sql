-- Платёжный календарь и учёт денежных средств

-- Платёжный календарь (плановые платежи)
CREATE TABLE IF NOT EXISTS accounting_payment_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Тип платежа
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN (
    'income', 'expense'
  )),
  
  -- Категория
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'customer_payment', 'supplier_payment', 'salary', 'tax', 'loan', 
    'rent', 'utilities', 'services', 'other'
  )),
  
  -- Описание
  name VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Сумма
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'RUB',
  
  -- Даты
  planned_date DATE NOT NULL,
  actual_date DATE,
  
  -- Повторяющийся платёж
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN (
    'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  )),
  recurrence_end_date DATE,
  parent_payment_id UUID REFERENCES accounting_payment_calendar(id) ON DELETE SET NULL,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN (
    'planned', 'confirmed', 'paid', 'cancelled', 'overdue'
  )),
  
  -- Связи
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  counterparty_name VARCHAR(500),
  document_id UUID REFERENCES accounting_documents(id) ON DELETE SET NULL,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES accounting_bank_accounts(id) ON DELETE SET NULL,
  
  -- Приоритет
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN (
    'low', 'normal', 'high', 'critical'
  )),
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_calendar_company ON accounting_payment_calendar(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_calendar_date ON accounting_payment_calendar(planned_date);
CREATE INDEX IF NOT EXISTS idx_payment_calendar_type ON accounting_payment_calendar(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_calendar_status ON accounting_payment_calendar(status);
CREATE INDEX IF NOT EXISTS idx_payment_calendar_category ON accounting_payment_calendar(category);
CREATE INDEX IF NOT EXISTS idx_payment_calendar_counterparty ON accounting_payment_calendar(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_payment_calendar_tender ON accounting_payment_calendar(tender_id);

-- Прогноз движения денежных средств
CREATE TABLE IF NOT EXISTS accounting_cash_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  forecast_date DATE NOT NULL,
  
  -- Начальный остаток
  opening_balance BIGINT DEFAULT 0,
  
  -- Плановые поступления/выбытия
  planned_income BIGINT DEFAULT 0,
  planned_expense BIGINT DEFAULT 0,
  
  -- Фактические поступления/выбытия
  actual_income BIGINT DEFAULT 0,
  actual_expense BIGINT DEFAULT 0,
  
  -- Конечный остаток
  closing_balance BIGINT GENERATED ALWAYS AS (
    opening_balance + planned_income - planned_expense
  ) STORED,
  
  actual_closing_balance BIGINT GENERATED ALWAYS AS (
    opening_balance + actual_income - actual_expense
  ) STORED,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_cash_forecast_company ON accounting_cash_forecast(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_forecast_date ON accounting_cash_forecast(forecast_date);

-- Лимиты платежей (для контроля расходов)
CREATE TABLE IF NOT EXISTS accounting_payment_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN (
    'daily', 'weekly', 'monthly', 'per_payment'
  )),
  
  category VARCHAR(50),
  counterparty_id UUID REFERENCES accounting_counterparties(id) ON DELETE SET NULL,
  
  amount_limit BIGINT NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_limits_company ON accounting_payment_limits(company_id);

-- RLS policies
ALTER TABLE accounting_payment_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_cash_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_payment_limits ENABLE ROW LEVEL SECURITY;

-- RLS для платёжного календаря
CREATE POLICY "Users can view payment calendar of their company"
  ON accounting_payment_calendar FOR SELECT
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert payment calendar of their company"
  ON accounting_payment_calendar FOR INSERT
  WITH CHECK (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can update payment calendar of their company"
  ON accounting_payment_calendar FOR UPDATE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete payment calendar of their company"
  ON accounting_payment_calendar FOR DELETE
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для прогноза ДДС
CREATE POLICY "Users can manage cash forecast of their company"
  ON accounting_cash_forecast FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для лимитов
CREATE POLICY "Users can manage payment limits of their company"
  ON accounting_payment_limits FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Trigger для updated_at
CREATE TRIGGER update_payment_calendar_updated_at
  BEFORE UPDATE ON accounting_payment_calendar
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_cash_forecast_updated_at
  BEFORE UPDATE ON accounting_cash_forecast
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

-- Функция для автоматической пометки просроченных платежей
CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE accounting_payment_calendar
  SET status = 'overdue'
  WHERE status IN ('planned', 'confirmed')
    AND planned_date < CURRENT_DATE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации повторяющихся платежей
CREATE OR REPLACE FUNCTION generate_recurring_payments(
  p_company_id UUID,
  p_until_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  next_date DATE;
  created_count INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT * FROM accounting_payment_calendar
    WHERE company_id = p_company_id
      AND is_recurring = TRUE
      AND status != 'cancelled'
      AND (recurrence_end_date IS NULL OR recurrence_end_date >= CURRENT_DATE)
  LOOP
    next_date := rec.planned_date;
    
    WHILE next_date <= p_until_date LOOP
      -- Вычисляем следующую дату
      CASE rec.recurrence_pattern
        WHEN 'daily' THEN next_date := next_date + INTERVAL '1 day';
        WHEN 'weekly' THEN next_date := next_date + INTERVAL '1 week';
        WHEN 'monthly' THEN next_date := next_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN next_date := next_date + INTERVAL '3 months';
        WHEN 'yearly' THEN next_date := next_date + INTERVAL '1 year';
      END CASE;
      
      -- Проверяем, что не выходим за границы
      IF next_date > p_until_date OR 
         (rec.recurrence_end_date IS NOT NULL AND next_date > rec.recurrence_end_date) THEN
        EXIT;
      END IF;
      
      -- Проверяем, что платёж ещё не создан
      IF NOT EXISTS (
        SELECT 1 FROM accounting_payment_calendar
        WHERE parent_payment_id = rec.id
          AND planned_date = next_date
      ) THEN
        INSERT INTO accounting_payment_calendar (
          company_id, payment_type, category, name, description,
          amount, currency, planned_date, is_recurring,
          recurrence_pattern, recurrence_end_date, parent_payment_id,
          counterparty_id, counterparty_name, tender_id, bank_account_id,
          priority, notes
        ) VALUES (
          rec.company_id, rec.payment_type, rec.category, rec.name, rec.description,
          rec.amount, rec.currency, next_date, FALSE,
          NULL, NULL, rec.id,
          rec.counterparty_id, rec.counterparty_name, rec.tender_id, rec.bank_account_id,
          rec.priority, rec.notes
        );
        
        created_count := created_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN created_count;
END;
$$ LANGUAGE plpgsql;

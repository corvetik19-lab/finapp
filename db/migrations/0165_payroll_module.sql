-- Зарплатный модуль (штатное расписание, начисления, НДФЛ)

-- Должности (штатное расписание)
CREATE TABLE IF NOT EXISTS payroll_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  department VARCHAR(200),
  
  -- Оклад
  base_salary BIGINT NOT NULL DEFAULT 0, -- в копейках
  
  -- Надбавки (в процентах или фиксированные)
  regional_bonus_percent DECIMAL(5,2) DEFAULT 0, -- районный коэффициент
  northern_bonus_percent DECIMAL(5,2) DEFAULT 0, -- северная надбавка
  
  -- Штатные единицы
  headcount INTEGER DEFAULT 1,
  filled_count INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_company ON payroll_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_department ON payroll_positions(department);

-- Сотрудники
CREATE TABLE IF NOT EXISTS payroll_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Личные данные
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  
  -- Документы
  passport_series VARCHAR(4),
  passport_number VARCHAR(6),
  passport_issued_by TEXT,
  passport_issued_date DATE,
  
  inn VARCHAR(12),
  snils VARCHAR(14),
  
  -- Контакты
  phone VARCHAR(50),
  email VARCHAR(200),
  address TEXT,
  
  -- Должность
  position_id UUID REFERENCES payroll_positions(id) ON DELETE SET NULL,
  department VARCHAR(200),
  
  -- Условия работы
  employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN (
    'full_time', 'part_time', 'contract', 'gph'
  )),
  work_rate DECIMAL(3,2) DEFAULT 1.00, -- ставка (0.5, 1.0 и т.д.)
  
  -- Оклад (может отличаться от штатного)
  salary BIGINT NOT NULL DEFAULT 0,
  
  -- Даты
  hire_date DATE NOT NULL,
  termination_date DATE,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active', 'on_leave', 'terminated'
  )),
  
  -- Вычеты НДФЛ
  has_children BOOLEAN DEFAULT FALSE,
  children_count INTEGER DEFAULT 0,
  is_disabled BOOLEAN DEFAULT FALSE,
  is_single_parent BOOLEAN DEFAULT FALSE,
  
  -- Связь с профилем пользователя
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON payroll_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON payroll_employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON payroll_employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_user ON payroll_employees(user_id);

-- Расчётные периоды
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  
  -- Статус
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
    'open', 'calculated', 'approved', 'paid', 'closed'
  )),
  
  -- Даты
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_date DATE,
  
  -- Итоги
  total_accrued BIGINT DEFAULT 0,
  total_deducted BIGINT DEFAULT 0,
  total_to_pay BIGINT DEFAULT 0,
  total_ndfl BIGINT DEFAULT 0,
  
  calculated_at TIMESTAMPTZ,
  calculated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_periods_company ON payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_periods_status ON payroll_periods(status);

-- Типы начислений/удержаний
CREATE TABLE IF NOT EXISTS payroll_accrual_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  
  -- Тип (начисление или удержание)
  type VARCHAR(20) NOT NULL CHECK (type IN ('accrual', 'deduction')),
  
  -- Способ расчёта
  calculation_type VARCHAR(20) DEFAULT 'fixed' CHECK (calculation_type IN (
    'fixed', 'percent', 'hourly', 'daily'
  )),
  
  -- Налогообложение
  is_taxable BOOLEAN DEFAULT TRUE, -- облагается НДФЛ
  is_insurance_base BOOLEAN DEFAULT TRUE, -- входит в базу страх. взносов
  
  is_system BOOLEAN DEFAULT FALSE, -- системный тип
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accrual_types_company ON payroll_accrual_types(company_id);

-- Расчётные листки (начисления сотрудников)
CREATE TABLE IF NOT EXISTS payroll_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  
  -- Рабочее время
  worked_days INTEGER DEFAULT 0,
  worked_hours DECIMAL(6,2) DEFAULT 0,
  sick_days INTEGER DEFAULT 0,
  vacation_days INTEGER DEFAULT 0,
  
  -- Начисления
  salary_accrued BIGINT DEFAULT 0,
  bonus_accrued BIGINT DEFAULT 0,
  vacation_accrued BIGINT DEFAULT 0,
  sick_accrued BIGINT DEFAULT 0,
  other_accrued BIGINT DEFAULT 0,
  total_accrued BIGINT GENERATED ALWAYS AS (
    salary_accrued + bonus_accrued + vacation_accrued + sick_accrued + other_accrued
  ) STORED,
  
  -- Удержания
  ndfl_amount BIGINT DEFAULT 0,
  advance_deducted BIGINT DEFAULT 0,
  alimony_amount BIGINT DEFAULT 0,
  other_deducted BIGINT DEFAULT 0,
  total_deducted BIGINT GENERATED ALWAYS AS (
    ndfl_amount + advance_deducted + alimony_amount + other_deducted
  ) STORED,
  
  -- К выплате
  to_pay BIGINT GENERATED ALWAYS AS (
    salary_accrued + bonus_accrued + vacation_accrued + sick_accrued + other_accrued -
    ndfl_amount - advance_deducted - alimony_amount - other_deducted
  ) STORED,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'calculated', 'approved', 'paid'
  )),
  
  paid_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(period_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_company ON payroll_payslips(company_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payroll_payslips(period_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payroll_payslips(employee_id);

-- Детали начислений/удержаний
CREATE TABLE IF NOT EXISTS payroll_payslip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES payroll_payslips(id) ON DELETE CASCADE,
  accrual_type_id UUID REFERENCES payroll_accrual_types(id) ON DELETE SET NULL,
  
  type VARCHAR(20) NOT NULL CHECK (type IN ('accrual', 'deduction')),
  name VARCHAR(200) NOT NULL,
  
  -- Расчёт
  base_amount BIGINT DEFAULT 0, -- база для расчёта
  rate DECIMAL(10,4), -- ставка (процент или сумма)
  amount BIGINT NOT NULL, -- итоговая сумма
  
  -- Период
  days INTEGER,
  hours DECIMAL(6,2),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payslip_items_payslip ON payroll_payslip_items(payslip_id);

-- Авансы
CREATE TABLE IF NOT EXISTS payroll_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES payroll_employees(id) ON DELETE CASCADE,
  period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
  
  amount BIGINT NOT NULL,
  payment_date DATE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN (
    'planned', 'paid', 'cancelled'
  )),
  
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advances_company ON payroll_advances(company_id);
CREATE INDEX IF NOT EXISTS idx_advances_employee ON payroll_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_period ON payroll_advances(period_id);

-- RLS policies
ALTER TABLE payroll_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_accrual_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payslip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_advances ENABLE ROW LEVEL SECURITY;

-- RLS для должностей
CREATE POLICY "Users can manage positions of their company"
  ON payroll_positions FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для сотрудников
CREATE POLICY "Users can manage employees of their company"
  ON payroll_employees FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для периодов
CREATE POLICY "Users can manage payroll periods of their company"
  ON payroll_periods FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для типов начислений
CREATE POLICY "Users can manage accrual types of their company"
  ON payroll_accrual_types FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для расчётных листков
CREATE POLICY "Users can manage payslips of their company"
  ON payroll_payslips FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- RLS для деталей расчётных листков
CREATE POLICY "Users can manage payslip items"
  ON payroll_payslip_items FOR ALL
  USING (payslip_id IN (
    SELECT ps.id FROM payroll_payslips ps
    WHERE ps.company_id IN (
      SELECT om.company_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  ));

-- RLS для авансов
CREATE POLICY "Users can manage advances of their company"
  ON payroll_advances FOR ALL
  USING (company_id IN (
    SELECT om.company_id FROM organization_members om
    WHERE om.user_id = auth.uid()
  ));

-- Triggers для updated_at
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON payroll_positions
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON payroll_employees
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

CREATE TRIGGER update_payslips_updated_at
  BEFORE UPDATE ON payroll_payslips
  FOR EACH ROW EXECUTE FUNCTION update_accounting_updated_at();

-- Функция расчёта НДФЛ
CREATE OR REPLACE FUNCTION calculate_ndfl(
  p_taxable_amount BIGINT,
  p_children_count INTEGER DEFAULT 0,
  p_is_disabled BOOLEAN DEFAULT FALSE,
  p_is_single_parent BOOLEAN DEFAULT FALSE
)
RETURNS BIGINT AS $$
DECLARE
  v_deduction BIGINT := 0;
  v_tax_base BIGINT;
  v_ndfl BIGINT;
BEGIN
  -- Стандартные вычеты на детей (140000 копеек = 1400 руб на 1-2 ребёнка)
  IF p_children_count >= 1 THEN
    v_deduction := v_deduction + LEAST(p_children_count, 2) * 140000;
  END IF;
  -- На 3+ детей 3000 руб
  IF p_children_count >= 3 THEN
    v_deduction := v_deduction + (p_children_count - 2) * 300000;
  END IF;
  -- Удвоение для одинокого родителя
  IF p_is_single_parent THEN
    v_deduction := v_deduction * 2;
  END IF;
  -- Вычет для инвалида
  IF p_is_disabled THEN
    v_deduction := v_deduction + 50000; -- 500 руб
  END IF;
  
  -- База НДФЛ
  v_tax_base := GREATEST(0, p_taxable_amount - v_deduction);
  
  -- НДФЛ 13%
  v_ndfl := ROUND(v_tax_base * 0.13);
  
  RETURN v_ndfl;
END;
$$ LANGUAGE plpgsql;

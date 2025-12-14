-- =====================================================
-- Suppliers Module v2.0: Tasks, Activities, Contracts
-- =====================================================

-- Задачи по поставщикам
CREATE TABLE IF NOT EXISTS supplier_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Тип задачи
  task_type TEXT NOT NULL DEFAULT 'other' CHECK (task_type IN (
    'call',           -- Позвонить
    'meeting',        -- Встреча
    'email',          -- Написать письмо
    'contract',       -- По договору
    'payment',        -- По оплате
    'delivery',       -- По доставке
    'other'           -- Другое
  )),
  
  -- Приоритет
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',        -- Ожидает
    'in_progress',    -- В работе
    'completed',      -- Выполнена
    'cancelled'       -- Отменена
  )),
  
  -- Сроки
  due_date TIMESTAMPTZ,
  reminder_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Ответственный
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для задач
CREATE INDEX idx_supplier_tasks_company ON supplier_tasks(company_id);
CREATE INDEX idx_supplier_tasks_supplier ON supplier_tasks(supplier_id);
CREATE INDEX idx_supplier_tasks_status ON supplier_tasks(status);
CREATE INDEX idx_supplier_tasks_due_date ON supplier_tasks(due_date);
CREATE INDEX idx_supplier_tasks_assigned ON supplier_tasks(assigned_to);

-- RLS для задач
ALTER TABLE supplier_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_tasks_select" ON supplier_tasks FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_tasks_insert" ON supplier_tasks FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_tasks_update" ON supplier_tasks FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_tasks_delete" ON supplier_tasks FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Триггер updated_at
CREATE TRIGGER supplier_tasks_updated_at
  BEFORE UPDATE ON supplier_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- История взаимодействий (Activity Log)
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Тип активности
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created',        -- Создан поставщик
    'updated',        -- Обновлены данные
    'call_made',      -- Совершён звонок
    'call_received',  -- Входящий звонок
    'email_sent',     -- Отправлено письмо
    'email_received', -- Получено письмо
    'meeting',        -- Встреча
    'note_added',     -- Добавлена заметка
    'file_uploaded',  -- Загружен файл
    'contract_signed',-- Подписан договор
    'task_created',   -- Создана задача
    'task_completed', -- Задача выполнена
    'status_changed', -- Изменён статус
    'rating_changed', -- Изменён рейтинг
    'comment'         -- Комментарий менеджера
  )),
  
  -- Описание активности
  title TEXT NOT NULL,
  description TEXT,
  
  -- Метаданные (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Связанные сущности
  related_task_id UUID REFERENCES supplier_tasks(id) ON DELETE SET NULL,
  related_contact_id UUID REFERENCES supplier_contacts(id) ON DELETE SET NULL,
  related_file_id UUID REFERENCES supplier_files(id) ON DELETE SET NULL,
  
  -- Кто выполнил
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для активностей
CREATE INDEX idx_supplier_activities_company ON supplier_activities(company_id);
CREATE INDEX idx_supplier_activities_supplier ON supplier_activities(supplier_id);
CREATE INDEX idx_supplier_activities_type ON supplier_activities(activity_type);
CREATE INDEX idx_supplier_activities_created ON supplier_activities(created_at DESC);
CREATE INDEX idx_supplier_activities_user ON supplier_activities(user_id);

-- RLS для активностей
ALTER TABLE supplier_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_activities_select" ON supplier_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_activities_insert" ON supplier_activities FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- =====================================================
-- Договоры поставщиков
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Основные данные
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Тип договора
  contract_type TEXT NOT NULL DEFAULT 'supply' CHECK (contract_type IN (
    'supply',         -- Поставки
    'service',        -- Услуги
    'framework',      -- Рамочный
    'nda',            -- NDA
    'other'           -- Другое
  )),
  
  -- Статус
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',          -- Черновик
    'pending',        -- На согласовании
    'active',         -- Действует
    'expired',        -- Истёк
    'terminated'      -- Расторгнут
  )),
  
  -- Даты
  start_date DATE,
  end_date DATE,
  signed_date DATE,
  
  -- Условия оплаты
  payment_terms TEXT CHECK (payment_terms IN (
    'prepayment',     -- Предоплата 100%
    'prepayment_50',  -- Предоплата 50%
    'postpayment',    -- Постоплата
    'deferred_7',     -- Отсрочка 7 дней
    'deferred_14',    -- Отсрочка 14 дней
    'deferred_30',    -- Отсрочка 30 дней
    'deferred_45',    -- Отсрочка 45 дней
    'deferred_60',    -- Отсрочка 60 дней
    'custom'          -- Другое
  )),
  payment_terms_custom TEXT,
  
  -- Сумма договора
  amount BIGINT,
  currency TEXT DEFAULT 'RUB',
  
  -- Файл договора
  file_path TEXT,
  file_name TEXT,
  
  -- Напоминание об окончании
  reminder_days INTEGER DEFAULT 30,
  
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для договоров
CREATE INDEX idx_supplier_contracts_company ON supplier_contracts(company_id);
CREATE INDEX idx_supplier_contracts_supplier ON supplier_contracts(supplier_id);
CREATE INDEX idx_supplier_contracts_status ON supplier_contracts(status);
CREATE INDEX idx_supplier_contracts_end_date ON supplier_contracts(end_date);

-- RLS для договоров
ALTER TABLE supplier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_contracts_select" ON supplier_contracts FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_contracts_insert" ON supplier_contracts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_contracts_update" ON supplier_contracts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_contracts_delete" ON supplier_contracts FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Триггер updated_at
CREATE TRIGGER supplier_contracts_updated_at
  BEFORE UPDATE ON supplier_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Оценки и отзывы
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Оценки по критериям (1-5)
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  delivery_rating INTEGER CHECK (delivery_rating BETWEEN 1 AND 5),
  price_rating INTEGER CHECK (price_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  
  -- Общая оценка (автоматически или вручную)
  overall_rating NUMERIC(2,1) CHECK (overall_rating BETWEEN 1 AND 5),
  
  -- Отзыв
  comment TEXT,
  
  -- Связь с тендером/заказом
  related_tender_id UUID,
  related_order_id UUID,
  
  -- Автор
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для отзывов
CREATE INDEX idx_supplier_reviews_company ON supplier_reviews(company_id);
CREATE INDEX idx_supplier_reviews_supplier ON supplier_reviews(supplier_id);
CREATE INDEX idx_supplier_reviews_rating ON supplier_reviews(overall_rating DESC);

-- RLS для отзывов
ALTER TABLE supplier_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_reviews_select" ON supplier_reviews FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_reviews_insert" ON supplier_reviews FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_reviews_update" ON supplier_reviews FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_reviews_delete" ON supplier_reviews FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Триггер updated_at
CREATE TRIGGER supplier_reviews_updated_at
  BEFORE UPDATE ON supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Прайс-листы
-- =====================================================

CREATE TABLE IF NOT EXISTS supplier_pricelists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Файл
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  
  -- Даты действия
  valid_from DATE,
  valid_until DATE,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для прайс-листов
CREATE INDEX idx_supplier_pricelists_company ON supplier_pricelists(company_id);
CREATE INDEX idx_supplier_pricelists_supplier ON supplier_pricelists(supplier_id);
CREATE INDEX idx_supplier_pricelists_active ON supplier_pricelists(is_active);

-- RLS для прайс-листов
ALTER TABLE supplier_pricelists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_pricelists_select" ON supplier_pricelists FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_pricelists_insert" ON supplier_pricelists FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_pricelists_update" ON supplier_pricelists FOR UPDATE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "supplier_pricelists_delete" ON supplier_pricelists FOR DELETE
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

-- Триггер updated_at
CREATE TRIGGER supplier_pricelists_updated_at
  BEFORE UPDATE ON supplier_pricelists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Геолокация - добавляем поля к suppliers
-- =====================================================

ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Индекс для геопоиска
CREATE INDEX IF NOT EXISTS idx_suppliers_geo ON suppliers(latitude, longitude) WHERE latitude IS NOT NULL;

-- =====================================================
-- Функция для автоматического обновления рейтинга
-- =====================================================

CREATE OR REPLACE FUNCTION update_supplier_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers 
  SET rating = (
    SELECT ROUND(AVG(overall_rating)::numeric, 1)::integer
    FROM supplier_reviews 
    WHERE supplier_id = NEW.supplier_id
  )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplier_reviews_update_rating
  AFTER INSERT OR UPDATE ON supplier_reviews
  FOR EACH ROW EXECUTE FUNCTION update_supplier_rating();

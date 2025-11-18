-- Миграция: Система тендеров
-- Дата: 2025-11-10
-- Описание: Полная система управления тендерами по аналогу CRM-конкурента

-- ============================================================
-- 1. ТИПЫ ТЕНДЕРОВ
-- ============================================================

CREATE TABLE IF NOT EXISTS tender_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальное имя в рамках компании
  UNIQUE(company_id, name)
);

-- Индексы
CREATE INDEX idx_tender_types_company_id ON tender_types(company_id);

-- Триггер
CREATE TRIGGER tender_types_updated_at
  BEFORE UPDATE ON tender_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Добавляем системные типы (общие для всех)
INSERT INTO tender_types (company_id, name, description) VALUES
(NULL, 'ФЗ-44', 'Федеральный закон о контрактной системе'),
(NULL, 'ФЗ-223', 'Федеральный закон о закупках отдельных видов юридических лиц'),
(NULL, 'ФЗ-275', 'Федеральный закон о закупках инновационной продукции'),
(NULL, 'ПП-615', 'Постановление правительства'),
(NULL, 'Коммерческие закупки', 'Коммерческие закупки без регулирования');

-- ============================================================
-- 2. ЭТАПЫ ТЕНДЕРОВ
-- ============================================================

CREATE TABLE IF NOT EXISTS tender_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tender_dept', 'realization', 'archive')),
  order_index INTEGER NOT NULL,
  color TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, category, order_index)
);

-- Индексы
CREATE INDEX idx_tender_stages_company_id ON tender_stages(company_id);
CREATE INDEX idx_tender_stages_category ON tender_stages(category);
CREATE INDEX idx_tender_stages_order ON tender_stages(order_index);

-- Триггер
CREATE TRIGGER tender_stages_updated_at
  BEFORE UPDATE ON tender_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Добавляем системные этапы (по аналогу CRM)
-- Категория: Тендерный отдел
INSERT INTO tender_stages (company_id, name, category, order_index, color) VALUES
(NULL, 'Анализ и просчёт', 'tender_dept', 1, '#8b5cf6'),
(NULL, 'Проверка', 'tender_dept', 2, '#ec4899'),
(NULL, 'Подача', 'tender_dept', 3, '#3b82f6'),
(NULL, 'Подан. Рассмотрение заявки', 'tender_dept', 4, '#06b6d4'),
(NULL, 'Торги', 'tender_dept', 5, '#f59e0b'),
(NULL, 'Ждём итоги', 'tender_dept', 6, '#eab308'),
(NULL, 'Победа. Ждём договор', 'tender_dept', 7, '#10b981'),
(NULL, 'Заключение договора', 'tender_dept', 8, '#22c55e'),
(NULL, 'Договор подписан', 'tender_dept', 9, '#10b981'),
(NULL, 'Не участвуем', 'tender_dept', 10, '#6b7280'),
(NULL, 'Не прошло проверку', 'tender_dept', 11, '#ef4444'),
(NULL, 'Не подано', 'tender_dept', 12, '#ef4444'),
(NULL, 'Проиграли', 'tender_dept', 13, '#ef4444'),
(NULL, 'Договор не заключен', 'tender_dept', 14, '#ef4444');

-- Категория: Реализация
INSERT INTO tender_stages (company_id, name, category, order_index, color, is_final) VALUES
(NULL, 'Новые контракты в реализацию', 'realization', 1, '#3b82f6', FALSE),
(NULL, 'Контракты «Ждём заявки»', 'realization', 2, '#06b6d4', FALSE),
(NULL, 'Контракты в поставке', 'realization', 3, '#f59e0b', FALSE),
(NULL, 'Контракты на оплате', 'realization', 4, '#eab308', FALSE),
(NULL, 'Контракты под вопросом', 'realization', 5, '#ef4444', FALSE),
(NULL, 'Завершен', 'realization', 6, '#10b981', TRUE);

-- ============================================================
-- 3. ТЕНДЕРЫ
-- ============================================================

CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Основная информация
  purchase_number TEXT NOT NULL,
  project_name TEXT,
  subject TEXT NOT NULL,
  method TEXT, -- способ определения
  type_id UUID REFERENCES tender_types(id),
  customer TEXT NOT NULL,
  city TEXT,
  platform TEXT, -- электронная площадка
  
  -- Финансы (в копейках для точности)
  nmck BIGINT NOT NULL, -- начальная максимальная цена контракта
  our_price BIGINT,
  contract_price BIGINT,
  application_security BIGINT, -- обеспечение заявки
  contract_security BIGINT, -- обеспечение контракта
  
  -- Даты
  submission_deadline TIMESTAMPTZ NOT NULL,
  auction_date TIMESTAMPTZ,
  results_date TIMESTAMPTZ,
  review_date TIMESTAMPTZ,
  
  -- Ответственные (по аналогу CRM)
  manager_id UUID REFERENCES profiles(id), -- менеджер
  specialist_id UUID REFERENCES profiles(id), -- тендерный специалист
  investor_id UUID REFERENCES profiles(id), -- инвестор
  executor_id UUID REFERENCES profiles(id), -- ответственный за реализацию
  
  -- Статус и этап
  stage_id UUID NOT NULL REFERENCES tender_stages(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'archived')),
  
  -- Метаданные
  comment TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Полнотекстовый поиск
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('russian', 
      coalesce(purchase_number, '') || ' ' ||
      coalesce(project_name, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(customer, '')
    )
  ) STORED,
  
  -- Уникальный номер закупки в рамках компании
  UNIQUE(company_id, purchase_number)
);

-- Индексы
CREATE INDEX idx_tenders_company_id ON tenders(company_id);
CREATE INDEX idx_tenders_created_by ON tenders(created_by);
CREATE INDEX idx_tenders_stage_id ON tenders(stage_id);
CREATE INDEX idx_tenders_status ON tenders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenders_manager_id ON tenders(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_tenders_specialist_id ON tenders(specialist_id) WHERE specialist_id IS NOT NULL;
CREATE INDEX idx_tenders_investor_id ON tenders(investor_id) WHERE investor_id IS NOT NULL;
CREATE INDEX idx_tenders_executor_id ON tenders(executor_id) WHERE executor_id IS NOT NULL;
CREATE INDEX idx_tenders_submission_deadline ON tenders(submission_deadline);
CREATE INDEX idx_tenders_created_at ON tenders(created_at);
CREATE INDEX idx_tenders_search_vector ON tenders USING GIN(search_vector);
CREATE INDEX idx_tenders_purchase_number ON tenders(purchase_number);

-- Триггер
CREATE TRIGGER tenders_updated_at
  BEFORE UPDATE ON tenders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. ИСТОРИЯ ПЕРЕХОДОВ ТЕНДЕРА
-- ============================================================

CREATE TABLE IF NOT EXISTS tender_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES tender_stages(id),
  to_stage_id UUID NOT NULL REFERENCES tender_stages(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_tender_stage_history_tender_id ON tender_stage_history(tender_id);
CREATE INDEX idx_tender_stage_history_created_at ON tender_stage_history(created_at);

-- Триггер автоматического создания записи в истории при изменении этапа
CREATE OR REPLACE FUNCTION log_tender_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO tender_stage_history (tender_id, from_stage_id, to_stage_id, changed_by)
    VALUES (NEW.id, OLD.stage_id, NEW.stage_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenders_stage_change
  AFTER UPDATE ON tenders
  FOR EACH ROW
  EXECUTE FUNCTION log_tender_stage_change();

-- ============================================================
-- 5. ВЛОЖЕНИЯ ТЕНДЕРОВ
-- ============================================================

CREATE TABLE IF NOT EXISTS tender_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Файл
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- путь в Supabase Storage
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Тип документа
  document_type TEXT CHECK (document_type IN (
    'application', -- заявка
    'contract', -- договор
    'protocol', -- протокол
    'specification', -- спецификация
    'other'
  )),
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_tender_attachments_tender_id ON tender_attachments(tender_id);
CREATE INDEX idx_tender_attachments_uploaded_by ON tender_attachments(uploaded_by);
CREATE INDEX idx_tender_attachments_document_type ON tender_attachments(document_type);

-- ============================================================
-- 6. КОММЕНТАРИИ К ТЕНДЕРАМ
-- ============================================================

CREATE TABLE IF NOT EXISTS tender_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  parent_id UUID REFERENCES tender_comments(id) ON DELETE CASCADE, -- для ответов
  
  content TEXT NOT NULL,
  mentions UUID[], -- упомянутые пользователи
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_tender_comments_tender_id ON tender_comments(tender_id);
CREATE INDEX idx_tender_comments_author_id ON tender_comments(author_id);
CREATE INDEX idx_tender_comments_parent_id ON tender_comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_tender_comments_created_at ON tender_comments(created_at);

-- Триггер
CREATE TRIGGER tender_comments_updated_at
  BEFORE UPDATE ON tender_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. RLS ПОЛИТИКИ ДЛЯ ТЕНДЕРОВ
-- ============================================================

-- Включаем RLS
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_comments ENABLE ROW LEVEL SECURITY;

-- Политики для tenders
-- Сотрудники компании видят тендеры своей компании
CREATE POLICY "Company members can view their company tenders"
  ON tenders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tenders.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Сотрудники с правами могут создавать тендеры
CREATE POLICY "Members with permissions can create tenders"
  ON tenders FOR INSERT
  WITH CHECK (
    check_user_permission(company_id, auth.uid(), 'tenders', 'create')
  );

-- Сотрудники с правами могут обновлять тендеры
CREATE POLICY "Members with permissions can update tenders"
  ON tenders FOR UPDATE
  USING (
    check_user_permission(company_id, auth.uid(), 'tenders', 'update')
    OR manager_id = auth.uid()
    OR specialist_id = auth.uid()
    OR executor_id = auth.uid()
  );

-- Сотрудники с правами могут удалять тендеры (soft delete)
CREATE POLICY "Members with permissions can delete tenders"
  ON tenders FOR DELETE
  USING (
    check_user_permission(company_id, auth.uid(), 'tenders', 'delete')
  );

-- Политики для tender_stages
-- Все видят системные этапы + этапы своей компании
CREATE POLICY "Members can view tender stages"
  ON tender_stages FOR SELECT
  USING (
    company_id IS NULL -- системные
    OR EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_stages.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Политики для tender_types
-- Все видят системные типы + типы своей компании
CREATE POLICY "Members can view tender types"
  ON tender_types FOR SELECT
  USING (
    company_id IS NULL -- системные
    OR EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = tender_types.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Политики для tender_stage_history
-- Видят историю тендеров своей компании
CREATE POLICY "Members can view tender history"
  ON tender_stage_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      JOIN company_members ON company_members.company_id = tenders.company_id
      WHERE tenders.id = tender_stage_history.tender_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Политики для tender_attachments
-- Видят вложения тендеров своей компании
CREATE POLICY "Members can view tender attachments"
  ON tender_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      JOIN company_members ON company_members.company_id = tenders.company_id
      WHERE tenders.id = tender_attachments.tender_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Могут загружать вложения
CREATE POLICY "Members can upload tender attachments"
  ON tender_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_attachments.tender_id
      AND check_user_permission(tenders.company_id, auth.uid(), 'tenders', 'update')
    )
  );

-- Политики для tender_comments
-- Видят комментарии тендеров своей компании
CREATE POLICY "Members can view tender comments"
  ON tender_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      JOIN company_members ON company_members.company_id = tenders.company_id
      WHERE tenders.id = tender_comments.tender_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
  );

-- Могут создавать комментарии
CREATE POLICY "Members can create tender comments"
  ON tender_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      JOIN company_members ON company_members.company_id = tenders.company_id
      WHERE tenders.id = tender_comments.tender_id
      AND company_members.user_id = auth.uid()
      AND company_members.status = 'active'
    )
    AND author_id = auth.uid()
  );

-- ============================================================
-- 8. ФУНКЦИИ HELPER
-- ============================================================

-- Функция получения статистики по тендерам компании
CREATE OR REPLACE FUNCTION get_company_tender_stats(p_company_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  active_count BIGINT,
  won_count BIGINT,
  lost_count BIGINT,
  total_nmck BIGINT,
  total_contract_price BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'won')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'lost')::BIGINT,
    COALESCE(SUM(nmck), 0)::BIGINT,
    COALESCE(SUM(contract_price), 0)::BIGINT
  FROM tenders
  WHERE company_id = p_company_id
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 9. КОММЕНТАРИИ
-- ============================================================

COMMENT ON TABLE tenders IS 'Тендеры компании (по аналогу CRM-конкурента)';
COMMENT ON TABLE tender_stages IS 'Этапы жизненного цикла тендера';
COMMENT ON TABLE tender_types IS 'Типы тендеров (ФЗ-44, ФЗ-223 и т.д.)';
COMMENT ON TABLE tender_stage_history IS 'История переходов тендера между этапами';
COMMENT ON TABLE tender_attachments IS 'Документы и файлы тендера';
COMMENT ON TABLE tender_comments IS 'Комментарии к тендеру с упоминаниями';

COMMENT ON COLUMN tenders.nmck IS 'Начальная (максимальная) цена контракта в копейках';
COMMENT ON COLUMN tenders.our_price IS 'Наша цена предложения в копейках';
COMMENT ON COLUMN tenders.contract_price IS 'Итоговая цена контракта в копейках';
COMMENT ON COLUMN tenders.application_security IS 'Обеспечение заявки (банковская гарантия) в копейках';
COMMENT ON COLUMN tenders.contract_security IS 'Обеспечение контракта (банковская гарантия) в копейках';

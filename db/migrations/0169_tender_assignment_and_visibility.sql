-- Миграция: Назначение тендеров и видимость по ролям
-- Дата: 2025-12-20
-- Описание: Расширяем систему назначения тендеров, добавляем аналитику времени на этапах

-- ============================================================
-- 1. Добавляем время входа/выхода в tender_stage_history
-- ============================================================

-- Добавляем поля для аналитики времени на этапе
ALTER TABLE tender_stage_history 
ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);

-- Индекс для быстрого поиска по времени
CREATE INDEX IF NOT EXISTS idx_tender_stage_history_entered_at ON tender_stage_history(entered_at);
CREATE INDEX IF NOT EXISTS idx_tender_stage_history_employee ON tender_stage_history(employee_id);

-- ============================================================
-- 2. Обновляем триггер логирования переходов этапов
-- ============================================================

-- Обновляем функцию логирования чтобы закрывать предыдущий этап
CREATE OR REPLACE FUNCTION log_tender_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    -- Закрываем предыдущий этап (устанавливаем exited_at)
    UPDATE tender_stage_history 
    SET exited_at = NOW()
    WHERE tender_id = NEW.id 
    AND to_stage_id = OLD.stage_id 
    AND exited_at IS NULL;
    
    -- Получаем текущего назначенного сотрудника
    -- (берём первого из tender_responsible если есть)
    INSERT INTO tender_stage_history (tender_id, from_stage_id, to_stage_id, changed_by, entered_at, employee_id)
    SELECT 
      NEW.id, 
      OLD.stage_id, 
      NEW.stage_id, 
      auth.uid(),
      NOW(),
      (SELECT employee_id FROM tender_responsible WHERE tender_id = NEW.id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Обновляем RLS политики для видимости тендеров
-- ============================================================

-- Удаляем старую политику
DROP POLICY IF EXISTS "Company members can view their company tenders" ON tenders;

-- Новая политика: сотрудник видит свои назначенные тендеры + админ видит все
CREATE POLICY "Employees see own tenders or admin sees all" ON tenders
  FOR SELECT
  USING (
    -- Сотрудник видит тендеры где он назначен ответственным
    EXISTS (
      SELECT 1 FROM tender_responsible tr
      JOIN employees e ON e.id = tr.employee_id
      WHERE tr.tender_id = tenders.id
      AND e.user_id = auth.uid()
    )
    OR
    -- Админ организации видит все тендеры своей компании
    EXISTS (
      SELECT 1 FROM company_members cm
      WHERE cm.company_id = tenders.company_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.role = 'admin'
    )
    OR
    -- Создатель тендера видит свой тендер
    tenders.created_by = auth.uid()
    OR
    -- Глобальные админы видят все
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.global_role IN ('super_admin', 'admin')
    )
  );

-- Обновляем политики для tender_responsible
DROP POLICY IF EXISTS tender_responsible_select_policy ON tender_responsible;
DROP POLICY IF EXISTS tender_responsible_insert_policy ON tender_responsible;
DROP POLICY IF EXISTS tender_responsible_delete_policy ON tender_responsible;

-- Новая политика чтения: члены компании видят ответственных
CREATE POLICY "Company members can view responsible" ON tender_responsible
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders t
      JOIN company_members cm ON cm.company_id = t.company_id
      WHERE t.id = tender_responsible.tender_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Политика добавления: только админ может назначать
CREATE POLICY "Admin can assign responsible" ON tender_responsible
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders t
      JOIN company_members cm ON cm.company_id = t.company_id
      WHERE t.id = tender_responsible.tender_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.role = 'admin'
    )
  );

-- Политика удаления: только админ может убирать ответственных
CREATE POLICY "Admin can remove responsible" ON tender_responsible
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenders t
      JOIN company_members cm ON cm.company_id = t.company_id
      WHERE t.id = tender_responsible.tender_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.role = 'admin'
    )
  );

-- ============================================================
-- 4. Функция для получения времени на этапе
-- ============================================================

CREATE OR REPLACE FUNCTION get_tender_stage_duration(p_tender_id UUID, p_stage_id UUID)
RETURNS INTERVAL AS $$
DECLARE
  v_duration INTERVAL;
BEGIN
  SELECT 
    COALESCE(exited_at, NOW()) - entered_at
  INTO v_duration
  FROM tender_stage_history
  WHERE tender_id = p_tender_id 
  AND to_stage_id = p_stage_id
  ORDER BY entered_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_duration, INTERVAL '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Включаем Realtime для тендеров
-- ============================================================

-- Добавляем таблицы в realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tenders;
ALTER PUBLICATION supabase_realtime ADD TABLE tender_responsible;

-- ============================================================
-- 6. Комментарии
-- ============================================================

COMMENT ON COLUMN tender_stage_history.entered_at IS 'Время входа на этап';
COMMENT ON COLUMN tender_stage_history.exited_at IS 'Время выхода с этапа (NULL если текущий)';
COMMENT ON COLUMN tender_stage_history.employee_id IS 'Сотрудник на момент перехода';
COMMENT ON FUNCTION get_tender_stage_duration IS 'Возвращает время нахождения тендера на указанном этапе';

-- Миграция: Система задач и календаря для тендеров
-- Дата: 2025-11-11
-- Описание: Таблицы для задач, событий календаря и напоминаний

-- =====================================================
-- 1. ТАБЛИЦА ЗАДАЧ
-- =====================================================

CREATE TABLE IF NOT EXISTS tender_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  
  -- Основная информация
  title TEXT NOT NULL,
  description TEXT,
  
  -- Статус и приоритет
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Даты
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Ответственные
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Метаданные
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  checklist JSONB DEFAULT '[]'::jsonb,  -- Список подзадач
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для задач
CREATE INDEX idx_tender_tasks_company ON tender_tasks(company_id, created_at DESC);
CREATE INDEX idx_tender_tasks_tender ON tender_tasks(tender_id) WHERE tender_id IS NOT NULL;
CREATE INDEX idx_tender_tasks_assigned ON tender_tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tender_tasks_status ON tender_tasks(status, due_date);
CREATE INDEX idx_tender_tasks_due_date ON tender_tasks(due_date) WHERE due_date IS NOT NULL AND status != 'completed';

-- =====================================================
-- 2. ТАБЛИЦА СОБЫТИЙ КАЛЕНДАРЯ
-- =====================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tender_tasks(id) ON DELETE CASCADE,
  
  -- Основная информация
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Тип события
  event_type TEXT NOT NULL CHECK (event_type IN (
    'deadline',           -- Дедлайн тендера
    'meeting',            -- Встреча
    'presentation',       -- Презентация
    'submission',         -- Подача документов
    'auction',            -- Аукцион
    'contract_signing',   -- Подписание контракта
    'payment',            -- Оплата
    'delivery',           -- Поставка
    'other'               -- Другое
  )),
  
  -- Время
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  
  -- Повторение
  recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end TIMESTAMPTZ,
  
  -- Участники
  participants UUID[] DEFAULT ARRAY[]::UUID[],
  organizer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Напоминания
  reminders JSONB DEFAULT '[]'::jsonb,  -- [{minutes: 15, sent: false}, ...]
  
  -- Метаданные
  color TEXT,
  url TEXT,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Проверка дат
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Индексы для событий
CREATE INDEX idx_calendar_events_company ON calendar_events(company_id, start_time DESC);
CREATE INDEX idx_calendar_events_tender ON calendar_events(tender_id) WHERE tender_id IS NOT NULL;
CREATE INDEX idx_calendar_events_task ON calendar_events(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_calendar_events_time_range ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_organizer ON calendar_events(organizer) WHERE organizer IS NOT NULL;
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type, start_time);

-- =====================================================
-- 3. ТАБЛИЦА НАПОМИНАНИЙ
-- =====================================================

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tender_tasks(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Время напоминания
  remind_at TIMESTAMPTZ NOT NULL,
  
  -- Статус
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  
  -- Способ доставки
  method TEXT NOT NULL DEFAULT 'notification' CHECK (method IN ('notification', 'email', 'both')),
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Проверка: должна быть связь либо с задачей, либо с событием
  CONSTRAINT has_reference CHECK (
    (task_id IS NOT NULL AND event_id IS NULL) OR
    (task_id IS NULL AND event_id IS NOT NULL)
  )
);

-- Индексы для напоминаний
CREATE INDEX idx_task_reminders_task ON task_reminders(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_task_reminders_event ON task_reminders(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_task_reminders_user ON task_reminders(user_id, remind_at);
CREATE INDEX idx_task_reminders_pending ON task_reminders(remind_at) WHERE sent = FALSE;

-- =====================================================
-- 4. RLS ПОЛИТИКИ
-- =====================================================

-- Включаем RLS
ALTER TABLE tender_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Политики для tender_tasks
CREATE POLICY "Users can view tasks in their company"
  ON tender_tasks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their company"
  ON tender_tasks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their company"
  ON tender_tasks FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tasks or if admin"
  ON tender_tasks FOR DELETE
  USING (
    created_by = auth.uid() OR
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'company_admin')
    )
  );

-- Политики для calendar_events
CREATE POLICY "Users can view events in their company"
  ON calendar_events FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events in their company"
  ON calendar_events FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update events in their company"
  ON calendar_events FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own events or if admin"
  ON calendar_events FOR DELETE
  USING (
    organizer = auth.uid() OR
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'org_admin', 'company_admin')
    )
  );

-- Политики для task_reminders
CREATE POLICY "Users can view own reminders"
  ON task_reminders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminders"
  ON task_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON task_reminders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
  ON task_reminders FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 5. ФУНКЦИИ
-- =====================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON tender_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

CREATE TRIGGER trigger_update_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Функция для автоматического создания события при создании задачи с due_date
CREATE OR REPLACE FUNCTION create_event_for_task()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.due_date IS NOT NULL THEN
    INSERT INTO calendar_events (
      company_id,
      tender_id,
      task_id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      organizer
    )
    VALUES (
      NEW.company_id,
      NEW.tender_id,
      NEW.id,
      NEW.title,
      NEW.description,
      'deadline',
      NEW.due_date - INTERVAL '1 hour',
      NEW.due_date,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_event_for_task
  AFTER INSERT ON tender_tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_event_for_task();

-- Функция для получения задач с фильтрами
CREATE OR REPLACE FUNCTION get_tasks_filtered(
  p_company_id UUID,
  p_status TEXT DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_tender_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  due_date TIMESTAMPTZ,
  assigned_to UUID,
  tender_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.assigned_to,
    t.tender_id,
    t.created_at
  FROM tender_tasks t
  WHERE t.company_id = p_company_id
    AND (p_status IS NULL OR t.status = p_status)
    AND (p_assigned_to IS NULL OR t.assigned_to = p_assigned_to)
    AND (p_tender_id IS NULL OR t.tender_id = p_tender_id)
  ORDER BY 
    CASE t.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Функция для получения событий в диапазоне дат
CREATE OR REPLACE FUNCTION get_events_in_range(
  p_company_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  event_type TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  tender_id UUID,
  task_id UUID,
  all_day BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.event_type,
    e.start_time,
    e.end_time,
    e.tender_id,
    e.task_id,
    e.all_day
  FROM calendar_events e
  WHERE e.company_id = p_company_id
    AND e.start_time <= p_end_date
    AND e.end_time >= p_start_date
  ORDER BY e.start_time ASC;
END;
$$;

-- =====================================================
-- КОММЕНТАРИИ
-- =====================================================

COMMENT ON TABLE tender_tasks IS 'Задачи по тендерам';
COMMENT ON TABLE calendar_events IS 'События календаря';
COMMENT ON TABLE task_reminders IS 'Напоминания о задачах и событиях';

COMMENT ON FUNCTION get_tasks_filtered IS 'Получение задач с фильтрацией и сортировкой';
COMMENT ON FUNCTION get_events_in_range IS 'Получение событий календаря в диапазоне дат';

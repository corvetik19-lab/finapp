-- Миграция: Создание таблицы для множественных ответственных за тендер
-- Дата: 2025-11-14
-- Описание: Создаём таблицу tender_responsible для связи многие-ко-многим между тендерами и сотрудниками

-- Создаём таблицу связи
CREATE TABLE IF NOT EXISTS tender_responsible (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Уникальное ограничение: один сотрудник не может быть добавлен дважды к одному тендеру
  UNIQUE(tender_id, employee_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_tender_responsible_tender_id ON tender_responsible(tender_id);
CREATE INDEX idx_tender_responsible_employee_id ON tender_responsible(employee_id);

-- RLS политики
ALTER TABLE tender_responsible ENABLE ROW LEVEL SECURITY;

-- Политика на чтение: пользователь видит только ответственных своей компании
CREATE POLICY tender_responsible_select_policy ON tender_responsible
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders t
      WHERE t.id = tender_responsible.tender_id
      AND t.created_by = auth.uid()
    )
  );

-- Политика на добавление: пользователь может добавлять ответственных только к своим тендерам
CREATE POLICY tender_responsible_insert_policy ON tender_responsible
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders t
      WHERE t.id = tender_responsible.tender_id
      AND t.created_by = auth.uid()
    )
  );

-- Политика на удаление: пользователь может удалять ответственных только из своих тендеров
CREATE POLICY tender_responsible_delete_policy ON tender_responsible
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenders t
      WHERE t.id = tender_responsible.tender_id
      AND t.created_by = auth.uid()
    )
  );

-- Комментарии
COMMENT ON TABLE tender_responsible IS 'Связь между тендерами и ответственными сотрудниками (многие-ко-многим)';
COMMENT ON COLUMN tender_responsible.tender_id IS 'ID тендера';
COMMENT ON COLUMN tender_responsible.employee_id IS 'ID ответственного сотрудника';

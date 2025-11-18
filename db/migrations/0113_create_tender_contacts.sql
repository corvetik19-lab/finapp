-- Создание таблицы контактов контрагентов для тендеров
CREATE TABLE IF NOT EXISTS tender_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  position VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tender_contacts_tender_id ON tender_contacts(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_contacts_name ON tender_contacts(name);
CREATE INDEX IF NOT EXISTS idx_tender_contacts_company ON tender_contacts(company);

-- RLS политики
ALTER TABLE tender_contacts ENABLE ROW LEVEL SECURITY;

-- Политика на чтение: пользователь может видеть контакты своих тендеров
CREATE POLICY "Users can view contacts of their tenders"
  ON tender_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_contacts.tender_id
      AND tenders.created_by = auth.uid()
    )
  );

-- Политика на создание: пользователь может создавать контакты для своих тендеров
CREATE POLICY "Users can create contacts for their tenders"
  ON tender_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_contacts.tender_id
      AND tenders.created_by = auth.uid()
    )
  );

-- Политика на обновление: пользователь может обновлять контакты своих тендеров
CREATE POLICY "Users can update contacts of their tenders"
  ON tender_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_contacts.tender_id
      AND tenders.created_by = auth.uid()
    )
  );

-- Политика на удаление: пользователь может удалять контакты своих тендеров
CREATE POLICY "Users can delete contacts of their tenders"
  ON tender_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tenders
      WHERE tenders.id = tender_contacts.tender_id
      AND tenders.created_by = auth.uid()
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_tender_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tender_contacts_updated_at
  BEFORE UPDATE ON tender_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_tender_contacts_updated_at();

-- Комментарии
COMMENT ON TABLE tender_contacts IS 'Контакты контрагентов для тендеров';
COMMENT ON COLUMN tender_contacts.name IS 'ФИО контактного лица';
COMMENT ON COLUMN tender_contacts.company IS 'Название компании контрагента';
COMMENT ON COLUMN tender_contacts.position IS 'Должность контактного лица';
COMMENT ON COLUMN tender_contacts.phone IS 'Телефон';
COMMENT ON COLUMN tender_contacts.email IS 'Email';
COMMENT ON COLUMN tender_contacts.notes IS 'Дополнительные заметки';

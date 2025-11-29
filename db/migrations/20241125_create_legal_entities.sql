-- Миграция: Создание таблицы юридических лиц
-- Описание: Хранение данных компаний для подстановки в документы

CREATE TABLE IF NOT EXISTS legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Основные данные
  full_name VARCHAR(500) NOT NULL,           -- Полное наименование
  short_name VARCHAR(255),                    -- Краткое наименование
  legal_form VARCHAR(100),                    -- Организационно-правовая форма (ООО, ИП, АО и т.д.)
  
  -- Регистрационные данные
  inn VARCHAR(12) NOT NULL,                   -- ИНН (10 или 12 цифр)
  kpp VARCHAR(9),                             -- КПП (9 цифр, только для юр. лиц)
  ogrn VARCHAR(15),                           -- ОГРН (13 цифр) или ОГРНИП (15 цифр)
  okpo VARCHAR(14),                           -- ОКПО
  okved VARCHAR(20),                          -- Основной ОКВЭД
  registration_date DATE,                     -- Дата регистрации
  
  -- Адреса
  legal_address TEXT,                         -- Юридический адрес
  legal_address_postal_code VARCHAR(10),      -- Индекс юр. адреса
  actual_address TEXT,                        -- Фактический адрес
  actual_address_postal_code VARCHAR(10),     -- Индекс факт. адреса
  
  -- Банковские реквизиты
  bank_name VARCHAR(255),                     -- Наименование банка
  bank_bik VARCHAR(9),                        -- БИК банка
  bank_account VARCHAR(20),                   -- Расчётный счёт
  bank_corr_account VARCHAR(20),              -- Корреспондентский счёт
  
  -- Руководство
  director_name VARCHAR(255),                 -- ФИО руководителя
  director_position VARCHAR(100),             -- Должность руководителя
  director_basis VARCHAR(255),                -- Основание (Устав, Доверенность и т.д.)
  accountant_name VARCHAR(255),               -- ФИО главного бухгалтера
  
  -- Контакты
  phone VARCHAR(50),                          -- Телефон
  email VARCHAR(255),                         -- Email
  website VARCHAR(255),                       -- Веб-сайт
  
  -- Файлы
  logo_url TEXT,                              -- URL логотипа
  stamp_url TEXT,                             -- URL печати
  signature_url TEXT,                         -- URL подписи руководителя
  
  -- Дополнительно
  tax_system VARCHAR(50),                     -- Система налогообложения (ОСНО, УСН и т.д.)
  is_default BOOLEAN DEFAULT false,           -- Юр. лицо по умолчанию
  is_active BOOLEAN DEFAULT true,             -- Активно
  notes TEXT,                                 -- Примечания
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_legal_entities_company_id ON legal_entities(company_id);
CREATE INDEX idx_legal_entities_inn ON legal_entities(inn);
CREATE INDEX idx_legal_entities_is_default ON legal_entities(company_id, is_default) WHERE is_default = true;

-- RLS политики
ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view legal entities of their company"
  ON legal_entities FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert legal entities for their company"
  ON legal_entities FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update legal entities of their company"
  ON legal_entities FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete legal entities of their company"
  ON legal_entities FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_legal_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_legal_entities_updated_at
  BEFORE UPDATE ON legal_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_legal_entities_updated_at();

-- Функция для сброса is_default при установке нового значения по умолчанию
CREATE OR REPLACE FUNCTION reset_default_legal_entity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true AND (OLD IS NULL OR OLD.is_default = false) THEN
    UPDATE legal_entities 
    SET is_default = false 
    WHERE company_id = NEW.company_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_default_legal_entity
  BEFORE INSERT OR UPDATE ON legal_entities
  FOR EACH ROW
  EXECUTE FUNCTION reset_default_legal_entity();

COMMENT ON TABLE legal_entities IS 'Юридические лица компании для подстановки в документы';

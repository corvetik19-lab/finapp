-- Миграция: добавление поля avatar_url в таблицу employees
-- Дата: 2024-11-25

-- Добавляем поле avatar_url если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE employees ADD COLUMN avatar_url TEXT;
    COMMENT ON COLUMN employees.avatar_url IS 'URL аватара сотрудника в Supabase Storage';
  END IF;
END $$;

-- Миграция: добавление FK связей supplier_tenders и supplier_files с tenders
-- Если связи уже есть, ничего не делаем

-- 1. Проверяем и добавляем FK для supplier_files -> tenders
DO $$
BEGIN
  -- Проверяем существует ли constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'supplier_files_tender_id_fkey' 
    AND table_name = 'supplier_files'
  ) THEN
    -- Проверяем существует ли таблица tenders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenders') THEN
      -- Добавляем FK
      ALTER TABLE supplier_files
        ADD CONSTRAINT supplier_files_tender_id_fkey 
        FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added FK supplier_files_tender_id_fkey';
    ELSE
      RAISE NOTICE 'Table tenders does not exist, skipping FK';
    END IF;
  ELSE
    RAISE NOTICE 'FK supplier_files_tender_id_fkey already exists';
  END IF;
END $$;

-- 2. Проверяем и добавляем FK для supplier_tenders -> tenders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'supplier_tenders_tender_id_fkey' 
    AND table_name = 'supplier_tenders'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenders') THEN
      ALTER TABLE supplier_tenders
        ADD CONSTRAINT supplier_tenders_tender_id_fkey 
        FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added FK supplier_tenders_tender_id_fkey';
    ELSE
      RAISE NOTICE 'Table tenders does not exist, skipping FK';
    END IF;
  ELSE
    RAISE NOTICE 'FK supplier_tenders_tender_id_fkey already exists';
  END IF;
END $$;

-- 3. Обновляем кэш схемы Supabase (нужно выполнить в Supabase Dashboard)
-- NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE supplier_tenders IS 'Связь поставщиков с тендерами';
COMMENT ON TABLE supplier_files IS 'Файлы поставщиков';

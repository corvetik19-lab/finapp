-- Обновление таблицы plan_topups для выравнивания схемы с приложением
-- Дата: 2025-10-03

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'plan_topups'
      AND column_name = 'date'
  ) THEN
    ALTER TABLE plan_topups RENAME COLUMN date TO occurred_at;
  END IF;
END $$;

ALTER TABLE plan_topups
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS occurred_at DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE plan_topups
  ALTER COLUMN type SET DEFAULT 'topup';

UPDATE plan_topups
SET type = COALESCE(type, 'topup');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plan_topups_type_check'
  ) THEN
    ALTER TABLE plan_topups
      ADD CONSTRAINT plan_topups_type_check CHECK (type IN ('topup', 'withdrawal'));
  END IF;
END $$;

ALTER TABLE plan_topups
  ALTER COLUMN occurred_at SET DEFAULT CURRENT_DATE;

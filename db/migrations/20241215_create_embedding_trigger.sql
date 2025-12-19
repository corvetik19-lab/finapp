-- Миграция: создание системы для фонового создания embeddings
-- Используем pg_net для асинхронного HTTP вызова Edge Function

-- Создаём таблицу очереди для embedding задач
CREATE TABLE IF NOT EXISTS embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE(transaction_id)
);

-- Индекс для быстрого поиска pending задач
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status) WHERE status = 'pending';

-- RLS политики для embedding_queue
ALTER TABLE embedding_queue ENABLE ROW LEVEL SECURITY;

-- Только service role может работать с очередью
CREATE POLICY "Service role full access" ON embedding_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Функция для добавления транзакции в очередь на embedding
CREATE OR REPLACE FUNCTION queue_transaction_embedding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Добавляем в очередь только если есть описание или контрагент
  IF NEW.note IS NOT NULL OR NEW.counterparty IS NOT NULL THEN
    INSERT INTO embedding_queue (transaction_id)
    VALUES (NEW.id)
    ON CONFLICT (transaction_id) DO UPDATE SET
      status = 'pending',
      attempts = 0,
      error_message = NULL,
      created_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Триггер на создание/обновление транзакций
DROP TRIGGER IF EXISTS trigger_queue_embedding ON transactions;
CREATE TRIGGER trigger_queue_embedding
  AFTER INSERT OR UPDATE OF note, counterparty, category_id ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION queue_transaction_embedding();

-- Функция для обработки очереди (вызывается CRON или Edge Function)
CREATE OR REPLACE FUNCTION process_embedding_queue(batch_size INTEGER DEFAULT 10)
RETURNS TABLE(processed INTEGER, failed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_record RECORD;
BEGIN
  -- Помечаем batch как processing
  FOR v_record IN
    SELECT eq.id, eq.transaction_id, t.note, t.counterparty, t.amount, t.direction, c.name as category_name
    FROM embedding_queue eq
    JOIN transactions t ON t.id = eq.transaction_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE eq.status = 'pending'
    ORDER BY eq.created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE embedding_queue SET status = 'processing', attempts = attempts + 1 WHERE id = v_record.id;
    
    -- Здесь должен быть вызов Edge Function через pg_net
    -- Пока просто помечаем как требующее обработки
    v_processed := v_processed + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_failed;
END;
$$;

-- Функция для пометки задачи как выполненной (вызывается из Edge Function)
CREATE OR REPLACE FUNCTION complete_embedding_task(p_transaction_id UUID, p_success BOOLEAN, p_error TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_success THEN
    UPDATE embedding_queue 
    SET status = 'completed', processed_at = now()
    WHERE transaction_id = p_transaction_id;
  ELSE
    UPDATE embedding_queue 
    SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
        error_message = p_error
    WHERE transaction_id = p_transaction_id;
  END IF;
END;
$$;

-- Даём доступ authenticated пользователям к функциям
GRANT EXECUTE ON FUNCTION process_embedding_queue(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION complete_embedding_task(UUID, BOOLEAN, TEXT) TO service_role;

COMMENT ON TABLE embedding_queue IS 'Очередь транзакций для создания embeddings';
COMMENT ON FUNCTION queue_transaction_embedding IS 'Триггер-функция для добавления транзакции в очередь на embedding';
COMMENT ON FUNCTION process_embedding_queue IS 'Обрабатывает batch транзакций из очереди';
COMMENT ON FUNCTION complete_embedding_task IS 'Помечает задачу embedding как выполненную';

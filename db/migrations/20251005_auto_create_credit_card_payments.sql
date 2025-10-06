-- Функция для автоматического создания платежей по кредитным картам
-- Создаёт платёж за 10 дней до даты оплаты

CREATE OR REPLACE FUNCTION auto_create_credit_card_payments()
RETURNS TABLE(created_count integer, message text) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_created_count integer := 0;
  v_card RECORD;
  v_existing_payment_id uuid;
BEGIN
  -- Ищем кредитные карты, для которых нужно создать платёж
  FOR v_card IN
    SELECT 
      a.id,
      a.user_id,
      a.name,
      a.balance,
      a.min_payment,
      a.next_payment_date,
      a.currency
    FROM public.accounts a
    WHERE 
      -- Только кредитные карты
      a.type = 'card'
      AND a.credit_limit IS NOT NULL
      -- Не удалённые
      AND a.deleted_at IS NULL
      -- Есть задолженность
      AND a.balance > 0
      -- Есть дата следующего платежа
      AND a.next_payment_date IS NOT NULL
      -- До даты платежа осталось <= 10 дней
      AND a.next_payment_date <= CURRENT_DATE + INTERVAL '10 days'
      -- Дата платежа ещё не прошла
      AND a.next_payment_date >= CURRENT_DATE
  LOOP
    -- Проверяем, есть ли уже платёж для этой карты на эту дату
    SELECT id INTO v_existing_payment_id
    FROM public.upcoming_payments
    WHERE 
      user_id = v_card.user_id
      AND account_name = v_card.name
      AND DATE(due_date) = v_card.next_payment_date
      AND status = 'pending'
    LIMIT 1;

    -- Если платёж ещё не создан - создаём
    IF v_existing_payment_id IS NULL THEN
      INSERT INTO public.upcoming_payments (
        user_id,
        name,
        due_date,
        amount_minor,
        currency,
        account_name,
        account_id,
        direction,
        status,
        description,
        created_at,
        updated_at
      )
      VALUES (
        v_card.user_id,
        'Платёж по карте: ' || v_card.name,
        v_card.next_payment_date::timestamptz,
        v_card.min_payment, -- минимальный платёж из карты
        v_card.currency,
        v_card.name,
        v_card.id,
        'expense',
        'pending',
        'Автоматически создано за 10 дней до срока оплаты',
        timezone('utc', now()),
        timezone('utc', now())
      );
      
      v_created_count := v_created_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_created_count, 'Создано платежей: ' || v_created_count::text;
END;
$$;

-- Комментарий для документации
COMMENT ON FUNCTION auto_create_credit_card_payments() IS 
  'Автоматически создаёт платежи для кредитных карт за 10 дней до срока оплаты. '
  'Запускается ежедневно через CRON задачу.';

-- Пример вызова функции (можно запустить вручную для теста):
-- SELECT * FROM auto_create_credit_card_payments();

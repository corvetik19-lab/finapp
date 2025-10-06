-- Функция для автоматического создания платежей по кредитам
-- Создаёт платёж за 10 дней до даты следующего платежа

CREATE OR REPLACE FUNCTION auto_create_loan_payments()
RETURNS TABLE(created_count integer, message text) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_created_count integer := 0;
  v_loan RECORD;
  v_existing_payment_id uuid;
BEGIN
  -- Ищем кредиты, для которых нужно создать платёж
  FOR v_loan IN
    SELECT 
      l.id,
      l.user_id,
      l.name,
      l.bank,
      l.monthly_payment,
      l.next_payment_date,
      l.currency
    FROM public.loans l
    WHERE 
      -- Только активные кредиты
      l.status = 'active'
      -- Не удалённые
      AND l.deleted_at IS NULL
      -- Есть дата следующего платежа
      AND l.next_payment_date IS NOT NULL
      -- До даты платежа осталось <= 10 дней
      AND l.next_payment_date <= CURRENT_DATE + INTERVAL '10 days'
      -- Дата платежа ещё не прошла
      AND l.next_payment_date >= CURRENT_DATE
  LOOP
    -- Проверяем, есть ли уже платёж для этого кредита на эту дату
    SELECT id INTO v_existing_payment_id
    FROM public.upcoming_payments
    WHERE 
      user_id = v_loan.user_id
      AND account_name = v_loan.name
      AND DATE(due_date) = v_loan.next_payment_date
      AND status = 'pending'
      AND description LIKE '%кредит%'
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
        direction,
        status,
        description,
        created_at,
        updated_at
      )
      VALUES (
        v_loan.user_id,
        'Платёж по кредиту: ' || v_loan.name,
        v_loan.next_payment_date::timestamptz,
        v_loan.monthly_payment, -- ежемесячный платёж из кредита
        v_loan.currency,
        v_loan.name,
        'expense',
        'pending',
        'Автоматически создано за 10 дней до срока оплаты кредита в банке ' || v_loan.bank,
        timezone('utc', now()),
        timezone('utc', now())
      );
      
      v_created_count := v_created_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_created_count, 'Создано платежей по кредитам: ' || v_created_count::text;
END;
$$;

-- Комментарий для документации
COMMENT ON FUNCTION auto_create_loan_payments() IS 
  'Автоматически создаёт напоминания о платежах для кредитов за 10 дней до срока оплаты. '
  'Запускается ежедневно через CRON задачу или вручную.';

-- Пример вызова функции (можно запустить вручную для теста):
-- SELECT * FROM auto_create_loan_payments();

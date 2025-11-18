-- Добавляем тестовый тендер
-- Сначала находим ID этапа "Анализ и просчёт"
DO $$
DECLARE
  stage_id_var UUID;
  company_id_var UUID := '74b4c286-ca75-4eb4-9353-4db3d177c939';
BEGIN
  -- Находим ID этапа "Анализ и просчёт"
  SELECT id INTO stage_id_var
  FROM tender_stages
  WHERE name = 'Анализ и просчёт' AND category = 'tender_dept'
  LIMIT 1;

  -- Вставляем тестовый тендер
  INSERT INTO tenders (
    company_id,
    purchase_number,
    subject,
    customer,
    nmck,
    submission_deadline,
    stage_id,
    project_name,
    city,
    platform,
    our_price,
    contract_price,
    status
  ) VALUES (
    company_id_var,
    '32312315116',
    'СИП (самонесущий изолированный провод)',
    'АКЦИОНЕРНОЕ ОБЩЕСТВО "КАВАЛЕРОВСКАЯ ЭЛЕКТРОСЕТЬ"',
    158389350,
    '2025-11-20 15:00:00+00',
    stage_id_var,
    'Проект Альфа',
    'Москва',
    'РТС-тендер',
    150000000,
    140000000,
    'active'
  );
END $$;

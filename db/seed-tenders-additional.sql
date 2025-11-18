-- Добавление дополнительных тендеров для отображения в карточках
-- Три тендера с разными типами закупки (кроме ЗМО)

DO $$
DECLARE
  v_company_id uuid;
  v_stage_new_id uuid;
  v_stage_analysis_id uuid;
  v_stage_verification_id uuid;
  v_type_fz44_id uuid;
  v_type_fz223_id uuid;
  v_type_fz275_id uuid;
  v_user_id uuid;
  v_tender1_id uuid;
  v_tender2_id uuid;
  v_tender3_id uuid;
BEGIN
  -- Получаем ID компании (берём первую)
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  -- Получаем ID пользователя (берём первого)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  -- Получаем ID этапов
  SELECT id INTO v_stage_new_id FROM tender_stages WHERE name = 'Новые контракты в реализацию' AND is_system = true LIMIT 1;
  SELECT id INTO v_stage_analysis_id FROM tender_stages WHERE name = 'Анализ и просчёт' AND is_system = true LIMIT 1;
  SELECT id INTO v_stage_verification_id FROM tender_stages WHERE name = 'Проверка' AND is_system = true LIMIT 1;
  
  -- Получаем ID типов тендеров
  SELECT id INTO v_type_fz44_id FROM tender_types WHERE name = 'ФЗ-44' LIMIT 1;
  SELECT id INTO v_type_fz223_id FROM tender_types WHERE name = 'ФЗ-223' LIMIT 1;
  SELECT id INTO v_type_fz275_id FROM tender_types WHERE name = 'ФЗ-275' LIMIT 1;

  -- Тендер 1: Поставка компьютерной техники (ФЗ-44)
  INSERT INTO tenders (
    company_id,
    purchase_number,
    subject,
    customer,
    nmck,
    submission_deadline,
    stage_id,
    type_id,
    template_id,
    project_name,
    method,
    city,
    platform,
    our_price,
    application_security,
    contract_security,
    auction_date,
    results_date,
    comment,
    created_by,
    created_at
  ) VALUES (
    v_company_id,
    '0373200000123000010',
    'Поставка компьютерной техники и периферийного оборудования для образовательного учреждения',
    'ГБОУ "Средняя общеобразовательная школа №15"',
    450000000, -- 4 500 000 руб в копейках
    (CURRENT_TIMESTAMP + INTERVAL '12 days')::timestamp,
    v_stage_new_id,
    v_type_fz44_id,
    'system',
    'Компьютеры для школ 2025',
    'Электронный аукцион',
    'Санкт-Петербург',
    'ЭТП ГПБ',
    420000000, -- 4 200 000 руб
    22500000, -- 225 000 руб (5% от НМЦК)
    42000000, -- 420 000 руб (10% от цены контракта)
    (CURRENT_TIMESTAMP + INTERVAL '15 days')::timestamp,
    (CURRENT_TIMESTAMP + INTERVAL '18 days')::timestamp,
    'Требуется предоставить сертификаты соответствия на всю технику. Гарантия не менее 3 лет.',
    v_user_id,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
  ) RETURNING id INTO v_tender1_id;

  -- Тендер 2: Услуги по охране объекта (ФЗ-223)
  INSERT INTO tenders (
    company_id,
    purchase_number,
    subject,
    customer,
    nmck,
    submission_deadline,
    stage_id,
    type_id,
    template_id,
    project_name,
    method,
    city,
    platform,
    our_price,
    application_security,
    contract_security,
    auction_date,
    results_date,
    comment,
    created_by,
    created_at
  ) VALUES (
    v_company_id,
    '0373300000123000020',
    'Оказание услуг по охране административного здания и прилегающей территории',
    'ОАО "Российские железные дороги"',
    720000000, -- 7 200 000 руб в копейках (годовой контракт)
    (CURRENT_TIMESTAMP + INTERVAL '8 days')::timestamp,
    v_stage_analysis_id,
    v_type_fz223_id,
    'system',
    'Охрана РЖД 2025',
    'Конкурс',
    'Москва',
    'Сбербанк-АСТ',
    680000000, -- 6 800 000 руб
    36000000, -- 360 000 руб (5% от НМЦК)
    72000000, -- 720 000 руб (10% от цены контракта)
    NULL, -- нет аукциона для конкурса
    (CURRENT_TIMESTAMP + INTERVAL '20 days')::timestamp,
    'Контракт на 12 месяцев. Требуется лицензия на охранную деятельность. Минимум 4 сотрудника в смену.',
    v_user_id,
    CURRENT_TIMESTAMP - INTERVAL '3 days'
  ) RETURNING id INTO v_tender2_id;

  -- Тендер 3: Поставка инновационного оборудования (ФЗ-275)
  INSERT INTO tenders (
    company_id,
    purchase_number,
    subject,
    customer,
    nmck,
    submission_deadline,
    stage_id,
    type_id,
    template_id,
    project_name,
    method,
    city,
    platform,
    our_price,
    application_security,
    contract_security,
    auction_date,
    results_date,
    comment,
    created_by,
    created_at
  ) VALUES (
    v_company_id,
    '0373400000123000030',
    'Поставка инновационного лабораторного оборудования для научно-исследовательского центра',
    'ФГБУ "Национальный исследовательский центр"',
    950000000, -- 9 500 000 руб в копейках
    (CURRENT_TIMESTAMP + INTERVAL '10 days')::timestamp,
    v_stage_verification_id,
    v_type_fz275_id,
    'system',
    'Лабораторное оборудование 2025',
    'Запрос предложений',
    'Новосибирск',
    'РТС-тендер',
    890000000, -- 8 900 000 руб
    47500000, -- 475 000 руб (5% от НМЦК)
    95000000, -- 950 000 руб (10% от цены контракта)
    NULL,
    (CURRENT_TIMESTAMP + INTERVAL '25 days')::timestamp,
    'Инновационная продукция. Требуется подтверждение инновационности. Срок поставки - 90 дней.',
    v_user_id,
    CURRENT_TIMESTAMP - INTERVAL '5 days'
  ) RETURNING id INTO v_tender3_id;

  -- Добавляем записи в историю этапов для каждого тендера
  INSERT INTO tender_stage_history (tender_id, stage_id, changed_by, changed_at, comment)
  VALUES 
    (v_tender1_id, v_stage_new_id, v_user_id, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Тендер создан'),
    (v_tender2_id, v_stage_analysis_id, v_user_id, CURRENT_TIMESTAMP - INTERVAL '3 days', 'Тендер создан'),
    (v_tender3_id, v_stage_verification_id, v_user_id, CURRENT_TIMESTAMP - INTERVAL '5 days', 'Тендер создан');

  RAISE NOTICE 'Успешно добавлено 3 тендера:';
  RAISE NOTICE '1. Поставка компьютерной техники (ФЗ-44) - ID: %', v_tender1_id;
  RAISE NOTICE '2. Услуги по охране (ФЗ-223) - ID: %', v_tender2_id;
  RAISE NOTICE '3. Инновационное оборудование (ФЗ-275) - ID: %', v_tender3_id;
END $$;

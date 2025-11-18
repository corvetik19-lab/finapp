-- Seed для тестовых тендеров
-- Создаём 3 полностью заполненных тендера с разными статусами и этапами

-- Получаем ID компании, первого системного этапа и типа тендера
DO $$
DECLARE
  v_company_id uuid;
  v_stage_analysis_id uuid;
  v_stage_verification_id uuid;
  v_stage_submission_id uuid;
  v_stage_auction_id uuid;
  v_stage_won_id uuid;
  v_type_zmo_id uuid;
  v_type_fz44_id uuid;
  v_type_fz223_id uuid;
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
  SELECT id INTO v_stage_analysis_id FROM tender_stages WHERE name = 'Анализ и просчёт' AND is_system = true LIMIT 1;
  SELECT id INTO v_stage_verification_id FROM tender_stages WHERE name = 'Проверка' AND is_system = true LIMIT 1;
  SELECT id INTO v_stage_submission_id FROM tender_stages WHERE name = 'Подача' AND is_system = true LIMIT 1;
  SELECT id INTO v_stage_auction_id FROM tender_stages WHERE name = 'Аукцион' AND is_system = true LIMIT 1;
  SELECT id INTO v_stage_won_id FROM tender_stages WHERE name = 'Выиграли' AND is_system = true LIMIT 1;
  
  -- Получаем ID типов тендеров
  SELECT id INTO v_type_zmo_id FROM tender_types WHERE name = 'ЗМО' LIMIT 1;
  SELECT id INTO v_type_fz44_id FROM tender_types WHERE name = 'ФЗ-44' LIMIT 1;
  SELECT id INTO v_type_fz223_id FROM tender_types WHERE name = 'ФЗ-223' LIMIT 1;

  -- Тендер 1: Поставка медицинского оборудования (на этапе "Анализ и просчёт")
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
    '0373100000123000001',
    'Поставка медицинского оборудования для отделения реанимации и интенсивной терапии',
    'ГБУЗ "Городская клиническая больница №1 им. Н.И. Пирогова"',
    1250000000, -- 12 500 000 руб в копейках
    (CURRENT_TIMESTAMP + INTERVAL '5 days')::timestamp,
    v_stage_analysis_id,
    v_type_fz44_id,
    'system',
    'Медоборудование 2025',
    'Электронный аукцион',
    'Москва',
    'РТС-тендер',
    1180000000, -- 11 800 000 руб
    62500000, -- 625 000 руб (5% от НМЦК)
    125000000, -- 1 250 000 руб (10% от цены контракта)
    (CURRENT_TIMESTAMP + INTERVAL '7 days')::timestamp,
    (CURRENT_TIMESTAMP + INTERVAL '10 days')::timestamp,
    'Требуется сертификация оборудования. Срок поставки - 60 дней. Обратить внимание на гарантийные обязательства.',
    v_user_id,
    CURRENT_TIMESTAMP - INTERVAL '2 days'
  ) RETURNING id INTO v_tender1_id;

  -- Тендер 2: Ремонт кровли (на этапе "Подача")
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
    contract_price,
    application_security,
    contract_security,
    auction_date,
    results_date,
    review_date,
    comment,
    created_by,
    created_at
  ) VALUES (
    v_company_id,
    '0373200000123000002',
    'Капитальный ремонт кровли здания поликлиники с заменой водосточной системы',
    'ГБУЗ МО "Подольская городская поликлиника №3"',
    850000000, -- 8 500 000 руб
    (CURRENT_TIMESTAMP + INTERVAL '2 days')::timestamp,
    v_stage_submission_id,
    v_type_zmo_id,
    'system',
    'Ремонт кровли 2025',
    'Запрос котировок',
    'Подольск',
    'ЭТП ГПБ',
    795000000, -- 7 950 000 руб
    795000000, -- Цена контракта = нашей цене
    42500000, -- 425 000 руб
    79500000, -- 795 000 руб
    (CURRENT_TIMESTAMP + INTERVAL '3 days')::timestamp,
    (CURRENT_TIMESTAMP + INTERVAL '5 days')::timestamp,
    (CURRENT_TIMESTAMP + INTERVAL '1 day')::timestamp,
    'Работы должны быть выполнены до начала осенних дождей. Требуется предоставить образцы кровельных материалов. Гарантия на работы - 5 лет.',
    v_user_id,
    CURRENT_TIMESTAMP - INTERVAL '5 days'
  ) RETURNING id INTO v_tender2_id;

  -- Тендер 3: Поставка лекарственных препаратов (Выиграли)
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
    contract_price,
    application_security,
    contract_security,
    auction_date,
    results_date,
    review_date,
    comment,
    created_by,
    created_at
  ) VALUES (
    v_company_id,
    '0373100000123000003',
    'Поставка лекарственных препаратов для лечения сердечно-сосудистых заболеваний',
    'ГБУЗ "Московский областной кардиологический центр"',
    3200000000, -- 32 000 000 руб
    (CURRENT_TIMESTAMP - INTERVAL '15 days')::timestamp,
    v_stage_won_id,
    v_type_fz223_id,
    'system',
    'Лекарства ССЗ 2025',
    'Конкурс',
    'Москва',
    'Сбербанк-АСТ',
    2980000000, -- 29 800 000 руб
    2980000000,
    160000000, -- 1 600 000 руб
    298000000, -- 2 980 000 руб
    (CURRENT_TIMESTAMP - INTERVAL '10 days')::timestamp,
    (CURRENT_TIMESTAMP - INTERVAL '5 days')::timestamp,
    (CURRENT_TIMESTAMP - INTERVAL '12 days')::timestamp,
    'Победа! Контракт подписан. Срок поставки - 90 дней с момента подписания. Поставка осуществляется партиями. Требуется строгое соблюдение температурного режима при транспортировке.',
    v_user_id,
    CURRENT_TIMESTAMP - INTERVAL '30 days'
  ) RETURNING id INTO v_tender3_id;

  -- Добавляем комментарии к тендерам
  
  -- Комментарии к тендеру 1
  INSERT INTO tender_comments (tender_id, user_id, content, created_at) VALUES
  (v_tender1_id, v_user_id, 'Получили техническое задание. Начинаем анализ требований.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (v_tender1_id, v_user_id, 'Связались с поставщиком оборудования. Ждём коммерческое предложение.', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (v_tender1_id, v_user_id, 'КП получено. Цена укладывается в бюджет. Готовим документы.', CURRENT_TIMESTAMP - INTERVAL '12 hours');

  -- Комментарии к тендеру 2
  INSERT INTO tender_comments (tender_id, user_id, content, created_at) VALUES
  (v_tender2_id, v_user_id, 'Провели осмотр объекта. Составили дефектную ведомость.', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (v_tender2_id, v_user_id, 'Рассчитали смету. Учли все риски и непредвиденные расходы.', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (v_tender2_id, v_user_id, 'Документы проверены юристом. Подаём заявку сегодня.', CURRENT_TIMESTAMP - INTERVAL '6 hours');

  -- Комментарии к тендеру 3
  INSERT INTO tender_comments (tender_id, user_id, content, created_at) VALUES
  (v_tender3_id, v_user_id, 'Подали заявку. Все документы в порядке.', CURRENT_TIMESTAMP - INTERVAL '20 days'),
  (v_tender3_id, v_user_id, 'Прошли проверку заявки. Допущены к аукциону.', CURRENT_TIMESTAMP - INTERVAL '12 days'),
  (v_tender3_id, v_user_id, 'Выиграли аукцион! Наша цена - лучшая.', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (v_tender3_id, v_user_id, 'Контракт подписан. Начинаем подготовку к поставке.', CURRENT_TIMESTAMP - INTERVAL '2 days');

  RAISE NOTICE 'Успешно создано 3 тестовых тендера с комментариями';
  RAISE NOTICE 'Тендер 1 (Медоборудование): %', v_tender1_id;
  RAISE NOTICE 'Тендер 2 (Ремонт кровли): %', v_tender2_id;
  RAISE NOTICE 'Тендер 3 (Лекарства): %', v_tender3_id;
END $$;

-- Миграция: Добавление полей для детальной страницы тендера
-- Дата: 2025-11-13
-- Описание: Добавляет поля для просчёта, рисков, дополнительной информации и результата

-- Добавляем новые поля в таблицу tenders
ALTER TABLE tenders

-- Основная информация
ADD COLUMN IF NOT EXISTS procurement_method VARCHAR(200),
ADD COLUMN IF NOT EXISTS eis_url TEXT,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'RUB',

-- Просчёт тендера
ADD COLUMN IF NOT EXISTS purchase_cost BIGINT, -- закупка (в копейках)
ADD COLUMN IF NOT EXISTS logistics_cost BIGINT, -- логистика (в копейках)
ADD COLUMN IF NOT EXISTS bid_price BIGINT, -- цена для торгов (в копейках)
ADD COLUMN IF NOT EXISTS other_costs BIGINT, -- прочие затраты (в копейках)
ADD COLUMN IF NOT EXISTS planned_profit BIGINT, -- планируемая прибыль (в копейках)

-- Риски
ADD COLUMN IF NOT EXISTS delivery_days_tz INTEGER, -- срок поставки по ТЗ (дней)
ADD COLUMN IF NOT EXISTS delivery_days_actual INTEGER, -- фактические сроки поставки (дней)
ADD COLUMN IF NOT EXISTS delivery_location TEXT, -- место поставки
ADD COLUMN IF NOT EXISTS delivery_locations_count INTEGER, -- количество мест поставки
ADD COLUMN IF NOT EXISTS installation_required BOOLEAN, -- монтаж
ADD COLUMN IF NOT EXISTS unloading_required BOOLEAN, -- разгрузка
ADD COLUMN IF NOT EXISTS penalties TEXT, -- штрафы
ADD COLUMN IF NOT EXISTS customer_check TEXT, -- проверка заказчика
ADD COLUMN IF NOT EXISTS supplier_check TEXT, -- проверка поставщика

-- Обратить внимание
ADD COLUMN IF NOT EXISTS is_defense_order BOOLEAN DEFAULT false, -- гособорон заказ
ADD COLUMN IF NOT EXISTS national_regime TEXT, -- нац. режим
ADD COLUMN IF NOT EXISTS delivery_condition VARCHAR(100), -- условие поставки
ADD COLUMN IF NOT EXISTS long_warranty TEXT, -- длительная гарантия
ADD COLUMN IF NOT EXISTS payment_term TEXT, -- срок оплаты
ADD COLUMN IF NOT EXISTS acceptance_term TEXT, -- срок приемки
ADD COLUMN IF NOT EXISTS contract_duration TEXT, -- срок действия контракта
ADD COLUMN IF NOT EXISTS clarification_requests TEXT, -- запросы на разъяснения
ADD COLUMN IF NOT EXISTS other_notes TEXT, -- другое

-- Результат
ADD COLUMN IF NOT EXISTS legal_entity_id UUID, -- юр. лицо
ADD COLUMN IF NOT EXISTS show_to_investors BOOLEAN DEFAULT false; -- показать тендер инвесторам

-- Комментарии к полям
COMMENT ON COLUMN tenders.procurement_method IS 'Способ определения поставщика';
COMMENT ON COLUMN tenders.eis_url IS 'Ссылка на извещение в ЕИС';
COMMENT ON COLUMN tenders.currency IS 'Валюта контракта (ISO 4217)';

COMMENT ON COLUMN tenders.purchase_cost IS 'Стоимость закупки товаров/услуг в копейках';
COMMENT ON COLUMN tenders.logistics_cost IS 'Стоимость логистики в копейках';
COMMENT ON COLUMN tenders.bid_price IS 'Цена для участия в торгах в копейках';
COMMENT ON COLUMN tenders.other_costs IS 'Прочие затраты в копейках';
COMMENT ON COLUMN tenders.planned_profit IS 'Планируемая прибыль в копейках';

COMMENT ON COLUMN tenders.delivery_days_tz IS 'Срок поставки по техническому заданию (дней)';
COMMENT ON COLUMN tenders.delivery_days_actual IS 'Фактический срок поставки (дней)';
COMMENT ON COLUMN tenders.delivery_location IS 'Адрес места поставки';
COMMENT ON COLUMN tenders.delivery_locations_count IS 'Количество мест поставки';
COMMENT ON COLUMN tenders.installation_required IS 'Требуется ли монтаж';
COMMENT ON COLUMN tenders.unloading_required IS 'Требуется ли разгрузка';
COMMENT ON COLUMN tenders.penalties IS 'Информация о штрафах и неустойках';
COMMENT ON COLUMN tenders.customer_check IS 'Результаты проверки заказчика';
COMMENT ON COLUMN tenders.supplier_check IS 'Результаты проверки поставщика';

COMMENT ON COLUMN tenders.is_defense_order IS 'Является ли гособоронзаказом';
COMMENT ON COLUMN tenders.national_regime IS 'Национальный режим';
COMMENT ON COLUMN tenders.delivery_condition IS 'Условие поставки (единовременная/поэтапная)';
COMMENT ON COLUMN tenders.long_warranty IS 'Информация о длительной гарантии';
COMMENT ON COLUMN tenders.payment_term IS 'Срок оплаты';
COMMENT ON COLUMN tenders.acceptance_term IS 'Срок приемки';
COMMENT ON COLUMN tenders.contract_duration IS 'Срок действия контракта';
COMMENT ON COLUMN tenders.clarification_requests IS 'Запросы на разъяснения';
COMMENT ON COLUMN tenders.other_notes IS 'Прочие примечания';

COMMENT ON COLUMN tenders.legal_entity_id IS 'ID юридического лица для заключения договора';
COMMENT ON COLUMN tenders.show_to_investors IS 'Показывать тендер инвесторам';

-- Создаем индексы для часто используемых полей
CREATE INDEX IF NOT EXISTS idx_tenders_legal_entity_id ON tenders(legal_entity_id) WHERE legal_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenders_show_to_investors ON tenders(show_to_investors) WHERE show_to_investors = true;
CREATE INDEX IF NOT EXISTS idx_tenders_is_defense_order ON tenders(is_defense_order) WHERE is_defense_order = true;

-- Обновляем существующие записи: устанавливаем валюту по умолчанию
UPDATE tenders SET currency = 'RUB' WHERE currency IS NULL;

-- Делаем поле currency NOT NULL после установки значений по умолчанию
ALTER TABLE tenders ALTER COLUMN currency SET NOT NULL;

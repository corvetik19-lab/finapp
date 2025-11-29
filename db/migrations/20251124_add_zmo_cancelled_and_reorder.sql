-- 1. Создаем этап 'ЗМО: Отменён'
INSERT INTO tender_stages (name, category, is_system, order_index)
VALUES ('ЗМО: Отменён', 'archive', true, 150)
ON CONFLICT (name) DO UPDATE SET category = 'archive', is_system = true, order_index = 150;

-- 2. Обновляем порядок для общих архивных этапов
UPDATE tender_stages SET order_index = 100 WHERE name = 'Не участвуем';
UPDATE tender_stages SET order_index = 110 WHERE name = 'Не прошло проверку';
UPDATE tender_stages SET order_index = 120 WHERE name = 'Не подано';
UPDATE tender_stages SET order_index = 130 WHERE name = 'Проиграли';
UPDATE tender_stages SET order_index = 140 WHERE name = 'Договор не заключен';
UPDATE tender_stages SET order_index = 150 WHERE name = 'Отменён';

-- 3. Обновляем порядок для ЗМО архивных этапов
UPDATE tender_stages SET order_index = 100 WHERE name = 'ЗМО: Не участвуем';
UPDATE tender_stages SET order_index = 110 WHERE name = 'ЗМО: Не прошло проверку';
UPDATE tender_stages SET order_index = 120 WHERE name = 'ЗМО: Не подано';
UPDATE tender_stages SET order_index = 130 WHERE name = 'ЗМО: Проиграли';
UPDATE tender_stages SET order_index = 140 WHERE name = 'ЗМО: Договор не заключен';
-- 'ЗМО: Отменён' уже установлен в 150 при создании

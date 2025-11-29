-- Очистка лишних архивных этапов
-- Удаляем 'Не участвовали' (дубликат/опечатка 'Не участвуем')
DELETE FROM tender_stages 
WHERE name = 'Не участвовали' AND category = 'archive';

-- Удаляем 'Выиграли' из архива
DELETE FROM tender_stages 
WHERE name = 'Выиграли' AND category = 'archive';

-- Удаляем один из дубликатов 'Проиграли'
-- Оставляем тот, у которого id = '5f22b1ad-b19a-46b9-aaec-6492c7ec16e0' (например)
-- Удаляем остальные
DELETE FROM tender_stages 
WHERE name = 'Проиграли' 
AND category = 'archive' 
AND id != '5f22b1ad-b19a-46b9-aaec-6492c7ec16e0';

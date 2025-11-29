-- Обновляем все тарифы, оставляя только режим tenders
-- Другие режимы (finance, investments, personal) пока скрыты от пользователей

UPDATE subscription_plans 
SET allowed_modes = ARRAY['tenders']
WHERE is_active = true;

-- Обновляем описания тарифов для тендеров
UPDATE subscription_plans SET description = 'Базовые функции для работы с тендерами' WHERE name = 'Бесплатный';
UPDATE subscription_plans SET description = 'Для небольших команд по работе с тендерами' WHERE name = 'Стартовый';
UPDATE subscription_plans SET description = 'Для растущих компаний с активной тендерной деятельностью' WHERE name = 'Бизнес';
UPDATE subscription_plans SET description = 'Для крупных организаций с большим объёмом тендеров' WHERE name = 'Энтерпрайз';

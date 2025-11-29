-- Миграция: Обновление системных ролей на роли тендерного отдела
-- Дата: 2024-11-25
-- Описание: Заменяет старые роли (Администратор, Руководитель, Менеджер, Специалист, Наблюдатель)
--           на новые роли тендерного отдела с детальными правами доступа

-- Новые системные роли:
-- 1. Администратор тендеров — полный доступ ко всем функциям
-- 2. Менеджер тендеров — управление тендерами, назначение исполнителей
-- 3. Просчётчик — расчёт стоимости, подготовка КП
-- 4. Отдел проверки — проверка и согласование заявок
-- 5. Специалист по торгам — участие в аукционах
-- 6. Контрактный менеджер — работа с контрактами
-- 7. Наблюдатель тендеров — только просмотр

-- Категории прав доступа:
-- Тендеры: Общие (view, view_all, view_own, create, edit, edit_own, delete, import, export)
-- Тендеры: Этапы (stages, move_forward, move_backward, archive, restore)
-- Тендеры: Просчёт (calc:view, calc:create, calc:edit, calc:approve, calc:set_price, calc:view_margin)
-- Тендеры: Документы (docs:view, docs:upload, docs:delete, docs:download, docs:sign)
-- Тендеры: Проверка (review:view, review:approve, review:reject, review:comment, review:return)
-- Тендеры: Торги (auction:view, auction:participate, auction:set_result)
-- Тендеры: Контракт (contract:view, contract:create, contract:edit, contract:sign, contract:close)
-- Тендеры: Назначения (assign:manager, assign:specialist, assign:calculator, assign:reviewer, assign:executor)
-- Тендеры: Аналитика (analytics:view, analytics:reports, analytics:kpi, analytics:finance)
-- Сотрудники (employees:view, employees:view_all, employees:create, employees:edit, employees:delete)

-- Миграция применена через Supabase MCP: update_default_tender_roles

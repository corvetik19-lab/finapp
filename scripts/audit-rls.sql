-- Скрипт аудита RLS (Row Level Security) для всех таблиц
-- Запустить в Supabase SQL Editor для проверки безопасности

-- 1. Таблицы БЕЗ включённой RLS (потенциальная уязвимость)
SELECT 
    schemaname as schema_name, 
    tablename as table_name,
    'RLS DISABLED - SECURITY RISK!' as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = false
ORDER BY tablename;

-- 2. Таблицы С включённой RLS
SELECT 
    schemaname as schema_name, 
    tablename as table_name,
    'RLS ENABLED ✓' as status
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = true
ORDER BY tablename;

-- 3. Все RLS политики в проекте
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Таблицы без политик (RLS включена, но нет правил = никто не имеет доступа)
SELECT 
    t.schemaname,
    t.tablename,
    'NO POLICIES - DATA INACCESSIBLE!' as warning
FROM pg_tables t
LEFT JOIN pg_policies p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname = 'public' 
    AND t.rowsecurity = true
    AND p.policyname IS NULL
ORDER BY t.tablename;

-- 5. Сводка по безопасности
SELECT 
    'SUMMARY' as report_type,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as rls_enabled,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) as rls_disabled,
    (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies;

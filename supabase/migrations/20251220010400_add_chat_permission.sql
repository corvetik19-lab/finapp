-- Добавляем permission ai-studio:chat для роли "Пользователь Gemini Chat"
UPDATE roles 
SET permissions = COALESCE(permissions, '[]'::jsonb) || '["ai-studio:chat"]'::jsonb
WHERE name = 'Пользователь Gemini Chat'
AND NOT (COALESCE(permissions, '[]'::jsonb) @> '["ai-studio:chat"]'::jsonb);

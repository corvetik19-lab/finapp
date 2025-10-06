# Получение Service Role Key

## Ваш проект

- **Название:** finapp
- **ID:** gwqvolspdzhcutvzsdbo
- **URL:** <https://gwqvolspdzhcutvzsdbo.supabase.co>

## Шаги

1. **Откройте прямую ссылку на настройки API:**
   <https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/settings/api>

2. **Скопируйте ключи:**
   - Найдите секцию **Project API keys**
   - Скопируйте **anon public** key
   - Скопируйте **service_role** key (секретный!)

3. **Создайте файл `.env.local`** в корне проекта `c:\fin3\finapp\`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://gwqvolspdzhcutvzsdbo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=вставьте-anon-key
   SUPABASE_SERVICE_ROLE_KEY=вставьте-service-role-key
   ```

4. **Перезапустите сервер:**

   ```bash
   npm run dev
   ```

5. **Удалите этот файл** после настройки (содержит ID проекта)

## Готово

После перезапуска ошибка "Server configuration error" исчезнет!

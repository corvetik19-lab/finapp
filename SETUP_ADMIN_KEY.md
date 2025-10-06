# Настройка Service Role Key для управления пользователями

Для создания и управления пользователями нужен `service_role_key` от Supabase.

## Как получить Service Role Key

1. **Откройте Supabase Dashboard**
   - Перейдите на <https://supabase.com/dashboard>
   - Выберите ваш проект

2. **Найдите Service Role Key**
   - В левом меню откройте **Settings** (⚙️)
   - Перейдите в **API**
   - Найдите секцию **Project API keys**
   - Скопируйте **`service_role` key** (секретный ключ)

3. **Добавьте в .env.local**

   Откройте файл `.env.local` в корне проекта и добавьте:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

4. **Перезапустите сервер разработки**

   ```bash
   npm run dev
   ```

## ⚠️ Важно

- **НЕ коммитьте** `.env.local` в Git (уже в `.gitignore`)
- **service_role_key** даёт полный доступ к базе данных
- Используйте его только на сервере (в API routes)
- В production добавьте ключ в **Environment Variables** на Vercel/вашем хостинге

## Проверка

После настройки перейдите в:

- **Настройки** → вкладка **"Пользователи"**
- Нажмите **"Создать пользователя"**

Если ключ настроен правильно - пользователь создастся! ✅

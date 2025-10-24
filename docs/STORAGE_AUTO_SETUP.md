# 🤖 Автоматическая настройка Storage

**Дата:** 2025-10-20  
**Версия:** 1.0

Скрипт для автоматического создания bucket в Supabase Storage.

---

## 🚀 Быстрый старт

### **Шаг 1: Убедитесь что есть переменные окружения**

В файле `.env.local` должны быть:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

### **Шаг 2: Запустите скрипт**

```bash
node scripts/setup-storage.js
```

---

## 📋 Что делает скрипт

### **1. Создаёт bucket "attachments"**

✅ Автоматически через Supabase Storage API  
✅ Приватный bucket (public: false)  
✅ Лимит размера: 10 MB  

### **2. Показывает политики для создания**

⚠️ **Storage RLS политики нельзя создать через API**

Скрипт покажет 4 политики, которые нужно создать вручную:

1. **Users can upload own files** (INSERT)
2. **Users can view own files** (SELECT)
3. **Users can update own files** (UPDATE)
4. **Users can delete own files** (DELETE)

### **3. Проверяет настройку**

✅ Проверяет что bucket создан  
✅ Показывает настройки bucket  

---

## 🖥️ Пример вывода

```
🚀 Настройка Supabase Storage...

📦 Проект: gwqvolspdzhcutvzsdbo
🔗 URL: https://gwqvolspdzhcutvzsdbo.supabase.co

1️⃣ Создание bucket "attachments"...
   ✅ Bucket создан успешно

2️⃣ Создание RLS политик для Storage...
   ⚠️  ВНИМАНИЕ: Storage политики нельзя создать через API
   📝 Создайте их вручную в Supabase Dashboard:

   1. Users can upload own files
      Operation: INSERT
      Definition: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

   2. Users can view own files
      Operation: SELECT
      Definition: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

   3. Users can update own files
      Operation: UPDATE
      Definition: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

   4. Users can delete own files
      Operation: DELETE
      Definition: bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text

   🔗 Откройте: https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/storage/buckets/attachments
   → Перейдите на вкладку "Policies"
   → Нажмите "New policy" для каждой политики выше

3️⃣ Проверка настройки...
   ✅ Bucket найден
   📊 Публичный: Нет ✅
   📏 Лимит размера: 10.0 MB

✅ Настройка завершена!

📋 Следующие шаги:
   1. Создайте RLS политики вручную (см. выше)
   2. Запустите приложение: npm run dev
   3. Протестируйте загрузку файлов
```

---

## 🔧 Создание политик вручную

После запуска скрипта:

### **1. Откройте Supabase Dashboard**

Перейдите по ссылке из вывода скрипта или:
1. https://supabase.com/dashboard
2. Выберите проект
3. Storage → attachments → Policies

### **2. Создайте 4 политики**

Для каждой политики:

1. Нажмите **New policy**
2. Выберите **Custom policy**
3. Заполните:
   - **Policy name:** (из вывода скрипта)
   - **Operation:** INSERT/SELECT/UPDATE/DELETE
   - **Target roles:** `authenticated`
   - **Policy definition:** (скопируйте из вывода)
4. Нажмите **Save policy**

---

## ✅ Проверка

После создания всех политик:

```bash
# Запустите приложение
npm run dev

# Откройте тестовую страницу
http://localhost:3000/test-upload
```

Попробуйте загрузить файл:
- ✅ Должна быть кнопка "Прикрепить файл"
- ✅ Файл должен загрузиться
- ✅ Файл должен появиться в списке

---

## 🐛 Решение проблем

### **Ошибка: "Не найдены переменные окружения"**

**Решение:**
1. Создайте файл `.env.local`
2. Добавьте переменные из Supabase Dashboard

### **Ошибка: "Bucket already exists"**

**Решение:**
- Это нормально, bucket уже создан
- Продолжайте создавать политики

### **Ошибка: "Access denied" при загрузке**

**Решение:**
1. Проверьте что созданы все 4 политики
2. Проверьте что bucket приватный (public: false)
3. Проверьте что пользователь авторизован

---

## 📚 См. также

- `docs/STORAGE_SETUP.md` - полная документация
- `scripts/setup-storage.js` - исходный код скрипта
- `components/attachments/FileUploader.tsx` - компонент

---

**Автор:** AI Assistant  
**Дата:** 2025-10-20  
**Версия:** 1.0

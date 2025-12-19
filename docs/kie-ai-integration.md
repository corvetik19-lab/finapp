# Kie.ai API Integration Plan

## Обзор проекта

Интеграция Kie.ai Market API в ИИ Студию финансового трекера для генерации изображений, видео и аудио.

**API Key:** `ce90cb624cd8046b5b51c043c7641a84`
**Base URL:** `https://api.kie.ai/api/v1`

---

## Статус выполнения

| Этап | Статус | Дата |
|------|--------|------|
| 1. Планирование | ✅ Выполнено | 17.12.2024 |
| 2. Базовая инфраструктура | ✅ Выполнено | 17.12.2024 |
| 3. API Routes | ✅ Выполнено | 17.12.2024 |
| 4. UI Главная страница | ✅ Выполнено | 17.12.2024 |
| 5. UI Изображения | ✅ Выполнено | 17.12.2024 |
| 6. UI Видео | ✅ Выполнено | 17.12.2024 |
| 7. UI Аудио | ✅ Выполнено | 17.12.2024 |
| 8. Интеграция в меню | ✅ Выполнено | 17.12.2024 |

---

## 1. Модели для интеграции

### 1.1 Изображения (Image Models)

| # | Название | Model ID | Тип | Параметры |
|---|----------|----------|-----|-----------|
| 1 | Google Nano Banana Pro | `google/nano-banana-pro` | Text-to-Image | prompt, aspect_ratio, num_images |
| 2 | Google Nano Banana Edit | `google/nano-banana-edit` | Image Edit | prompt, image_url |
| 3 | Google Imagen4 | `google/imagen4` | Text-to-Image | prompt, negative_prompt, aspect_ratio, num_images, seed |
| 4 | Google Imagen4 Ultra | `google/imagen4-ultra` | Text-to-Image | prompt, negative_prompt, aspect_ratio, num_images |
| 5 | Flux-2 Pro | `flux2/pro-text-to-image` | Text-to-Image | prompt, aspect_ratio, guidance_scale |
| 6 | Topaz Upscale | `topaz/image-upscale` | Upscale | image_url, scale |
| 7 | Recraft Upscale | `recraft/crisp-upscale` | Upscale | image_url |
| 8 | Recraft Remove BG | `recraft/remove-background` | Background | image_url |
| 9 | Ideogram v3 | `ideogram/v3-text-to-image` | Text-to-Image | prompt, style, image_size, num_images |
| 10 | Ideogram v3-reframe | `ideogram/v3-reframe` | Reframe | prompt, image_url, aspect_ratio |
| 11 | Ideogram Character | `ideogram/character` | Character | prompt, character_description |
| 12 | Ideogram Character Edit | `ideogram/character-edit` | Character Edit | prompt, image_url |
| 13 | Ideogram Character Remix | `ideogram/character-remix` | Character Remix | prompt, image_url |
| 14 | Seedream 3.0 | `bytedance/seedream` | Text-to-Image | prompt, image_size, guidance_scale |
| 15 | Seedream 4.0 | `seedream-4.0` | Text-to-Image | prompt, image_size |
| 16 | Seedream 4.5 | `seedream-4.5` | Text-to-Image | prompt, image_size |

### 1.2 Видео (Video Models)

| # | Название | Model ID | Тип | Параметры |
|---|----------|----------|-----|-----------|
| 1 | Sora2 Pro T2V | `sora-2-pro-text-to-video` | Text-to-Video | prompt, aspect_ratio, n_frames, size, remove_watermark |
| 2 | Sora2 Pro I2V | `sora-2-pro-image-to-video` | Image-to-Video | prompt, image_url, aspect_ratio |
| 3 | Sora2 Fast T2V | `sora-2-fast-text-to-video` | Text-to-Video | prompt, aspect_ratio |
| 4 | Kling v2.1 Pro | `kling/v2-1-pro` | Text/Image-to-Video | prompt, image_url, duration, negative_prompt, cfg_scale |
| 5 | Kling v2.5 Pro | `kling/v2-5-pro` | Text/Image-to-Video | prompt, image_url, duration |
| 6 | Hailuo 2.3 I2V Pro | `hailuo/2-3-image-to-video-pro` | Image-to-Video | prompt, image_url, duration, resolution |
| 7 | Hailuo 2.3 T2V | `hailuo/2-3-text-to-video` | Text-to-Video | prompt, duration, resolution |

### 1.3 Аудио (Audio Models)

| # | Название | Model ID | Тип | Параметры |
|---|----------|----------|-----|-----------|
| 1 | ElevenLabs TTS Turbo 2.5 | `elevenlabs/text-to-speech-turbo-2-5` | Text-to-Speech | text, voice, stability, similarity_boost, speed |

---

## 2. Структура файлов

### 2.1 Библиотека (lib/kie/)

```
lib/kie/
├── client.ts              # HTTP клиент для API
├── types.ts               # TypeScript типы и интерфейсы
├── models.ts              # Конфигурация всех моделей
└── constants.ts           # Константы (endpoints, etc)
```

### 2.2 API Routes (app/api/kie/)

```
app/api/kie/
├── create-task/route.ts   # POST - создание задачи
├── task-status/route.ts   # GET - проверка статуса
├── tasks/route.ts         # GET - список задач пользователя
└── upload/route.ts        # POST - загрузка файлов
```

### 2.3 UI Страницы (app/(protected)/ai-studio/kie/)

```
app/(protected)/ai-studio/kie/
├── page.tsx               # Главная страница с категориями
├── page.module.css        # Стили главной
├── layout.tsx             # Layout с sidebar
│
├── images/
│   ├── page.tsx           # Страница изображений
│   ├── page.module.css    # Стили
│   └── [model]/page.tsx   # Динамическая страница модели
│
├── video/
│   ├── page.tsx           # Страница видео
│   ├── page.module.css    # Стили
│   └── [model]/page.tsx   # Динамическая страница модели
│
├── audio/
│   ├── page.tsx           # Страница аудио (TTS)
│   └── page.module.css    # Стили
│
└── tasks/
    ├── page.tsx           # История задач
    └── page.module.css    # Стили
```

### 2.4 Компоненты (components/kie/)

```
components/kie/
├── ModelCard.tsx          # Карточка модели
├── ModelCard.module.css
├── CategoryTabs.tsx       # Табы категорий
├── PromptInput.tsx        # Ввод промпта
├── ImageUploader.tsx      # Загрузка изображений
├── TaskProgress.tsx       # Прогресс задачи
├── TaskList.tsx           # Список задач
├── ResultDisplay.tsx      # Отображение результата
├── SettingsPanel.tsx      # Панель настроек модели
└── VoiceSelector.tsx      # Выбор голоса (TTS)
```

---

## 3. Детальный план реализации

### Этап 2: Базовая инфраструктура

#### 2.1 lib/kie/constants.ts
- [x] BASE_URL = "https://api.kie.ai/api/v1"
- [x] ENDPOINTS (createTask, recordInfo, upload)
- [x] TASK_STATES (waiting, queuing, generating, success, fail)

#### 2.2 lib/kie/types.ts
- [x] KieApiResponse<T>
- [x] KieTask
- [x] KieTaskStatus
- [x] KieCreateTaskRequest
- [x] Типы для каждой категории моделей
- [x] ImageModelInput, VideoModelInput, AudioModelInput

#### 2.3 lib/kie/models.ts
- [x] KieModel interface
- [x] IMAGE_MODELS array
- [x] VIDEO_MODELS array
- [x] AUDIO_MODELS array
- [x] getModelById()
- [x] getModelsByCategory()

#### 2.4 lib/kie/client.ts
- [x] KieClient class
- [x] createTask(model, input)
- [x] getTaskStatus(taskId)
- [x] uploadFile(file)
- [x] Обработка ошибок
- [x] Retry логика

#### 2.5 .env.local
- [x] KIE_API_KEY=ce90cb624cd8046b5b51c043c7641a84

---

### Этап 3: API Routes

#### 3.1 app/api/kie/create-task/route.ts
- [x] POST handler
- [x] Валидация входных данных
- [x] Проверка авторизации пользователя
- [x] Вызов KieClient.createTask()
- [x] Сохранение задачи в БД (опционально)
- [x] Возврат taskId

#### 3.2 app/api/kie/task-status/route.ts
- [x] GET handler
- [x] Получение taskId из query
- [x] Вызов KieClient.getTaskStatus()
- [x] Возврат статуса и результатов

#### 3.3 app/api/kie/upload/route.ts
- [x] POST handler (multipart/form-data)
- [x] Валидация файла
- [x] Загрузка на Kie.ai или Supabase Storage
- [x] Возврат URL файла

---

### Этап 4: UI Изображения

#### 4.1 Главная страница изображений
- [x] Сетка карточек моделей
- [x] Фильтрация по типу (generate, edit, upscale)
- [x] Поиск по названию

#### 4.2 Компонент генерации
- [x] Ввод промпта
- [x] Негативный промпт (опционально)
- [x] Выбор размера/соотношения сторон
- [x] Количество изображений
- [x] Кнопка генерации
- [x] Отображение прогресса
- [x] Галерея результатов

#### 4.3 Компонент редактирования
- [x] Загрузка исходного изображения
- [x] Ввод промпта для редактирования
- [x] Preview исходника
- [x] Результат

#### 4.4 Компонент апскейла
- [x] Загрузка изображения
- [x] Выбор scale (2x, 4x)
- [x] Preview до/после

#### 4.5 Удаление фона
- [x] Загрузка изображения
- [x] Автоматическая обработка
- [x] Скачивание результата

---

### Этап 5: UI Видео

#### 5.1 Главная страница видео
- [x] Карточки видео-моделей
- [x] Разделение: Text-to-Video, Image-to-Video

#### 5.2 Text-to-Video генератор
- [x] Ввод промпта
- [x] Выбор модели (Sora2, Kling, Hailuo)
- [x] Настройки: duration, aspect_ratio, quality
- [x] Прогресс генерации
- [x] Видеоплеер результата

#### 5.3 Image-to-Video генератор
- [x] Загрузка исходного изображения
- [x] Ввод промпта анимации
- [x] Выбор модели
- [x] Настройки
- [x] Результат

---

### Этап 6: UI Аудио

#### 6.1 Text-to-Speech страница
- [x] Ввод текста
- [x] Выбор голоса (Rachel, etc)
- [x] Настройки: stability, similarity_boost, speed
- [x] Preview голоса
- [x] Генерация
- [x] Аудиоплеер результата
- [x] Скачивание MP3

---

### Этап 7: История задач

#### 7.1 Таблица в Supabase
- [x] Миграция: kie_tasks table
- [x] Поля: id, user_id, model, status, input, result_url, created_at

#### 7.2 Страница истории
- [x] Список всех задач пользователя
- [x] Фильтрация по статусу
- [x] Фильтрация по категории
- [x] Повторная генерация
- [x] Удаление задач

---

### Этап 8: Интеграция в меню

#### 8.1 Sidebar ИИ Студии
- [x] Добавить пункт "Kie.ai Market"
- [x] Подпункты: Изображения, Видео, Аудио, История
- [x] Иконки для категорий

#### 8.2 Навигация
- [x] Breadcrumbs (кнопка "Назад")
- [x] Переключение между категориями

---

## 4. API Reference

### Create Task

```typescript
POST https://api.kie.ai/api/v1/jobs/createTask
Headers:
  Authorization: Bearer {API_KEY}
  Content-Type: application/json

Body:
{
  "model": "google/imagen4",
  "callBackUrl": "https://...", // optional
  "input": {
    "prompt": "...",
    // model-specific params
  }
}

Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_google_1234567890"
  }
}
```

### Get Task Status

```typescript
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Headers:
  Authorization: Bearer {API_KEY}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "task_...",
    "model": "google/imagen4",
    "state": "success", // waiting|queuing|generating|success|fail
    "resultJson": "{\"resultUrls\":[\"https://...\"]}", // when success
    "failCode": "",
    "failMsg": "",
    "createTime": 1234567890000,
    "completeTime": 1234567890000
  }
}
```

---

## 5. Примечания

- Все задачи асинхронные - нужен polling или callbacks
- Рекомендуемый интервал polling: 2-3 сек первые 30 сек, затем 5-10 сек
- Результаты временные - нужно скачивать и сохранять
- Для Image-to-Video и Edit моделей нужна загрузка файла

---

## 6. Changelog

### 17.12.2024
- Создан план интеграции
- Определены все модели
- Структура файлов

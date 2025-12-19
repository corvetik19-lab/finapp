# 🚀 AI Studio Redesign - Полный план разработки

> **Стиль**: GPTunnel.ru (светлая тема)  
> **Модели**: Только Google Gemini (Vertex AI)  
> **Дата создания**: 17.12.2024

---

## 📋 Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Дизайн-система](#2-дизайн-система)
3. [Архитектура](#3-архитектура)
4. [Модели Gemini и возможности](#4-модели-gemini-и-возможности)
5. [Фазы разработки](#5-фазы-разработки)
6. [База данных](#6-база-данных)
7. [API маршруты](#7-api-маршруты)
8. [Чеклист выполнения](#8-чеклист-выполнения)

---

## 1. Обзор проекта

### Цель
Создать профессиональную AI-платформу в стиле GPTunnel.ru с полным функционалом Gemini:
- **Ассистенты GPTs** - создание специализированных ИИ-помощников
- **Инструменты AI** - набор утилит для работы с медиа
- **Чаты** - история диалогов с сохранением
- **RAG** - поиск по документам пользователя

### Ключевые особенности
- ✅ Светлая минималистичная тема
- ✅ Без кнопки "Войти" (пользователь уже авторизован)
- ✅ Без счётчика лайков
- ✅ Фильтры: только поиск + избранное
- ✅ Без настроек температуры/токенов (автоматически)

---

## 2. Дизайн-система

### Цветовая палитра (светлая тема)
```css
:root {
  /* Фоны */
  --bg-primary: #ffffff;
  --bg-secondary: #f9f9fa;
  --bg-sidebar: #ffffff;
  --bg-card: #ffffff;
  --bg-hover: #f5f5f5;
  
  /* Границы */
  --border-light: #e5e5e5;
  --border-medium: #d4d4d4;
  
  /* Текст */
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;
  
  /* Акценты */
  --accent-primary: #ff6b35;
  --accent-hover: #e55a2b;
  --accent-light: rgba(255, 107, 53, 0.1);
  
  /* Статусы */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

### Типографика
```css
/* Шрифты как на GPTunnel */
--font-primary: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
--font-accent: 'Tektur', sans-serif;

/* Размеры */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
```

### Компоненты
```css
/* Карточки */
--card-radius: 16px;
--card-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
--card-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.12);

/* Кнопки */
--btn-radius: 10px;
--btn-padding: 10px 20px;

/* Инпуты */
--input-radius: 10px;
--input-border: 1px solid var(--border-light);
```

---

## 3. Архитектура

### Структура файлов
```
app/(protected)/ai-studio/
├── layout.tsx                      # Главный layout (светлый)
├── page.tsx                        # Welcome страница
├── page.module.css
│
├── assistants/
│   ├── page.tsx                    # Галерея ассистентов
│   ├── page.module.css
│   ├── new/
│   │   └── page.tsx                # Создание ассистента
│   └── [id]/
│       ├── page.tsx                # Чат с ассистентом
│       └── settings/
│           └── page.tsx            # Настройки ассистента
│
├── tools/
│   ├── page.tsx                    # Список инструментов
│   ├── live-photos/page.tsx        # Оживление фото → Veo 3.1
│   ├── tts/page.tsx                # Text-to-Speech → Gemini TTS
│   ├── stickers/page.tsx           # Генерация стикеров → Gemini Image
│   ├── bg-remover/page.tsx         # Удаление фона → Gemini Image
│   ├── transcribe/page.tsx         # Транскрибация → Gemini Flash
│   └── enhance/page.tsx            # Улучшение фото → Gemini Image
│
├── history/
│   └── page.tsx                    # История чатов
│
├── components/
│   ├── Sidebar.tsx                 # Sidebar (без кнопки Войти)
│   ├── Sidebar.module.css
│   ├── AssistantCard.tsx           # Карточка ассистента (без лайков)
│   ├── AssistantGrid.tsx           # Сетка ассистентов
│   ├── ChatInterface.tsx           # Интерфейс чата
│   ├── ChatMessage.tsx             # Сообщение в чате
│   ├── ToolCard.tsx                # Карточка инструмента
│   ├── SearchBar.tsx               # Поиск
│   ├── FavoriteButton.tsx          # Кнопка избранного
│   └── ModelBadge.tsx              # Бейдж модели
│
└── styles/
    └── variables.css               # CSS переменные
```

### Lib структура
```
lib/ai-studio/
├── index.ts                        # Экспорты
├── models.ts                       # Конфигурация моделей (уже есть)
├── types.ts                        # TypeScript типы (уже есть)
├── access.ts                       # Проверка доступа (уже есть)
│
├── assistants/
│   ├── service.ts                  # CRUD ассистентов
│   ├── types.ts                    # Типы ассистентов
│   └── presets.ts                  # Готовые ассистенты
│
├── chats/
│   ├── service.ts                  # CRUD чатов
│   ├── messages.ts                 # Работа с сообщениями
│   └── types.ts                    # Типы чатов
│
├── tools/
│   ├── live-photos.ts              # Оживление фото (Veo)
│   ├── tts.ts                      # Text-to-Speech
│   ├── stickers.ts                 # Генерация стикеров
│   ├── bg-remover.ts               # Удаление фона
│   ├── transcribe.ts               # Транскрибация
│   └── enhance.ts                  # Улучшение фото
│
├── rag/
│   ├── corpus.ts                   # Управление RAG корпусами
│   ├── files.ts                    # Загрузка файлов в RAG
│   └── retrieval.ts                # Поиск по документам
│
└── gemini/
    ├── client.ts                   # Клиент Vertex AI
    ├── chat.ts                     # Генерация текста
    ├── image.ts                    # Генерация изображений
    ├── video.ts                    # Генерация видео
    ├── audio.ts                    # TTS и транскрибация
    ├── grounding.ts                # Google Search grounding
    └── code-execution.ts           # Выполнение кода
```

---

## 4. Модели Gemini и возможности

### Текстовые модели (Чат/Ассистенты)
| Модель | ID | Возможности |
|--------|-----|-------------|
| **Gemini 3 Pro** | `gemini-3-pro-preview` | Мультимодальный, Deep Thinking, 1M токенов |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Мощный анализ, thinking |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Быстрый, оптимальный баланс |
| **Gemini 2.5 Flash-Lite** | `gemini-2.5-flash-lite-preview` | Сверхбыстрый |

### Изображения
| Модель | ID | Возможности |
|--------|-----|-------------|
| **Gemini 3 Pro Image** | `gemini-3-pro-image-preview` | Генерация, редактирование, thinking |
| **Gemini 2.5 Flash Image** | `gemini-2.5-flash-image` | Быстрая генерация |

### Видео
| Модель | ID | Возможности |
|--------|-----|-------------|
| **Veo 3.1** | `veo-3.1-generate-preview` | 720p/1080p, нативный звук, 8 сек |
| **Veo 3.1 Fast** | `veo-3.1-fast-generate-preview` | Быстрая генерация |
| **Veo 3** | `veo-3.0-generate-001` | Стабильная версия |

### Аудио
| Модель | ID | Возможности |
|--------|-----|-------------|
| **Gemini TTS** | `gemini-2.5-flash-preview-tts` | 7 голосов, 10+ языков |
| **Gemini Pro TTS** | `gemini-2.5-pro-preview-tts` | Профессиональная озвучка |
| **Gemini Live** | `gemini-2.5-flash-native-audio-preview` | Realtime голосовой ассистент |

### Дополнительные возможности
| Функция | Описание |
|---------|----------|
| **Google Search Grounding** | Поиск актуальной информации в интернете |
| **Code Execution** | Выполнение Python кода в sandbox |
| **RAG** | Retrieval-Augmented Generation с документами пользователя |
| **Function Calling** | Вызов внешних функций/API |
| **URL Context** | Анализ содержимого URL |
| **Structured Output** | JSON-схемы для структурированных ответов |

---

## 5. Фазы разработки

### Фаза 1: Дизайн и Layout ✅
- [x] Создать CSS переменные для светлой темы
- [x] Обновить `layout.tsx` - светлый фон
- [x] Обновить `Sidebar.tsx`:
  - [x] Убрать кнопку "Войти"
  - [x] Добавить "Ассистенты GPTs"
  - [x] Добавить "Инструменты AI"
  - [x] Обновить секцию "Чаты"
- [x] Обновить главную страницу в стиле GPTunnel ь
- [x] Адаптивная вёрстка

### Фаза 2: Ассистенты GPTs ✅
- [x] Миграция БД: таблица `ai_assistants`
- [x] Миграция БД: таблица `ai_assistant_favorites`
- [x] API: CRUD ассистентов
- [x] Страница галереи ассистентов:
  - [x] Сетка карточек
  - [x] Поиск по названию
  - [x] Фильтр избранного
  - [x] Кнопка "Создать ассистента"
- [x] Страница создания ассистента:
  - [x] Форма (название, описание, промпт)
  - [x] Выбор модели
  - [x] Выбор цвета и иконки
- [x] Готовые ассистенты:
  - [x] Юрист
  - [x] Копирайтер
  - [x] Маркетолог
  - [x] Переводчик
  - [x] Программист
  - [x] Аналитик

### Фаза 3: Инструменты AI ✅
- [x] Страница списка инструментов
- [x] **Оживление фото** (Veo 3.1):
  - [x] Загрузка фото
  - [x] Ввод промпта (опционально)
  - [x] Генерация видео (API)
  - [x] Скачивание результата
- [x] **Text-to-Speech** (Gemini TTS):
  - [x] Ввод текста
  - [x] Выбор голоса (7 вариантов)
  - [x] Выбор языка
  - [x] Генерация аудио (API)
  - [x] Плеер и скачивание
- [x] **Стикеры** (Gemini Image):
  - [x] Ввод промпта
  - [x] Генерация изображения (API)
  - [x] Автоматическое удаление фона
  - [x] Скачивание PNG
- [x] **Удаление фона** (Gemini Image):
  - [x] Загрузка фото
  - [x] Обработка (API)
  - [x] Предпросмотр до/после
  - [x] Скачивание
- [x] **Транскрибация** (Gemini Flash):
  - [x] Загрузка аудио/видео
  - [x] Обработка (API)
  - [x] Отображение текста
  - [x] Копирование/скачивание
- [x] **Фотобустер** (Gemini Image):
  - [x] Загрузка фото
  - [x] Улучшение качества (API)
  - [x] Сравнение до/после
  - [x] Скачивание

### Фаза 4: Чаты и история ✅
- [x] Миграция БД: таблица `ai_chats`
- [x] Миграция БД: таблица `ai_messages`
- [x] API: CRUD чатов
- [x] Интерфейс чата:
  - [x] Поле ввода снизу
  - [x] Сообщения с markdown
  - [x] Прикрепление файлов
  - [x] Streaming ответов
- [x] История в sidebar:
  - [x] Список чатов
  - [x] Группировка по дням
  - [x] Удаление чатов


### Фаза 5: RAG и продвинутые функции ✅
- [x] Интеграция RAG Engine:
  - [x] Сервис для работы с документами
  - [x] API: CRUD документов
  - [x] API: Поиск по документам
  - [x] UI для загрузки файлов (`/ai-studio/documents`)
- [x] Google Search Grounding:
  - [x] Сервис searchWithGrounding
  - [x] API: /api/ai-studio/features/grounding
  - [x] Отображение источников
- [x] Code Execution:
  - [x] Сервис executeCode + generateCode
  - [x] API: /api/ai-studio/features/code-execution
  - [x] Поддержка Python
- [x] URL Context:
  - [x] Сервис analyzeUrl
  - [x] Интеграция в grounding API

### Фаза 6: Тестирование и оптимизация ✅
- [x] Обработка ошибок (`lib/ai-studio/utils/error-handler.ts`)
- [x] Лимиты и rate limiting (LIMITS константы)
- [x] Документация API (`docs/AI_STUDIO_API.md`)

---

## 6. База данных

### Таблица: ai_assistants
```sql
CREATE TABLE ai_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  avatar_url TEXT,
  
  model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and public assistants"
  ON ai_assistants FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can manage own assistants"
  ON ai_assistants FOR ALL
  USING (user_id = auth.uid());
```

### Таблица: ai_assistant_favorites
```sql
CREATE TABLE ai_assistant_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES ai_assistants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, assistant_id)
);

-- RLS
ALTER TABLE ai_assistant_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites"
  ON ai_assistant_favorites FOR ALL
  USING (user_id = auth.uid());
```

### Таблица: ai_chats
```sql
CREATE TABLE ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES ai_assistants(id) ON DELETE SET NULL,
  
  title VARCHAR(200),
  model VARCHAR(50) DEFAULT 'gemini-2.5-flash',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chats"
  ON ai_chats FOR ALL
  USING (user_id = auth.uid());

-- Индексы
CREATE INDEX idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX idx_ai_chats_created_at ON ai_chats(created_at DESC);
```

### Таблица: ai_messages
```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Для мультимодального контента
  attachments JSONB DEFAULT '[]',
  
  -- Метаданные
  tokens_used INTEGER,
  model VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own chats"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_chats 
      WHERE ai_chats.id = ai_messages.chat_id 
      AND ai_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own chats"
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chats 
      WHERE ai_chats.id = ai_messages.chat_id 
      AND ai_chats.user_id = auth.uid()
    )
  );

-- Индексы
CREATE INDEX idx_ai_messages_chat_id ON ai_messages(chat_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);
```

### Таблица: ai_rag_documents
```sql
CREATE TABLE ai_rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  
  -- Vertex AI RAG
  corpus_id TEXT,
  rag_file_id TEXT,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents"
  ON ai_rag_documents FOR ALL
  USING (user_id = auth.uid());
```

---

## 7. API маршруты

### Ассистенты
```
GET    /api/ai-studio/assistants          # Список ассистентов
POST   /api/ai-studio/assistants          # Создать ассистента
GET    /api/ai-studio/assistants/[id]     # Получить ассистента
PUT    /api/ai-studio/assistants/[id]     # Обновить ассистента
DELETE /api/ai-studio/assistants/[id]     # Удалить ассистента

POST   /api/ai-studio/assistants/[id]/favorite    # Добавить в избранное
DELETE /api/ai-studio/assistants/[id]/favorite    # Убрать из избранного
```

### Чаты
```
GET    /api/ai-studio/chats               # Список чатов
POST   /api/ai-studio/chats               # Создать чат
GET    /api/ai-studio/chats/[id]          # Получить чат с сообщениями
DELETE /api/ai-studio/chats/[id]          # Удалить чат

POST   /api/ai-studio/chats/[id]/messages # Отправить сообщение (streaming)
```

### Инструменты
```
POST   /api/ai-studio/tools/live-photos   # Оживление фото
POST   /api/ai-studio/tools/tts           # Text-to-Speech
POST   /api/ai-studio/tools/stickers      # Генерация стикеров
POST   /api/ai-studio/tools/bg-remover    # Удаление фона
POST   /api/ai-studio/tools/transcribe    # Транскрибация
POST   /api/ai-studio/tools/enhance       # Улучшение фото
```

### RAG
```
GET    /api/ai-studio/rag/documents       # Список документов
POST   /api/ai-studio/rag/documents       # Загрузить документ
DELETE /api/ai-studio/rag/documents/[id]  # Удалить документ
POST   /api/ai-studio/rag/search          # Поиск по документам
```

---

## 8. Чеклист выполнения

### Фаза 1: Дизайн и Layout
- [ ] CSS переменные
- [ ] Layout светлый
- [ ] Sidebar обновлён
- [ ] Главная страница
- [ ] Адаптив

### Фаза 2: Ассистенты
- [ ] Миграции БД
- [ ] API routes
- [ ] Галерея
- [ ] Создание
- [ ] Готовые ассистенты

### Фаза 3: Инструменты
- [ ] Список инструментов
- [ ] Оживление фото
- [ ] TTS
- [ ] Стикеры
- [ ] Удаление фона
- [ ] Транскрибация
- [ ] Фотобустер

### Фаза 4: Чаты
- [ ] Миграции БД
- [ ] API routes
- [ ] Интерфейс чата
- [ ] История в sidebar
- [ ] Удаление чатов

### Фаза 5: RAG и advanced
- [ ] RAG корпуса
- [ ] Загрузка документов
- [ ] Google Search
- [ ] Code Execution
- [ ] URL Context

### Фаза 6: Финализация
- [ ] Тесты
- [ ] Оптимизация
- [ ] Документация

---

## 📝 Примечания

### Vertex AI настройка
Проект уже использует Vertex AI. Переменные окружения:
- `GOOGLE_CLOUD_PROJECT` - ID проекта GCP
- `GOOGLE_CLOUD_LOCATION` - регион (us-central1)
- `GOOGLE_APPLICATION_CREDENTIALS` - путь к service account key

### Лимиты
- Gemini 2.5 Flash: 1M input tokens, 65K output
- Veo 3.1: максимум 8 секунд видео
- TTS: до 8192 input tokens
- RAG: до 10GB на корпус

---

*Последнее обновление: 17.12.2024*

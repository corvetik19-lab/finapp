# AI Studio API Documentation

## Аутентификация

Все API требуют авторизации через Supabase Auth. Запросы должны включать cookie сессии.

## Базовые эндпоинты

### Ассистенты

#### GET /api/ai-studio/assistants
Получение списка ассистентов пользователя.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Юрист",
    "description": "Помощник по юридическим вопросам",
    "system_prompt": "...",
    "model": "gemini-2.0-flash",
    "color": "#3b82f6",
    "emoji": "⚖️",
    "is_public": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/ai-studio/assistants
Создание нового ассистента.

**Request:**
```json
{
  "name": "Мой ассистент",
  "description": "Описание",
  "system_prompt": "Ты полезный помощник...",
  "model": "gemini-2.0-flash",
  "color": "#3b82f6",
  "emoji": "🤖"
}
```

---

### Чаты

#### GET /api/ai-studio/chats
Получение списка чатов пользователя.

#### POST /api/ai-studio/chats
Создание нового чата.

**Request:**
```json
{
  "assistant_id": "uuid",
  "title": "Новый чат"
}
```

#### DELETE /api/ai-studio/chats/[id]
Удаление чата.

---

### Стриминг чата

#### POST /api/ai-studio/chat/stream
Отправка сообщения с потоковым ответом (SSE).

**Request:**
```json
{
  "message": "Привет!",
  "chatId": "uuid",
  "assistantId": "uuid",
  "attachments": [
    {
      "type": "image",
      "data": "base64...",
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Response:** Server-Sent Events stream

---

## Инструменты AI

### Text-to-Speech

#### POST /api/ai-studio/tools/tts

**Request:**
```json
{
  "text": "Текст для озвучки",
  "voice": "Kore",
  "language": "ru"
}
```

**Response:**
```json
{
  "audioUrl": "data:audio/wav;base64,..."
}
```

**Голоса:** Puck, Charon, Kore, Fenrir, Aoede, Orbit, Leda

---

### Транскрибация

#### POST /api/ai-studio/tools/transcribe

**Request:**
```json
{
  "mediaBase64": "base64...",
  "mimeType": "audio/mp3"
}
```

**Response:**
```json
{
  "text": "Распознанный текст..."
}
```

---

### Стикеры

#### POST /api/ai-studio/tools/stickers

**Request:**
```json
{
  "prompt": "милый котёнок в стиле Pixar"
}
```

**Response:**
```json
{
  "imageUrl": "data:image/png;base64,..."
}
```

---

### Удаление фона

#### POST /api/ai-studio/tools/bg-remover

**Request:**
```json
{
  "imageBase64": "base64...",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "imageUrl": "data:image/png;base64,..."
}
```

---

### Улучшение фото

#### POST /api/ai-studio/tools/enhance

**Request:**
```json
{
  "imageBase64": "base64...",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "imageUrl": "data:image/jpeg;base64,..."
}
```

---

### Оживление фото (видео)

#### POST /api/ai-studio/tools/live-photos

**Request:**
```json
{
  "imageBase64": "base64...",
  "mimeType": "image/jpeg",
  "prompt": "волосы развеваются на ветру"
}
```

**Response:**
```json
{
  "videoUrl": "data:video/mp4;base64,..."
}
```

---

## Продвинутые функции

### Google Search Grounding

#### POST /api/ai-studio/features/grounding

**Request (поиск):**
```json
{
  "query": "последние новости о криптовалюте",
  "systemPrompt": "Отвечай кратко"
}
```

**Request (анализ URL):**
```json
{
  "url": "https://example.com/article",
  "question": "О чём эта статья?"
}
```

**Response:**
```json
{
  "text": "Ответ с информацией...",
  "sources": [
    {
      "title": "Источник",
      "url": "https://...",
      "snippet": "..."
    }
  ]
}
```

---

### Code Execution

#### POST /api/ai-studio/features/code-execution

**Request (выполнение):**
```json
{
  "prompt": "Посчитай сумму чисел от 1 до 100",
  "code": "# существующий код (опционально)"
}
```

**Request (генерация):**
```json
{
  "prompt": "Функция сортировки пузырьком",
  "language": "python",
  "action": "generate"
}
```

**Response:**
```json
{
  "code": "def bubble_sort(arr):\n  ...",
  "output": "5050",
  "language": "python",
  "success": true
}
```

---

## RAG (База знаний)

### Документы

#### GET /api/ai-studio/rag/documents
Получение списка документов.

#### POST /api/ai-studio/rag/documents
Загрузка нового документа.

**Request:**
```json
{
  "name": "document.pdf",
  "file_path": "rag/document.pdf",
  "file_type": "application/pdf",
  "file_size": 1024000,
  "metadata": {}
}
```

#### DELETE /api/ai-studio/rag/documents/[id]
Удаление документа.

---

### Поиск

#### POST /api/ai-studio/rag/search

**Request:**
```json
{
  "query": "поисковый запрос",
  "limit": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "name": "document.pdf",
      "score": 0.95,
      "snippet": "..."
    }
  ]
}
```

---

## Лимиты

| Тип | Лимит |
|-----|-------|
| Изображения | 20 MB |
| Аудио | 50 MB |
| Видео | 100 MB |
| Документы | 10 MB |
| Текст TTS | 5000 символов |
| Промпт | 30000 символов |
| Сообщение чата | 10000 символов |

## Коды ошибок

| Код | Описание |
|-----|----------|
| UNAUTHORIZED | Необходима авторизация |
| ACCESS_DENIED | Нет доступа к AI Студии |
| RATE_LIMIT_EXCEEDED | Слишком много запросов |
| QUOTA_EXCEEDED | Превышен лимит использования |
| INVALID_INPUT | Некорректные входные данные |
| FILE_TOO_LARGE | Файл слишком большой |
| UNSUPPORTED_FORMAT | Неподдерживаемый формат |
| API_ERROR | Ошибка API |
| TIMEOUT | Превышено время ожидания |

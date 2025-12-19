// Типы ошибок AI Studio
export enum AIStudioErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  ACCESS_DENIED = "ACCESS_DENIED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  INVALID_INPUT = "INVALID_INPUT",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  API_ERROR = "API_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN",
}

export interface AIStudioError {
  code: AIStudioErrorCode;
  message: string;
  details?: string;
  retryAfter?: number;
}

// Лимиты для различных операций
export const LIMITS = {
  // Размеры файлов (в байтах)
  MAX_IMAGE_SIZE: 20 * 1024 * 1024, // 20 MB
  MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100 MB
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10 MB
  
  // Текстовые лимиты
  MAX_PROMPT_LENGTH: 30000,
  MAX_TTS_TEXT_LENGTH: 5000,
  MAX_CHAT_MESSAGE_LENGTH: 10000,
  
  // Rate limits (запросов в минуту)
  RATE_LIMIT_CHAT: 30,
  RATE_LIMIT_IMAGE: 10,
  RATE_LIMIT_VIDEO: 5,
  RATE_LIMIT_TTS: 20,
  RATE_LIMIT_TRANSCRIBE: 10,
  
  // Поддерживаемые форматы
  SUPPORTED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  SUPPORTED_AUDIO_TYPES: ["audio/mp3", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"],
  SUPPORTED_VIDEO_TYPES: ["video/mp4", "video/webm", "video/quicktime"],
  SUPPORTED_DOCUMENT_TYPES: ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

// Человекочитаемые сообщения об ошибках
const ERROR_MESSAGES: Record<AIStudioErrorCode, string> = {
  [AIStudioErrorCode.UNAUTHORIZED]: "Необходима авторизация",
  [AIStudioErrorCode.ACCESS_DENIED]: "Нет доступа к AI Студии",
  [AIStudioErrorCode.RATE_LIMIT_EXCEEDED]: "Слишком много запросов. Подождите немного",
  [AIStudioErrorCode.QUOTA_EXCEEDED]: "Превышен лимит использования",
  [AIStudioErrorCode.INVALID_INPUT]: "Некорректные входные данные",
  [AIStudioErrorCode.FILE_TOO_LARGE]: "Файл слишком большой",
  [AIStudioErrorCode.UNSUPPORTED_FORMAT]: "Неподдерживаемый формат файла",
  [AIStudioErrorCode.API_ERROR]: "Ошибка API",
  [AIStudioErrorCode.TIMEOUT]: "Превышено время ожидания",
  [AIStudioErrorCode.UNKNOWN]: "Неизвестная ошибка",
};

// Создание ошибки
export function createError(
  code: AIStudioErrorCode,
  details?: string,
  retryAfter?: number
): AIStudioError {
  return {
    code,
    message: ERROR_MESSAGES[code],
    details,
    retryAfter,
  };
}

// Валидация размера файла
export function validateFileSize(
  size: number,
  type: "image" | "audio" | "video" | "document"
): AIStudioError | null {
  const limits: Record<string, number> = {
    image: LIMITS.MAX_IMAGE_SIZE,
    audio: LIMITS.MAX_AUDIO_SIZE,
    video: LIMITS.MAX_VIDEO_SIZE,
    document: LIMITS.MAX_DOCUMENT_SIZE,
  };

  const maxSize = limits[type];
  if (size > maxSize) {
    const maxMB = maxSize / 1024 / 1024;
    return createError(
      AIStudioErrorCode.FILE_TOO_LARGE,
      `Максимальный размер: ${maxMB} MB`
    );
  }
  return null;
}

// Валидация типа файла
export function validateFileType(
  mimeType: string,
  type: "image" | "audio" | "video" | "document"
): AIStudioError | null {
  const supported: Record<string, string[]> = {
    image: LIMITS.SUPPORTED_IMAGE_TYPES,
    audio: LIMITS.SUPPORTED_AUDIO_TYPES,
    video: LIMITS.SUPPORTED_VIDEO_TYPES,
    document: LIMITS.SUPPORTED_DOCUMENT_TYPES,
  };

  const allowedTypes = supported[type];
  if (!allowedTypes.some((t) => mimeType.startsWith(t.split("/")[0]) || mimeType === t)) {
    return createError(
      AIStudioErrorCode.UNSUPPORTED_FORMAT,
      `Поддерживаемые форматы: ${allowedTypes.map((t) => t.split("/")[1]).join(", ")}`
    );
  }
  return null;
}

// Валидация длины текста
export function validateTextLength(
  text: string,
  type: "prompt" | "tts" | "chat"
): AIStudioError | null {
  const limits: Record<string, number> = {
    prompt: LIMITS.MAX_PROMPT_LENGTH,
    tts: LIMITS.MAX_TTS_TEXT_LENGTH,
    chat: LIMITS.MAX_CHAT_MESSAGE_LENGTH,
  };

  const maxLength = limits[type];
  if (text.length > maxLength) {
    return createError(
      AIStudioErrorCode.INVALID_INPUT,
      `Максимальная длина текста: ${maxLength} символов`
    );
  }
  return null;
}

// Обработка ошибок Gemini API
export function handleGeminiError(error: unknown): AIStudioError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes("rate limit") || message.includes("quota")) {
      return createError(AIStudioErrorCode.RATE_LIMIT_EXCEEDED);
    }
    if (message.includes("timeout")) {
      return createError(AIStudioErrorCode.TIMEOUT);
    }
    if (message.includes("invalid") || message.includes("bad request")) {
      return createError(AIStudioErrorCode.INVALID_INPUT, error.message);
    }
    
    return createError(AIStudioErrorCode.API_ERROR, error.message);
  }
  
  return createError(AIStudioErrorCode.UNKNOWN);
}

// Форматирование ошибки для ответа API
export function formatErrorResponse(error: AIStudioError) {
  return {
    error: error.message,
    code: error.code,
    details: error.details,
    retryAfter: error.retryAfter,
  };
}

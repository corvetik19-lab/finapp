// Конфигурация настроек для разных моделей AI Studio

export type ModelType = "text" | "image" | "video" | "audio" | "tts";

// ============ Настройки для генерации изображений (Imagen) ============
export interface ImageGenerationConfig {
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  numberOfImages: number;
  negativePrompt?: string;
  seed?: number;
  guidanceScale?: number;
  enhancePrompt: boolean;
  addWatermark: boolean;
  personGeneration: "dont_allow" | "allow_adult" | "allow_all";
  safetyFilterLevel: "block_low_and_above" | "block_medium_and_above" | "block_only_high";
}

export const DEFAULT_IMAGE_CONFIG: ImageGenerationConfig = {
  aspectRatio: "1:1",
  numberOfImages: 1,
  enhancePrompt: true,
  addWatermark: false,
  personGeneration: "allow_adult",
  safetyFilterLevel: "block_medium_and_above",
};

export const IMAGE_ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Квадрат)", icon: "⬜" },
  { value: "3:4", label: "3:4 (Портрет)", icon: "📱" },
  { value: "4:3", label: "4:3 (Альбом)", icon: "🖼️" },
  { value: "9:16", label: "9:16 (Вертикальный)", icon: "📲" },
  { value: "16:9", label: "16:9 (Широкий)", icon: "🎬" },
];

// ============ Настройки для генерации видео (Veo) ============
export interface VideoGenerationConfig {
  aspectRatio: "16:9" | "9:16" | "1:1";
  durationSeconds: number;
  fps: number;
  resolution: "480p" | "720p" | "1080p";
  negativePrompt?: string;
  seed?: number;
  generateAudio: boolean;
  enhancePrompt: boolean;
}

export const DEFAULT_VIDEO_CONFIG: VideoGenerationConfig = {
  aspectRatio: "16:9",
  durationSeconds: 5,
  fps: 24,
  resolution: "720p",
  generateAudio: false,
  enhancePrompt: true,
};

export const VIDEO_ASPECT_RATIOS = [
  { value: "16:9", label: "16:9 (Горизонтальный)", icon: "🎬" },
  { value: "9:16", label: "9:16 (Вертикальный)", icon: "📱" },
  { value: "1:1", label: "1:1 (Квадрат)", icon: "⬜" },
];

export const VIDEO_RESOLUTIONS = [
  { value: "480p", label: "480p (SD)" },
  { value: "720p", label: "720p (HD)" },
  { value: "1080p", label: "1080p (Full HD)" },
];

// ============ Настройки для генерации текста (Gemini) ============
export interface TextGenerationConfig {
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  stopSequences: string[];
}

export const DEFAULT_TEXT_CONFIG: TextGenerationConfig = {
  temperature: 1.0,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  stopSequences: [],
};

// ============ Настройки для TTS (Gemini TTS) ============
export interface TTSConfig {
  voice: string;
  language: string;
  speakingRate: number;
  pitch: number;
}

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  voice: "Kore",
  language: "ru",
  speakingRate: 1.0,
  pitch: 0,
};

export const TTS_VOICES = [
  { id: "Puck", name: "Puck", description: "Мужской, нейтральный" },
  { id: "Charon", name: "Charon", description: "Мужской, глубокий" },
  { id: "Kore", name: "Kore", description: "Женский, мягкий" },
  { id: "Fenrir", name: "Fenrir", description: "Мужской, энергичный" },
  { id: "Aoede", name: "Aoede", description: "Женский, тёплый" },
  { id: "Orbit", name: "Orbit", description: "Нейтральный" },
  { id: "Leda", name: "Leda", description: "Женский, чёткий" },
];

export const TTS_LANGUAGES = [
  { code: "ru", name: "Русский" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
];

// ============ Настройки для транскрибации ============
export interface TranscribeConfig {
  language: string;
  includeTimestamps: boolean;
  punctuate: boolean;
}

export const DEFAULT_TRANSCRIBE_CONFIG: TranscribeConfig = {
  language: "auto",
  includeTimestamps: true,
  punctuate: true,
};

// ============ Доступные модели ============
export const AVAILABLE_MODELS = {
  text: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Быстрый и эффективный" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Новейший, оптимальный" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Максимальное качество" },
  ],
  image: [
    { id: "imagen-3.0-generate-002", name: "Imagen 3", description: "Генерация изображений" },
    { id: "imagen-4.0-generate-001", name: "Imagen 4", description: "Новейшая генерация" },
    { id: "gemini-2.0-flash-preview-image-generation", name: "Gemini Image", description: "Мультимодальный" },
  ],
  video: [
    { id: "veo-2.0-generate-001", name: "Veo 2.0", description: "Генерация видео" },
    { id: "veo-3.1-generate-preview", name: "Veo 3.1", description: "Новейшая генерация" },
  ],
  audio: [
    { id: "gemini-2.0-flash", name: "Gemini Flash", description: "Транскрибация" },
  ],
  tts: [
    { id: "gemini-2.5-flash-preview-tts", name: "Gemini TTS", description: "Озвучка текста" },
  ],
};

// ============ Получение конфига по умолчанию ============
export function getDefaultConfig(modelType: ModelType) {
  switch (modelType) {
    case "text":
      return { ...DEFAULT_TEXT_CONFIG };
    case "image":
      return { ...DEFAULT_IMAGE_CONFIG };
    case "video":
      return { ...DEFAULT_VIDEO_CONFIG };
    case "tts":
      return { ...DEFAULT_TTS_CONFIG };
    case "audio":
      return { ...DEFAULT_TRANSCRIBE_CONFIG };
    default:
      return {};
  }
}

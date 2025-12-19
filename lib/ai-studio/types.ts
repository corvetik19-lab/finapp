/**
 * AI Studio Types
 */

// Уровни thinking
export type ThinkingLevel = "minimal" | "low" | "medium" | "high";

// Функции AI Studio
export type AIStudioFeature =
  | "chat"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "research";

// Конфигурация модели
export interface AIStudioModel {
  id: string;
  name: string;
  description: string;
  inputTokens?: number;
  outputTokens?: number;
  features: {
    // Общие
    thinking?: boolean;
    thinkingLevels?: ThinkingLevel[];
    googleSearch?: boolean;
    googleMaps?: boolean;
    urlContext?: boolean;
    codeExecution?: boolean;
    fileSearch?: boolean;
    structuredOutput?: boolean;
    functionCalling?: boolean;
    mediaResolution?: string[];
    // Изображения
    generation?: boolean;
    editing?: boolean;
    multiTurnEditing?: boolean;
    referenceImages?: number;
    maxResolution?: string;
    // Видео (Veo)
    textToVideo?: boolean;
    imageToVideo?: boolean;
    videoExtension?: boolean;
    nativeAudio?: boolean;
    maxDuration?: number;
    aspectRatios?: string[];
    resolutions?: string[];
    firstLastFrame?: boolean;
    // Аудио (TTS / Live)
    tts?: boolean;
    voices?: string[];
    languages?: string[];
    liveApi?: boolean;
    realTimeVoice?: boolean;
    // Документы
    pdfAnalysis?: boolean;
    maxPages?: number;
    tableExtraction?: boolean;
    // Исследования (Deep Research)
    webSearch?: boolean;
    fileAnalysis?: boolean;
    citedSources?: boolean;
    longRunning?: boolean;
    multiStep?: boolean;
    reportGeneration?: boolean;
    // Embeddings
    dimensions?: number;
    taskTypes?: string[];
  };
  inputs?: string[];
  outputs?: string[];
}

// Сообщение чата
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  thinking?: string;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  attachments?: Array<{
    type: "image" | "video" | "audio" | "document";
    url: string;
    name: string;
  }>;
}

// Конфигурация генерации
export interface GenerationConfig {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  thinkingConfig?: {
    thinkingMode: "THINKING_MODE_LOW" | "THINKING_MODE_MEDIUM" | "THINKING_MODE_HIGH";
    includeThoughts?: boolean;
    thinkingBudget?: number;
  };
  tools?: Array<{
    googleSearch?: Record<string, never>;
    urlContext?: Record<string, never>;
    codeExecution?: Record<string, never>;
    googleMaps?: Record<string, never>;
  }>;
  responseModalities?: string[];
  responseMimeType?: string;
}

// Результат генерации изображения
export interface ImageGenerationResult {
  images: Array<{
    url: string;
    base64?: string;
    mimeType: string;
  }>;
  thinking?: string;
}

// Результат генерации видео
export interface VideoGenerationResult {
  operationId: string;
  status: "pending" | "processing" | "completed" | "failed";
  videoUrl?: string;
  progress?: number;
  error?: string;
}

// Результат TTS
export interface TTSResult {
  audioUrl: string;
  audioBase64?: string;
  duration: number;
  mimeType: string;
}

// Результат анализа документа
export interface DocumentAnalysisResult {
  summary: string;
  keyPoints: string[];
  entities: Array<{
    name: string;
    type: string;
  }>;
  fullText?: string;
}

// Результат Deep Research
export interface ResearchResult {
  topic: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    sources: Array<{
      title: string;
      url: string;
    }>;
  }>;
  sources: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
}

/**
 * OpenRouter Models Configuration
 * Конфигурация моделей для AI Studio через OpenRouter
 * 
 * Документация: https://openrouter.ai/models
 */

export interface OpenRouterModelConfig {
  id: string;
  name: string;
  description: string;
  provider: string;
  contextLength: number;
  maxOutput: number;
  features: {
    vision?: boolean;
    tools?: boolean;
    streaming?: boolean;
    reasoning?: boolean;
  };
  pricing: {
    input: number;  // $ per 1M tokens
    output: number; // $ per 1M tokens
  };
  category: "flagship" | "fast" | "reasoning" | "vision" | "coding" | "free";
  isNew?: boolean;
  isRecommended?: boolean;
}

// Предустановленные модели (наиболее популярные)
export const OPENROUTER_MODELS: OpenRouterModelConfig[] = [
  // === FLAGSHIP MODELS ===
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "Мультимодальная флагманская модель OpenAI",
    provider: "OpenAI",
    contextLength: 128000,
    maxOutput: 16384,
    features: { vision: true, tools: true, streaming: true },
    pricing: { input: 2.5, output: 10 },
    category: "flagship",
    isRecommended: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "Умная и быстрая модель от Anthropic",
    provider: "Anthropic",
    contextLength: 200000,
    maxOutput: 8192,
    features: { vision: true, tools: true, streaming: true },
    pricing: { input: 3, output: 15 },
    category: "flagship",
    isRecommended: true,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    description: "Быстрая мультимодальная модель Google",
    provider: "Google",
    contextLength: 1000000,
    maxOutput: 8192,
    features: { vision: true, tools: true, streaming: true },
    pricing: { input: 0.1, output: 0.4 },
    category: "flagship",
    isNew: true,
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    description: "Мощная open-source модель для чата",
    provider: "DeepSeek",
    contextLength: 64000,
    maxOutput: 8192,
    features: { tools: true, streaming: true },
    pricing: { input: 0.14, output: 0.28 },
    category: "flagship",
    isNew: true,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    description: "Open-source модель от Meta",
    provider: "Meta",
    contextLength: 131072,
    maxOutput: 8192,
    features: { tools: true, streaming: true },
    pricing: { input: 0.12, output: 0.3 },
    category: "flagship",
  },

  // === REASONING MODELS ===
  {
    id: "openai/o1",
    name: "O1",
    description: "Модель с глубоким мышлением для сложных задач",
    provider: "OpenAI",
    contextLength: 200000,
    maxOutput: 100000,
    features: { reasoning: true, streaming: true },
    pricing: { input: 15, output: 60 },
    category: "reasoning",
  },
  {
    id: "openai/o1-mini",
    name: "O1 Mini",
    description: "Компактная модель с reasoning",
    provider: "OpenAI",
    contextLength: 128000,
    maxOutput: 65536,
    features: { reasoning: true, streaming: true },
    pricing: { input: 3, output: 12 },
    category: "reasoning",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "Open-source модель с reasoning",
    provider: "DeepSeek",
    contextLength: 64000,
    maxOutput: 8192,
    features: { reasoning: true, streaming: true },
    pricing: { input: 0.55, output: 2.19 },
    category: "reasoning",
    isNew: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet:thinking",
    name: "Claude 3.5 Sonnet (Thinking)",
    description: "Claude с расширенным reasoning",
    provider: "Anthropic",
    contextLength: 200000,
    maxOutput: 16000,
    features: { reasoning: true, tools: true, streaming: true },
    pricing: { input: 3, output: 15 },
    category: "reasoning",
  },

  // === FAST & CHEAP MODELS ===
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Быстрая и доступная модель OpenAI",
    provider: "OpenAI",
    contextLength: 128000,
    maxOutput: 16384,
    features: { vision: true, tools: true, streaming: true },
    pricing: { input: 0.15, output: 0.6 },
    category: "fast",
    isRecommended: true,
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    description: "Сверхбыстрая модель Anthropic",
    provider: "Anthropic",
    contextLength: 200000,
    maxOutput: 4096,
    features: { vision: true, tools: true, streaming: true },
    pricing: { input: 0.25, output: 1.25 },
    category: "fast",
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini 1.5 Flash",
    description: "Быстрая модель Google",
    provider: "Google",
    contextLength: 1000000,
    maxOutput: 8192,
    features: { vision: true, tools: true, streaming: true },
    pricing: { input: 0.075, output: 0.3 },
    category: "fast",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    description: "Лёгкая open-source модель",
    provider: "Meta",
    contextLength: 131072,
    maxOutput: 8192,
    features: { streaming: true },
    pricing: { input: 0.02, output: 0.05 },
    category: "fast",
  },
  {
    id: "mistralai/mistral-7b-instruct",
    name: "Mistral 7B",
    description: "Компактная модель Mistral",
    provider: "Mistral",
    contextLength: 32768,
    maxOutput: 8192,
    features: { streaming: true },
    pricing: { input: 0.03, output: 0.055 },
    category: "fast",
  },

  // === VISION MODELS ===
  {
    id: "openai/gpt-4-vision-preview",
    name: "GPT-4 Vision",
    description: "Специализированная vision модель",
    provider: "OpenAI",
    contextLength: 128000,
    maxOutput: 4096,
    features: { vision: true, streaming: true },
    pricing: { input: 10, output: 30 },
    category: "vision",
  },
  {
    id: "google/gemini-pro-vision",
    name: "Gemini Pro Vision",
    description: "Vision модель от Google",
    provider: "Google",
    contextLength: 65536,
    maxOutput: 8192,
    features: { vision: true, streaming: true },
    pricing: { input: 0.125, output: 0.375 },
    category: "vision",
  },

  // === CODING MODELS ===
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 (Coding)",
    description: "Лучшая модель для программирования",
    provider: "Anthropic",
    contextLength: 200000,
    maxOutput: 8192,
    features: { tools: true, streaming: true },
    pricing: { input: 3, output: 15 },
    category: "coding",
  },
  {
    id: "deepseek/deepseek-coder",
    name: "DeepSeek Coder",
    description: "Специализированная coding модель",
    provider: "DeepSeek",
    contextLength: 64000,
    maxOutput: 8192,
    features: { streaming: true },
    pricing: { input: 0.14, output: 0.28 },
    category: "coding",
  },
  {
    id: "codellama/codellama-70b-instruct",
    name: "Code Llama 70B",
    description: "Open-source coding модель от Meta",
    provider: "Meta",
    contextLength: 16384,
    maxOutput: 4096,
    features: { streaming: true },
    pricing: { input: 0.4, output: 0.4 },
    category: "coding",
  },

  // === FREE MODELS ===
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B (Free)",
    description: "Бесплатная модель от Google",
    provider: "Google",
    contextLength: 8192,
    maxOutput: 4096,
    features: { streaming: true },
    pricing: { input: 0, output: 0 },
    category: "free",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B (Free)",
    description: "Бесплатная лёгкая модель Meta",
    provider: "Meta",
    contextLength: 131072,
    maxOutput: 8192,
    features: { streaming: true },
    pricing: { input: 0, output: 0 },
    category: "free",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B (Free)",
    description: "Бесплатная модель Mistral",
    provider: "Mistral",
    contextLength: 32768,
    maxOutput: 8192,
    features: { streaming: true },
    pricing: { input: 0, output: 0 },
    category: "free",
  },
  {
    id: "qwen/qwen-2-7b-instruct:free",
    name: "Qwen 2 7B (Free)",
    description: "Бесплатная модель от Alibaba",
    provider: "Alibaba",
    contextLength: 32768,
    maxOutput: 4096,
    features: { streaming: true },
    pricing: { input: 0, output: 0 },
    category: "free",
  },
];

// Категории моделей
export const MODEL_CATEGORIES = {
  flagship: { name: "Флагманские", icon: "✨", description: "Лучшие модели для любых задач" },
  fast: { name: "Быстрые", icon: "⚡", description: "Высокая скорость, низкая цена" },
  reasoning: { name: "Reasoning", icon: "🧠", description: "Глубокое мышление и анализ" },
  vision: { name: "Vision", icon: "👁️", description: "Анализ изображений" },
  coding: { name: "Код", icon: "💻", description: "Специализированные для программирования" },
  free: { name: "Бесплатные", icon: "🆓", description: "Без оплаты" },
} as const;

export type ModelCategory = keyof typeof MODEL_CATEGORIES;

/**
 * Получить модель по ID
 */
export function getModelById(id: string): OpenRouterModelConfig | undefined {
  return OPENROUTER_MODELS.find(m => m.id === id);
}

/**
 * Получить модели по категории
 */
export function getModelsByCategory(category: ModelCategory): OpenRouterModelConfig[] {
  return OPENROUTER_MODELS.filter(m => m.category === category);
}

/**
 * Получить рекомендуемые модели
 */
export function getRecommendedModels(): OpenRouterModelConfig[] {
  return OPENROUTER_MODELS.filter(m => m.isRecommended);
}

/**
 * Получить модели с поддержкой tools
 */
export function getToolsModels(): OpenRouterModelConfig[] {
  return OPENROUTER_MODELS.filter(m => m.features.tools);
}

/**
 * Получить модели с vision
 */
export function getVisionModels(): OpenRouterModelConfig[] {
  return OPENROUTER_MODELS.filter(m => m.features.vision);
}

/**
 * Модель по умолчанию
 */
export const DEFAULT_MODEL = "openai/gpt-4o-mini";

/**
 * Получить модель по умолчанию
 */
export function getDefaultModel(): OpenRouterModelConfig {
  return getModelById(DEFAULT_MODEL) || OPENROUTER_MODELS[0];
}

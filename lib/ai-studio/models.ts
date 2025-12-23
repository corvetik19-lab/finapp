/**
 * AI Studio Models Configuration
 * Конфигурация моделей через OpenRouter API
 * Документация: https://openrouter.ai/docs
 * 
 * Для генерации изображений, видео и аудио используйте Kie.ai
 */

// Re-export OpenRouter models
export { 
  OPENROUTER_MODELS,
  MODEL_CATEGORIES,
  getModelById,
  getModelsByCategory,
  getRecommendedModels,
  getToolsModels,
  getVisionModels,
  getDefaultModel,
  DEFAULT_MODEL,
  type OpenRouterModelConfig,
  type ModelCategory,
} from "./openrouter/models";

/**
 * AI Studio - Интеграция с OpenRouter (400+ моделей)
 */

// Access control
export {
  isSuperAdmin,
  hasAIStudioAccess,
  getAIStudioAccessInfo,
  grantAIStudioAccess,
  revokeAIStudioAccess,
  getAllAIStudioAccess,
  logAIStudioUsage,
} from "./access";

// OpenRouter models configuration
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
} from "./models";

// OpenRouter client
export {
  chatCompletion,
  streamChatCompletion,
  getModels,
  checkApiKey,
  createTool,
} from "./openrouter/client";

// Types
export type {
  AIStudioModel,
  AIStudioFeature,
  ChatMessage,
  GenerationConfig,
  ThinkingLevel,
} from "./types";

export type {
  OpenRouterModelConfig,
  ModelCategory,
} from "./openrouter/models";

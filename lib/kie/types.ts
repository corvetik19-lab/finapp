/**
 * Kie.ai API Types
 */

import { KieTaskState } from "./constants";

// ==================== Base Types ====================

export interface KieApiResponse<T = unknown> {
  code: number;
  msg?: string;
  message?: string;
  data: T;
}

export interface KieCreateTaskResponse {
  taskId: string;
  recordId?: string;
}

export interface KieTaskStatusData {
  taskId: string;
  model: string;
  state: KieTaskState;
  param: string;
  resultJson: string;
  failCode: string;
  failMsg: string;
  completeTime: number;
  createTime: number;
  updateTime: number;
}

export interface KieTaskResult {
  resultUrls?: string[];
  videoUrl?: string;
  audioUrl?: string;
  [key: string]: unknown;
}

// ==================== Model Categories ====================

export type KieModelCategory = "image" | "video" | "audio";

export type KieImageModelType = 
  | "text-to-image" 
  | "image-edit" 
  | "upscale" 
  | "background-removal"
  | "character"
  | "reframe";

export type KieVideoModelType = 
  | "text-to-video" 
  | "image-to-video"
  | "video-modify";

export type KieAudioModelType = 
  | "text-to-speech"
  | "text-to-music"
  | "lyrics-generation"
  | "music-extend"
  | "music-cover"
  | "vocal-separation";

// ==================== Model Definition ====================

export interface KieModel {
  id: string;
  name: string;
  nameRu: string;
  category: KieModelCategory;
  type: KieImageModelType | KieVideoModelType | KieAudioModelType;
  description: string;
  descriptionRu: string;
  modelId: string;
  icon?: string;
  inputFields: KieInputField[];
  defaultValues?: Record<string, unknown>;
}

export interface KieInputField {
  name: string;
  label: string;
  labelRu: string;
  type: "text" | "textarea" | "number" | "select" | "file" | "checkbox" | "slider";
  required: boolean;
  placeholder?: string;
  placeholderRu?: string;
  options?: { value: string; label: string; labelRu: string }[];
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
  accept?: string; // для file input (например "audio/*", "video/*", "image/*")
}

// ==================== Image Model Inputs ====================

export interface GoogleImagen4Input {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: string;
  num_images?: string;
  seed?: string;
}

export interface GoogleNanoBananaProInput {
  prompt: string;
  aspect_ratio?: string;
  num_images?: string;
}

export interface GoogleNanoBananaEditInput {
  prompt: string;
  image_url: string;
}

export interface Flux2ProInput {
  prompt: string;
  aspect_ratio?: string;
  guidance_scale?: number;
}

export interface TopazUpscaleInput {
  image_url: string;
  scale?: number;
}

export interface RecraftUpscaleInput {
  image_url: string;
}

export interface RecraftRemoveBgInput {
  image_url: string;
}

export interface IdeogramV3Input {
  prompt: string;
  rendering_speed?: "BALANCED" | "FAST" | "QUALITY";
  style?: string;
  expand_prompt?: boolean;
  image_size?: string;
  num_images?: string;
  negative_prompt?: string;
}

export interface IdeogramReframeInput {
  prompt: string;
  image_url: string;
  aspect_ratio?: string;
}

export interface IdeogramCharacterInput {
  prompt: string;
  character_description?: string;
}

export interface IdeogramCharacterEditInput {
  prompt: string;
  image_url: string;
}

export interface SeedreamInput {
  prompt: string;
  image_size?: string;
  guidance_scale?: number;
  enable_safety_checker?: boolean;
}

// ==================== Video Model Inputs ====================

export interface Sora2TextToVideoInput {
  prompt: string;
  aspect_ratio?: "landscape" | "portrait" | "square";
  n_frames?: string;
  size?: "high" | "medium" | "low";
  remove_watermark?: boolean;
}

export interface Sora2ImageToVideoInput {
  prompt: string;
  image_url: string;
  aspect_ratio?: string;
}

export interface KlingV2Input {
  prompt: string;
  image_url?: string;
  duration?: string;
  negative_prompt?: string;
  cfg_scale?: number;
  tail_image_url?: string;
}

export interface HailuoImageToVideoInput {
  prompt: string;
  image_url: string;
  duration?: string;
  resolution?: "768P" | "1080P";
}

export interface HailuoTextToVideoInput {
  prompt: string;
  duration?: string;
  resolution?: "768P" | "1080P";
}

// ==================== Audio Model Inputs ====================

export interface ElevenLabsTTSInput {
  text: string;
  voice?: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  timestamps?: boolean;
  previous_text?: string;
  next_text?: string;
  language_code?: string;
}

// ==================== Generic Create Task Request ====================

export interface KieCreateTaskRequest {
  model: string;
  callBackUrl?: string;
  input: Record<string, unknown>;
}

// ==================== UI Types ====================

export interface KieTask {
  id: string;
  userId: string;
  taskId: string;
  model: string;
  modelName: string;
  category: KieModelCategory;
  status: KieTaskState;
  input: Record<string, unknown>;
  resultUrls?: string[];
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface KieTaskListFilters {
  category?: KieModelCategory;
  status?: KieTaskState;
  search?: string;
}

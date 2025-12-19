/**
 * Kie.ai API Constants
 */

export const KIE_API_BASE_URL = "https://api.kie.ai/api/v1";

export const KIE_ENDPOINTS = {
  CREATE_TASK: "/jobs/createTask",
  GET_TASK_STATUS: "/jobs/recordInfo",
  UPLOAD_FILE: "/upload/file",
  GET_CREDITS: "/chat/credit",
} as const;

// File Upload API endpoints (different base URL)
export const KIE_FILE_UPLOAD_BASE_URL = "https://kieai.redpandaai.co/api";
export const KIE_FILE_UPLOAD_ENDPOINTS = {
  FILE_STREAM: "/file-stream-upload",
  FILE_BASE64: "/file-base64-upload",
  FILE_URL: "/file-url-upload",
} as const;

export const KIE_TASK_STATES = {
  WAITING: "waiting",
  QUEUING: "queuing",
  GENERATING: "generating",
  SUCCESS: "success",
  FAIL: "fail",
} as const;

export type KieTaskState = (typeof KIE_TASK_STATES)[keyof typeof KIE_TASK_STATES];

export const POLLING_INTERVALS = {
  INITIAL: 2000,      // 2 секунды первые 30 сек
  MEDIUM: 5000,       // 5 секунд после 30 сек
  LONG: 15000,        // 15 секунд после 2 минут
  MAX_DURATION: 600000, // 10 минут максимум
} as const;

export const ASPECT_RATIOS = {
  SQUARE: "1:1",
  LANDSCAPE: "16:9",
  PORTRAIT: "9:16",
  WIDE: "21:9",
  STANDARD: "4:3",
  PHOTO: "3:2",
} as const;

export const IMAGE_SIZES = {
  SQUARE_HD: "square_hd",
  LANDSCAPE_16_9: "landscape_16_9",
  PORTRAIT_9_16: "portrait_9_16",
  LANDSCAPE_4_3: "landscape_4_3",
  PORTRAIT_3_4: "portrait_3_4",
} as const;

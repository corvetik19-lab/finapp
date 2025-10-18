/**
 * Типы для AI чатов
 * Отдельный файл чтобы можно было импортировать в клиентских компонентах
 */

export type AiChat = {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  chat_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

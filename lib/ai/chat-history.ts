import { createRouteClient } from "@/lib/supabase/helpers";
import type { AiChat, AiMessage } from "./chat-types";

export type { AiChat, AiMessage };

/**
 * Получить список чатов пользователя
 */
export async function getUserChats(): Promise<AiChat[]> {
  const supabase = await createRouteClient();
  
  const { data, error } = await supabase
    .from("ai_chats")
    .select("*")
    .is("deleted_at", null) // Исключаем мягко удаленные чаты
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching chats:", error);
    return [];
  }

  return data || [];
}

/**
 * Получить сообщения конкретного чата
 */
export async function getChatMessages(chatId: string): Promise<AiMessage[]> {
  const supabase = await createRouteClient();
  
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data || [];
}

/**
 * Создать новый чат
 */
export async function createChat(model: string = "openai/gpt-4o-mini"): Promise<string | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_chats")
    .insert({
      user_id: user.id,
      title: "Новый чат",
      model,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating chat:", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Сохранить сообщение в чат
 */
export async function saveMessage(
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("ai_messages")
    .insert({
      chat_id: chatId,
      user_id: user.id,
      role,
      content,
    });

  if (error) {
    console.error("Error saving message:", error);
    return false;
  }

  return true;
}

/**
 * Обновить название чата (из первого сообщения)
 */
export async function updateChatTitle(chatId: string, title: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { error } = await supabase
    .from("ai_chats")
    .update({ title: title.slice(0, 100) }) // Ограничиваем 100 символами
    .eq("id", chatId);

  if (error) {
    console.error("Error updating chat title:", error);
    return false;
  }

  return true;
}

/**
 * Удалить чат (полное удаление)
 * Сообщения удалятся автоматически благодаря ON DELETE CASCADE
 */
export async function deleteChat(chatId: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("id", chatId);

  if (error) {
    console.error("Error deleting chat:", error);
    return false;
  }

  return true;
}

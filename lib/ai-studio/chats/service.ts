"use server";

import { createRouteClient } from "@/lib/supabase/server";

export interface AIChat {
  id: string;
  user_id: string;
  assistant_id: string | null;
  title: string | null;
  model: string;
  settings: Record<string, unknown>;
  message_count: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments: Array<{ type: string; url: string; name?: string }>;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  finish_reason: string | null;
  grounding_metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateChatInput {
  assistant_id?: string;
  title?: string;
  model?: string;
}

export interface CreateMessageInput {
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Array<{ type: string; url: string; name?: string }>;
  model?: string;
  tokens_input?: number;
  tokens_output?: number;
  finish_reason?: string;
  grounding_metadata?: Record<string, unknown>;
}

export async function getChats(): Promise<AIChat[]> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching chats:", error);
    return [];
  }

  return data || [];
}

export async function getChatById(id: string): Promise<AIChat | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_chats")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching chat:", error);
    return null;
  }

  return data;
}

export async function createChat(input: CreateChatInput): Promise<AIChat | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_chats")
    .insert({
      user_id: user.id,
      assistant_id: input.assistant_id || null,
      title: input.title || null,
      model: input.model || "gemini-2.5-flash",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating chat:", error);
    return null;
  }

  return data;
}

export async function updateChat(id: string, title: string): Promise<AIChat | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_chats")
    .update({ 
      title, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating chat:", error);
    return null;
  }

  return data;
}

export async function deleteChat(id: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Сначала удаляем сообщения чата
  const { error: messagesError } = await supabase
    .from("ai_messages")
    .delete()
    .eq("chat_id", id);

  if (messagesError) {
    console.error("Error deleting messages:", messagesError);
  }

  // Затем удаляем сам чат
  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting chat:", error);
    return false;
  }

  return true;
}

export async function getMessages(chatId: string): Promise<AIMessage[]> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Verify chat ownership
  const { data: chat } = await supabase
    .from("ai_chats")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single();

  if (!chat) return [];

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

export async function createMessage(input: CreateMessageInput): Promise<AIMessage | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify chat ownership
  const { data: chat } = await supabase
    .from("ai_chats")
    .select("id")
    .eq("id", input.chat_id)
    .eq("user_id", user.id)
    .single();

  if (!chat) return null;

  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      chat_id: input.chat_id,
      user_id: user.id,
      role: input.role,
      content: input.content,
      attachments: input.attachments || [],
      model: input.model || null,
      tokens_input: input.tokens_input || null,
      tokens_output: input.tokens_output || null,
      finish_reason: input.finish_reason || null,
      grounding_metadata: input.grounding_metadata || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating message:", error);
    return null;
  }

  return data;
}

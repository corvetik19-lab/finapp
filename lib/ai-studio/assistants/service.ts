"use server";

import { createRouteClient } from "@/lib/supabase/server";

export interface AIAssistant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  avatar_url: string | null;
  emoji: string | null;
  model: string;
  color: string;
  is_public: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

export interface CreateAssistantInput {
  name: string;
  description?: string;
  system_prompt: string;
  emoji?: string;
  model?: string;
  color?: string;
  is_public?: boolean;
}

export interface UpdateAssistantInput {
  name?: string;
  description?: string;
  system_prompt?: string;
  emoji?: string;
  model?: string;
  color?: string;
  is_public?: boolean;
}

export async function getAssistants(): Promise<AIAssistant[]> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: assistants, error } = await supabase
    .from("ai_assistants")
    .select("*")
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching assistants:", error);
    return [];
  }

  // Получаем избранные
  const { data: favorites } = await supabase
    .from("ai_assistant_favorites")
    .select("assistant_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set(favorites?.map(f => f.assistant_id) || []);

  return (assistants || []).map(a => ({
    ...a,
    is_favorite: favoriteIds.has(a.id)
  }));
}

export async function getAssistantById(id: string): Promise<AIAssistant | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_assistants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching assistant:", error);
    return null;
  }

  // Проверяем избранное
  const { data: favorite } = await supabase
    .from("ai_assistant_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("assistant_id", id)
    .single();

  return {
    ...data,
    is_favorite: !!favorite
  };
}

export async function createAssistant(input: CreateAssistantInput): Promise<AIAssistant | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_assistants")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description || null,
      system_prompt: input.system_prompt,
      emoji: input.emoji || null,
      model: input.model || "gemini-2.5-flash",
      color: input.color || "#ff6b35",
      is_public: input.is_public || false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating assistant:", error);
    return null;
  }

  return data;
}

export async function updateAssistant(id: string, input: UpdateAssistantInput): Promise<AIAssistant | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_assistants")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating assistant:", error);
    return null;
  }

  return data;
}

export async function deleteAssistant(id: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("ai_assistants")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting assistant:", error);
    return false;
  }

  return true;
}

export async function toggleFavorite(assistantId: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Проверяем, есть ли уже в избранном
  const { data: existing } = await supabase
    .from("ai_assistant_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("assistant_id", assistantId)
    .single();

  if (existing) {
    // Удаляем из избранного
    const { error } = await supabase
      .from("ai_assistant_favorites")
      .delete()
      .eq("id", existing.id);

    return !error;
  } else {
    // Добавляем в избранное
    const { error } = await supabase
      .from("ai_assistant_favorites")
      .insert({
        user_id: user.id,
        assistant_id: assistantId,
      });

    return !error;
  }
}

export async function getDefaultAssistants(): Promise<AIAssistant[]> {
  const supabase = await createRouteClient();

  const { data, error } = await supabase
    .from("ai_assistants")
    .select("*")
    .eq("is_default", true)
    .eq("is_public", true);

  if (error) {
    console.error("Error fetching default assistants:", error);
    return [];
  }

  return data || [];
}

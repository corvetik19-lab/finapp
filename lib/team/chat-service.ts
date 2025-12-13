import type { ChatRoom, ChatMessage, ChatParticipant } from "./types";

// Chat Rooms
export async function getChatRooms(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  companyId: string
): Promise<ChatRoom[]> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      participants:chat_participants(
        user_id,
        role,
        last_read_at
      )
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getChatRoom(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  roomId: string
): Promise<ChatRoom | null> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      participants:chat_participants(*)
    `)
    .eq("id", roomId)
    .single();

  if (error) throw error;
  return data;
}

export async function createChatRoom(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  room: Partial<ChatRoom>
): Promise<ChatRoom> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .insert(room)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Messages
export async function getChatMessages(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  roomId: string,
  limit = 50,
  before?: string
): Promise<ChatMessage[]> {
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).reverse();
}

export async function sendMessage(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  message: Partial<ChatMessage>
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMessage(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  messageId: string,
  content: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from("chat_messages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMessage(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  messageId: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) throw error;
}

// Participants
export async function addParticipant(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  roomId: string,
  userId: string,
  role: "admin" | "member" = "member"
): Promise<ChatParticipant> {
  const { data, error } = await supabase
    .from("chat_participants")
    .insert({
      room_id: roomId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLastRead(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  roomId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw error;
}

// Unread count
export async function getUnreadCount(
  supabase: ReturnType<typeof import("@/lib/supabase/client").getSupabaseClient>,
  roomId: string,
  userId: string
): Promise<number> {
  const { data: participant } = await supabase
    .from("chat_participants")
    .select("last_read_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .single();

  if (!participant) return 0;

  const { count, error } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .gt("created_at", participant.last_read_at || "1970-01-01");

  if (error) return 0;
  return count || 0;
}

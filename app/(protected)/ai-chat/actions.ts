"use server";

import {
  getUserChats,
  getChatMessages,
  createChat,
  saveMessage,
  updateChatTitle,
  deleteChat,
} from "@/lib/ai/chat-history";
import type { AiChat, AiMessage } from "@/lib/ai/chat-types";

export async function getChatsAction(): Promise<AiChat[]> {
  return await getUserChats();
}

export async function getChatMessagesAction(chatId: string): Promise<AiMessage[]> {
  return await getChatMessages(chatId);
}

export async function createChatAction(model?: string): Promise<string | null> {
  return await createChat(model);
}

export async function saveMessageAction(
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<boolean> {
  return await saveMessage(chatId, role, content);
}

export async function updateChatTitleAction(
  chatId: string,
  title: string
): Promise<boolean> {
  return await updateChatTitle(chatId, title);
}

export async function deleteChatAction(chatId: string): Promise<boolean> {
  return await deleteChat(chatId);
}

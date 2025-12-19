import { NextRequest, NextResponse } from "next/server";
import { getChats, createChat } from "@/lib/ai-studio/chats/service";

export async function GET() {
  try {
    const chats = await getChats();
    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error getting chats:", error);
    return NextResponse.json({ error: "Failed to get chats" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chat = await createChat(body);
    
    if (!chat) {
      return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
    }

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}

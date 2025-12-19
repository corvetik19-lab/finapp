import { NextRequest, NextResponse } from "next/server";
import { getChatById, updateChat, deleteChat } from "@/lib/ai-studio/chats/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chat = await getChatById(id);
    
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error getting chat:", error);
    return NextResponse.json({ error: "Failed to get chat" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const chat = await updateChat(id, body.title);
    
    if (!chat) {
      return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json({ error: "Failed to update chat" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteChat(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}

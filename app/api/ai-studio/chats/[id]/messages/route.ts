import { NextRequest, NextResponse } from "next/server";
import { getMessages, createMessage } from "@/lib/ai-studio/chats/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = await getMessages(id);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    return NextResponse.json({ error: "Failed to get messages" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.content || !body.role) {
      return NextResponse.json(
        { error: "Content and role are required" },
        { status: 400 }
      );
    }

    const message = await createMessage({
      chat_id: id,
      role: body.role,
      content: body.content,
      attachments: body.attachments,
      model: body.model,
      tokens_input: body.tokens_input,
      tokens_output: body.tokens_output,
      finish_reason: body.finish_reason,
      grounding_metadata: body.grounding_metadata,
    });
    
    if (!message) {
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { 
  getAssistantById, 
  updateAssistant, 
  deleteAssistant 
} from "@/lib/ai-studio/assistants/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assistant = await getAssistantById(id);
    
    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }

    return NextResponse.json(assistant);
  } catch (error) {
    console.error("Error getting assistant:", error);
    return NextResponse.json({ error: "Failed to get assistant" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const assistant = await updateAssistant(id, body);
    
    if (!assistant) {
      return NextResponse.json({ error: "Failed to update assistant" }, { status: 500 });
    }

    return NextResponse.json(assistant);
  } catch (error) {
    console.error("Error updating assistant:", error);
    return NextResponse.json({ error: "Failed to update assistant" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteAssistant(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete assistant" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assistant:", error);
    return NextResponse.json({ error: "Failed to delete assistant" }, { status: 500 });
  }
}

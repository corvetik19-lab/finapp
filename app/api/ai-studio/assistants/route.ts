import { NextRequest, NextResponse } from "next/server";
import { 
  getAssistants, 
  createAssistant 
} from "@/lib/ai-studio/assistants/service";

export async function GET() {
  try {
    const assistants = await getAssistants();
    return NextResponse.json(assistants);
  } catch (error) {
    console.error("Error getting assistants:", error);
    return NextResponse.json({ error: "Failed to get assistants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.system_prompt) {
      return NextResponse.json(
        { error: "Name and system_prompt are required" },
        { status: 400 }
      );
    }

    const assistant = await createAssistant(body);
    
    if (!assistant) {
      return NextResponse.json(
        { error: "Failed to create assistant" },
        { status: 500 }
      );
    }

    return NextResponse.json(assistant, { status: 201 });
  } catch (error) {
    console.error("Error creating assistant:", error);
    return NextResponse.json({ error: "Failed to create assistant" }, { status: 500 });
  }
}

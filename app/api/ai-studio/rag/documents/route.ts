import { NextRequest, NextResponse } from "next/server";
import { getRAGDocuments, createRAGDocument } from "@/lib/ai-studio/rag/service";

export async function GET() {
  try {
    const documents = await getRAGDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error getting RAG documents:", error);
    return NextResponse.json({ error: "Failed to get documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || !body.file_path) {
      return NextResponse.json(
        { error: "Name and file_path are required" },
        { status: 400 }
      );
    }

    const document = await createRAGDocument(body);
    
    if (!document) {
      return NextResponse.json(
        { error: "Failed to create document" },
        { status: 500 }
      );
    }

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating RAG document:", error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

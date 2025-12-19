import { NextRequest, NextResponse } from "next/server";
import { searchRAGDocuments } from "@/lib/ai-studio/rag/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const results = await searchRAGDocuments(body.query, body.documentIds);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching RAG documents:", error);
    return NextResponse.json({ error: "Failed to search documents" }, { status: 500 });
  }
}

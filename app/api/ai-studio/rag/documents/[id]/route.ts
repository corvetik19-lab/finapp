import { NextRequest, NextResponse } from "next/server";
import { getRAGDocumentById, deleteRAGDocument } from "@/lib/ai-studio/rag/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await getRAGDocumentById(id);
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error getting RAG document:", error);
    return NextResponse.json({ error: "Failed to get document" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteRAGDocument(id);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting RAG document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

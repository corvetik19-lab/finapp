import { NextRequest, NextResponse } from "next/server";
import { getTenderDocuments, createDocumentFromTender } from "@/lib/accounting/tender-integration";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  const { tenderId } = await params;

  try {
    const documents = await getTenderDocuments(tenderId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching tender documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenderId: string }> }
) {
  const { tenderId } = await params;

  try {
    const body = await request.json();
    const { documentType, documentDate, documentNumber } = body;

    const result = await createDocumentFromTender({
      tenderId,
      documentType,
      documentDate,
      documentNumber,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ documentId: result.documentId });
  } catch (error) {
    console.error("Error creating document from tender:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

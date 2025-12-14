import { NextRequest, NextResponse } from "next/server";
import {
  createDocument,
  getNextDocumentNumber,
  DocumentFormType,
  DocumentFormData,
} from "@/lib/accounting/document-forms-service";
import { getCounterparties, getDocuments } from "@/lib/accounting/service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "list";

  try {
    switch (action) {
      case "list": {
        const documents = await getDocuments();
        return NextResponse.json({ documents });
      }

      case "nextNumber": {
        const documentType = searchParams.get("type") as DocumentFormType;
        if (!documentType) {
          return NextResponse.json({ error: "type is required" }, { status: 400 });
        }
        const nextNumber = await getNextDocumentNumber(documentType);
        return NextResponse.json({ nextNumber });
      }

      case "counterparties": {
        const counterparties = await getCounterparties();
        return NextResponse.json({
          counterparties: counterparties.map(c => ({
            id: c.id,
            name: c.name,
            inn: c.inn,
          })),
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in documents API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body as DocumentFormData;

    if (!data.documentType || !data.documentNumber || !data.documentDate) {
      return NextResponse.json(
        { error: "documentType, documentNumber, and documentDate are required" },
        { status: 400 }
      );
    }

    const result = await createDocument(data);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ documentId: result.documentId });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

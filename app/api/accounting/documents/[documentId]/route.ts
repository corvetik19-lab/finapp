import { NextRequest, NextResponse } from "next/server";
import {
  updateDocument,
  updateDocumentStatus,
  copyDocument,
  getDocumentForForm,
  DocumentStatus,
} from "@/lib/accounting/document-forms-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  try {
    const document = await getDocumentForForm(documentId);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "updateStatus": {
        const { status, paymentDate } = body;

        if (!status) {
          return NextResponse.json({ error: "status is required" }, { status: 400 });
        }

        const result = await updateDocumentStatus(
          documentId,
          status as DocumentStatus,
          paymentDate
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case "update": {
        const result = await updateDocument(documentId, body.data);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case "copy": {
        const { newDocumentNumber } = body;
        const result = await copyDocument(documentId, newDocumentNumber);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ newDocumentId: result.newDocumentId });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

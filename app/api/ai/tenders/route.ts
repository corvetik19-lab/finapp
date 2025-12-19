/**
 * API для AI анализа тендеров
 */

import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";
import { extractAndSaveFromDocument } from "@/lib/ai/entity-extractor";
import { 
  answerWithGraphRAG, 
  checkCompliance, 
  analyzeRisks,
  generateTenderSummary 
} from "@/lib/ai/graph-rag";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "process-document": {
        const { documentId } = params;
        if (!documentId) {
          return NextResponse.json({ error: "documentId required" }, { status: 400 });
        }
        
        // Получаем документ
        const { data: doc } = await supabase
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .eq("user_id", user.id)
          .single();

        if (!doc) {
          return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Извлекаем сущности из документа
        const result = await extractAndSaveFromDocument(
          documentId,
          user.id,
          doc.company_id || undefined
        );

        return NextResponse.json(result);
      }

      case "document-status": {
        const { documentId } = params;
        if (!documentId) {
          return NextResponse.json({ error: "documentId required" }, { status: 400 });
        }

        // Получаем статус документа из БД
        const { data: doc } = await supabase
          .from("documents")
          .select("status, chunks_count, processing_error")
          .eq("id", documentId)
          .eq("user_id", user.id)
          .single();

        if (!doc) {
          return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        return NextResponse.json({
          status: doc.status,
          chunksCount: doc.chunks_count,
          error: doc.processing_error,
        });
      }

      case "analyze-tender": {
        const { tenderId, query } = params;
        if (!tenderId) {
          return NextResponse.json({ error: "tenderId required" }, { status: 400 });
        }

        const analysis = await answerWithGraphRAG(
          query || "Проанализируй требования тендера",
          user.id,
          { tenderId }
        );
        return NextResponse.json({ analysis });
      }

      case "check-compliance": {
        const { tenderId, supplierId } = params;
        if (!tenderId || !supplierId) {
          return NextResponse.json({ error: "tenderId and supplierId required" }, { status: 400 });
        }

        const compliance = await checkCompliance(tenderId, supplierId, user.id);
        return NextResponse.json(compliance);
      }

      case "analyze-risks": {
        const { tenderId } = params;
        if (!tenderId) {
          return NextResponse.json({ error: "tenderId required" }, { status: 400 });
        }

        const risks = await analyzeRisks(tenderId, user.id);
        return NextResponse.json(risks);
      }

      case "generate-summary": {
        const { tenderId } = params;
        if (!tenderId) {
          return NextResponse.json({ error: "tenderId required" }, { status: 400 });
        }

        const summary = await generateTenderSummary(tenderId, user.id);
        return NextResponse.json({ summary });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Tender AI API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get("tenderId");
    const action = searchParams.get("action");

    if (!tenderId) {
      return NextResponse.json({ error: "tenderId required" }, { status: 400 });
    }

    switch (action) {
      case "documents": {
        // Получаем документы тендера
        const { data: documents } = await supabase
          .from("documents")
          .select("id, file_name, status, chunks_count, created_at")
          .eq("tender_id", tenderId)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        return NextResponse.json({ documents: documents || [] });
      }

      case "entities": {
        // Получаем сущности связанные с тендером
        const { data: documents } = await supabase
          .from("documents")
          .select("id")
          .eq("tender_id", tenderId)
          .eq("user_id", user.id);

        if (!documents || documents.length === 0) {
          return NextResponse.json({ entities: [] });
        }

        const docIds = documents.map(d => d.id);

        // Получаем сущности через relations
        const { data: relations } = await supabase
          .from("relations")
          .select(`
            from_entity_id,
            to_entity_id,
            rel_type,
            entities!relations_from_entity_id_fkey(id, entity_type, name, data)
          `)
          .eq("user_id", user.id)
          .in("source_document_id", docIds);

        const entities = new Map<string, { id: string; entity_type: string; name: string; data: unknown }>();
        relations?.forEach(r => {
          if (r.entities && Array.isArray(r.entities)) {
            r.entities.forEach((e: { id: string; entity_type: string; name: string; data: unknown }) => {
              entities.set(e.id, e);
            });
          } else if (r.entities) {
            const e = r.entities as unknown as { id: string; entity_type: string; name: string; data: unknown };
            entities.set(e.id, e);
          }
        });

        return NextResponse.json({ entities: Array.from(entities.values()) });
      }

      case "summaries": {
        // Получаем AI саммари
        const { data: summaries } = await supabase
          .from("ai_summaries")
          .select("*")
          .eq("tender_id", tenderId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        return NextResponse.json({ summaries: summaries || [] });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Tender AI API GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

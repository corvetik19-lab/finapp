"use server";

import { createRouteClient } from "@/lib/supabase/server";

export interface RAGDocument {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  corpus_id: string | null;
  rag_file_id: string | null;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateRAGDocumentInput {
  name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  metadata?: Record<string, unknown>;
}

// Получить все RAG документы пользователя
export async function getRAGDocuments(): Promise<RAGDocument[]> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_rag_documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching RAG documents:", error);
    return [];
  }

  return data || [];
}

// Получить документ по ID
export async function getRAGDocumentById(id: string): Promise<RAGDocument | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_rag_documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching RAG document:", error);
    return null;
  }

  return data;
}

// Создать новый RAG документ
export async function createRAGDocument(input: CreateRAGDocumentInput): Promise<RAGDocument | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_rag_documents")
    .insert({
      user_id: user.id,
      name: input.name,
      file_path: input.file_path,
      file_type: input.file_type || null,
      file_size: input.file_size || null,
      metadata: input.metadata || {},
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating RAG document:", error);
    return null;
  }

  return data;
}

// Обновить статус документа
export async function updateRAGDocumentStatus(
  id: string,
  status: RAGDocument["status"],
  options?: {
    corpus_id?: string;
    rag_file_id?: string;
    error_message?: string;
  }
): Promise<RAGDocument | null> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("ai_rag_documents")
    .update({
      status,
      corpus_id: options?.corpus_id,
      rag_file_id: options?.rag_file_id,
      error_message: options?.error_message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating RAG document:", error);
    return null;
  }

  return data;
}

// Удалить документ
export async function deleteRAGDocument(id: string): Promise<boolean> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("ai_rag_documents")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting RAG document:", error);
    return false;
  }

  return true;
}

// Поиск в RAG документах с использованием Gemini
export async function searchRAGDocuments(
  query: string,
  documentIds?: string[]
): Promise<{
  results: Array<{
    documentId: string;
    documentName: string;
    content: string;
    relevanceScore: number;
  }>;
}> {
  const supabase = await createRouteClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { results: [] };

  // Получаем документы для поиска
  let documentsQuery = supabase
    .from("ai_rag_documents")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "ready");

  if (documentIds && documentIds.length > 0) {
    documentsQuery = documentsQuery.in("id", documentIds);
  }

  const { data: documents } = await documentsQuery;

  if (!documents || documents.length === 0) {
    return { results: [] };
  }

  // TODO: Интеграция с Vertex AI RAG Engine
  // В будущем здесь будет вызов Vertex AI RAG API для поиска по документам
  // Сейчас возвращаем заглушку
  
  return {
    results: documents.map((doc) => ({
      documentId: doc.id,
      documentName: doc.name,
      content: `Контент из документа "${doc.name}" по запросу "${query}"`,
      relevanceScore: 0.8,
    })),
  };
}

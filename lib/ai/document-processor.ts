/**
 * Document Processor для RAG
 * Извлекает текст, разбивает на чанки, генерирует embeddings
 */

import { getGeminiClient, GEMINI_MODELS } from "./openrouter-compat";
import { createEmbedding } from "./openrouter-embeddings";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface ProcessedChunk {
  chunkIndex: number;
  textContent: string;
  charStart: number;
  charEnd: number;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface DocumentProcessingResult {
  success: boolean;
  documentId: string;
  chunksCount: number;
  error?: string;
}

/**
 * Настройки чанкинга
 */
const CHUNK_CONFIG = {
  maxChunkSize: 800,      // Максимальный размер чанка в символах
  minChunkSize: 100,      // Минимальный размер чанка
  overlapSize: 100,       // Перекрытие между чанками
  sentenceDelimiters: [". ", "! ", "? ", "\n\n", "\n"],
};

/**
 * Разбивает текст на чанки с перекрытием
 */
export function chunkText(text: string): Array<{ text: string; start: number; end: number }> {
  const chunks: Array<{ text: string; start: number; end: number }> = [];
  
  if (!text || text.length < CHUNK_CONFIG.minChunkSize) {
    if (text && text.trim()) {
      chunks.push({ text: text.trim(), start: 0, end: text.length });
    }
    return chunks;
  }

  let currentPos = 0;
  
  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + CHUNK_CONFIG.maxChunkSize, text.length);
    
    // Если не конец текста, ищем лучшую точку разбиения
    if (endPos < text.length) {
      let bestBreak = -1;
      
      // Ищем разделитель предложения
      for (const delimiter of CHUNK_CONFIG.sentenceDelimiters) {
        const searchStart = Math.max(currentPos + CHUNK_CONFIG.minChunkSize, endPos - 200);
        const searchText = text.substring(searchStart, endPos);
        const lastIndex = searchText.lastIndexOf(delimiter);
        
        if (lastIndex !== -1) {
          const breakPos = searchStart + lastIndex + delimiter.length;
          if (breakPos > bestBreak) {
            bestBreak = breakPos;
          }
        }
      }
      
      if (bestBreak > currentPos + CHUNK_CONFIG.minChunkSize) {
        endPos = bestBreak;
      }
    }
    
    const chunkText = text.substring(currentPos, endPos).trim();
    
    if (chunkText.length >= CHUNK_CONFIG.minChunkSize) {
      chunks.push({
        text: chunkText,
        start: currentPos,
        end: endPos,
      });
    }
    
    // Следующая позиция с учётом перекрытия
    currentPos = endPos - CHUNK_CONFIG.overlapSize;
    
    // Защита от бесконечного цикла
    if (currentPos >= text.length - CHUNK_CONFIG.minChunkSize) {
      break;
    }
  }
  
  return chunks;
}

/**
 * Извлекает текст из PDF с помощью pdf-parse
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Polyfill для DOMMatrix
    if (!global.DOMMatrix) {
      // @ts-expect-error - Polyfill for missing DOMMatrix in Node.js
      global.DOMMatrix = class DOMMatrix {
        constructor() { return this; }
        toFloat32Array() { return [1, 0, 0, 1, 0, 0]; }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        multiply() { return this; }
        inverse() { return this; }
      };
    }

    const pdfParse = await import("pdf-parse") as unknown as { 
      default: (buffer: Buffer) => Promise<{ text: string; numpages: number }> 
    };
    const pdf = pdfParse.default;
    
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    logger.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Извлекает текст из изображения с помощью OpenRouter Vision
 * Использует OpenAI GPT-4o Vision через OpenRouter
 */
export async function extractTextFromImage(
  buffer: Buffer, 
  mimeType: string
): Promise<string> {
  try {
    const base64Image = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    
    // Используем OpenAI Vision через OpenRouter
    const apiKey = process.env.OPENROUTER_FINANCE_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_FINANCE_API_KEY not configured");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://finapp.vercel.app",
        "X-Title": "FinApp Finance",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview", // Gemini 3 Flash - мультимодальная модель
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Извлеки весь текст с этого изображения документа. 
Сохрани структуру и форматирование. 
Верни только текст без комментариев.`
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter Vision error: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    logger.error("Image OCR error:", error);
    throw new Error("Failed to extract text from image");
  }
}

/**
 * Обрабатывает документ: извлекает текст, создаёт чанки и embeddings
 */
export async function processDocument(
  documentId: string,
  fileBuffer: Buffer,
  mimeType: string,
  userId: string
): Promise<DocumentProcessingResult> {
  const supabase = await createRSCClient();
  
  try {
    // Обновляем статус на processing
    await supabase
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    // 1. Извлекаем текст
    let extractedText = "";
    
    if (mimeType === "application/pdf") {
      extractedText = await extractTextFromPDF(fileBuffer);
    } else if (mimeType.startsWith("image/")) {
      extractedText = await extractTextFromImage(fileBuffer, mimeType);
    } else if (mimeType === "text/plain" || mimeType === "text/markdown") {
      extractedText = fileBuffer.toString("utf-8");
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error("No text extracted from document");
    }

    // 2. Разбиваем на чанки
    const textChunks = chunkText(extractedText);
    
    if (textChunks.length === 0) {
      throw new Error("No chunks created from document");
    }

    // 3. Генерируем embeddings и сохраняем чанки
    const processedChunks: ProcessedChunk[] = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      
      // Генерируем embedding
      const embedding = await createEmbedding(chunk.text);
      
      processedChunks.push({
        chunkIndex: i,
        textContent: chunk.text,
        charStart: chunk.start,
        charEnd: chunk.end,
        embedding,
        metadata: {
          wordCount: chunk.text.split(/\s+/).length,
        },
      });
    }

    // 4. Сохраняем чанки в БД
    const chunksToInsert = processedChunks.map((chunk) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: chunk.chunkIndex,
      text_content: chunk.textContent,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      embedding: `[${chunk.embedding.join(",")}]`, // Формат для pgvector
      metadata: chunk.metadata,
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunksToInsert);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // 5. Обновляем статус документа
    await supabase
      .from("documents")
      .update({ 
        status: "completed",
        chunks_count: processedChunks.length,
      })
      .eq("id", documentId);

    logger.info(`Document ${documentId} processed: ${processedChunks.length} chunks`);

    return {
      success: true,
      documentId,
      chunksCount: processedChunks.length,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Обновляем статус на failed
    await supabase
      .from("documents")
      .update({ 
        status: "failed",
        processing_error: errorMessage,
      })
      .eq("id", documentId);

    logger.error(`Document processing failed: ${errorMessage}`);

    return {
      success: false,
      documentId,
      chunksCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Ищет релевантные чанки документов
 */
export async function searchDocumentChunks(
  query: string,
  userId: string,
  options: {
    module?: string;
    documentId?: string;
    limit?: number;
    threshold?: number;
  } = {}
): Promise<Array<{
  id: string;
  documentId: string;
  chunkIndex: number;
  textContent: string;
  similarity: number;
}>> {
  const supabase = await createRSCClient();
  
  const queryEmbedding = await createEmbedding(query);
  
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: options.threshold || 0.7,
    match_count: options.limit || 10,
    filter_user_id: userId,
    filter_document_id: options.documentId || null,
    filter_module: options.module || null,
  });

  if (error) {
    logger.error("Search error:", error);
    return [];
  }

  return (data || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    documentId: item.document_id as string,
    chunkIndex: item.chunk_index as number,
    textContent: item.text_content as string,
    similarity: item.similarity as number,
  }));
}

/**
 * Генерирует AI саммари документа
 */
export async function generateDocumentSummary(
  documentId: string,
  userId: string
): Promise<string> {
  const supabase = await createRSCClient();
  
  // Получаем все чанки документа
  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("text_content, chunk_index")
    .eq("document_id", documentId)
    .order("chunk_index");

  if (!chunks || chunks.length === 0) {
    throw new Error("No chunks found for document");
  }

  // Собираем текст
  const fullText = chunks.map(c => c.text_content).join("\n\n");
  
  // Обрезаем если слишком длинный
  const maxLength = 30000;
  const textForSummary = fullText.length > maxLength 
    ? fullText.substring(0, maxLength) + "...[обрезано]"
    : fullText;

  // Генерируем саммари через Gemini
  const client = getGeminiClient();
  
  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: `Создай структурированное резюме следующего документа на русском языке.

Включи:
1. Краткое описание (2-3 предложения)
2. Основные пункты/требования (списком)
3. Ключевые даты и сроки (если есть)
4. Важные суммы/цены (если есть)
5. Контактная информация (если есть)

Документ:
${textForSummary}`,
  });

  const summary = response.text || "Не удалось создать резюме";

  // Сохраняем саммари
  await supabase.from("ai_summaries").insert({
    user_id: userId,
    document_id: documentId,
    summary_type: "document",
    title: "Резюме документа",
    content: summary,
    model_used: GEMINI_MODELS.CHAT,
  });

  return summary;
}

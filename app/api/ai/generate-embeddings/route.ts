/**
 * API для создания embeddings для всех транзакций без них
 * POST /api/ai/generate-embeddings
 * 
 * Можно вызвать вручную или через CRON задачу
 */

import { NextRequest, NextResponse } from "next/server";
import { generateMissingEmbeddings } from "@/lib/ai/search";

export async function POST(request: NextRequest) {
  try {
    // Опционально: проверить авторизацию или API ключ для CRON
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Если настроен CRON_SECRET, проверяем его
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Starting embeddings generation...");
    
    const result = await generateMissingEmbeddings();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Generated ${result.processed} embeddings${result.errors > 0 ? ` with ${result.errors} errors` : ""}`,
    });
  } catch (error) {
    console.error("Embeddings generation error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to generate embeddings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

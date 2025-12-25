/**
 * API для семантического поиска транзакций
 * POST /api/ai/semantic-search
 */

import { NextRequest, NextResponse } from "next/server";
import { createEmbedding } from "@/lib/ai/openrouter-embeddings";
import { searchSimilarTransactions } from "@/lib/ai/search";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, threshold = 0.7 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Создаём embedding для поискового запроса
    const embedding = await createEmbedding(query);

    // Ищем похожие транзакции
    const results = await searchSimilarTransactions(
      embedding,
      limit,
      threshold
    );

    return NextResponse.json({
      query,
      count: results.length,
      results: results.map((r) => ({
        id: r.id,
        description: r.description,
        amount: r.amount_minor / 100, // Конвертируем в основную валюту
        direction: r.direction,
        date: r.transaction_date,
        similarity: Math.round(r.similarity * 100), // В процентах
        category: r.category?.name || null,
      })),
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    
    return NextResponse.json(
      {
        error: "Failed to perform semantic search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

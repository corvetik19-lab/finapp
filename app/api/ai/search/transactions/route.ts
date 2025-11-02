import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";
import { createEmbedding } from "@/lib/ai/embeddings";

/**
 * API для умного поиска транзакций (RAG)
 * POST /api/ai/search/transactions
 * 
 * Тело запроса:
 * - query: string - поисковый запрос на естественном языке
 * - threshold?: number - порог схожести (0-1, по умолчанию 0.7)
 * - limit?: number - количество результатов (по умолчанию 10)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, threshold = 0.7, limit = 10 } = body;
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Генерируем embedding для поискового запроса
    const queryEmbedding = await createEmbedding(query);

    // 2. Ищем похожие транзакции используя функцию из миграции
    const { data: matches, error: searchError } = await supabase.rpc(
      'match_transactions',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        filter_user_id: user.id
      }
    );

    if (searchError) {
      console.error("Search error:", searchError);
      throw searchError;
    }

    // 3. Обогащаем результаты дополнительными данными (категории, счета)
    const enrichedMatches = await Promise.all(
      (matches || []).map(async (match: any) => {
        // Получаем категорию
        let categoryName = null;
        if (match.category_id) {
          const { data: category } = await supabase
            .from('categories')
            .select('name')
            .eq('id', match.category_id)
            .single();
          categoryName = category?.name || null;
        }

        // Получаем счет
        let accountName = null;
        if (match.account_id) {
          const { data: account } = await supabase
            .from('accounts')
            .select('name')
            .eq('id', match.account_id)
            .single();
          accountName = account?.name || null;
        }

        return {
          ...match,
          category_name: categoryName,
          account_name: accountName,
          amount_major: match.amount_minor / 100, // Конвертируем в рубли
        };
      })
    );

    return NextResponse.json({
      success: true,
      query,
      results: enrichedMatches,
      count: enrichedMatches.length,
      threshold,
    });

  } catch (error) {
    console.error("Error in smart search:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}

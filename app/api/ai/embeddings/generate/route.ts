import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/helpers";
import { createEmbedding, buildTransactionText } from "@/lib/ai/openrouter-embeddings";

/**
 * API для генерации embeddings для транзакций
 * POST /api/ai/embeddings/generate
 * 
 * Тело запроса:
 * - transaction_id?: string - конкретная транзакция
 * - batch_size?: number - размер пакета для обработки (по умолчанию 10)
 * - skip_existing?: boolean - пропустить транзакции с embedding (по умолчанию true)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transaction_id, batch_size = 10, skip_existing = true } = body;
    
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let transactions;
    
    // Если указан конкретный transaction_id
    if (transaction_id) {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, note, amount_minor, direction, category_id, categories(name)")
        .eq("id", transaction_id)
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }
      
      transactions = [data];
    } else {
      // Получаем транзакции без embeddings
      const query = supabase
        .from("transactions")
        .select("id, note, amount_minor, direction, category_id, categories(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(batch_size);
      
      if (skip_existing) {
        query.is("embedding", null);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      transactions = data || [];
    }

    if (transactions.length === 0) {
      return NextResponse.json({ 
        message: "No transactions to process",
        processed: 0 
      });
    }

    // Генерируем embeddings для каждой транзакции
    const results = [];
    let processed = 0;
    let failed = 0;

    for (const txn of transactions) {
      try {
        // Создаем текстовое представление транзакции
        const categoryName = Array.isArray(txn.categories) && txn.categories.length > 0 
          ? txn.categories[0].name 
          : null;
        
        const text = buildTransactionText({
          description: txn.note || "Транзакция без описания",
          category: categoryName,
          amount_minor: txn.amount_minor,
          direction: txn.direction as "income" | "expense" | "transfer"
        });

        // Генерируем embedding
        const embedding = await createEmbedding(text);

        // Сохраняем embedding в БД
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ embedding })
          .eq("id", txn.id)
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          id: txn.id,
          status: "success",
          text_preview: text.substring(0, 100)
        });
        
        processed++;
      } catch (error) {
        console.error(`Failed to generate embedding for transaction ${txn.id}:`, error);
        results.push({
          id: txn.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: transactions.length,
      results
    });

  } catch (error) {
    console.error("Error generating embeddings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/embeddings/generate
 * Получить статистику по embeddings
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    
    // Получаем текущего пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Используем функцию из миграции
    const { data, error } = await supabase.rpc('get_embedding_stats', {
      filter_user_id: user.id
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      stats: data && data.length > 0 ? data[0] : {
        total_transactions: 0,
        with_embeddings: 0,
        without_embeddings: 0,
        coverage_percent: 0
      }
    });

  } catch (error) {
    console.error("Error fetching embedding stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

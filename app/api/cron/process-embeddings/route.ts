import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/helpers";
import { createEmbedding, buildTransactionText } from "@/lib/ai/embeddings";
import { logger } from "@/lib/logger";

// Этот endpoint вызывается CRON job для обработки очереди embeddings
// Vercel Cron: 0 * * * * (каждый час) или чаще

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Проверяем авторизацию (CRON_SECRET или Authorization header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const batchSize = 20;
  let processed = 0;
  let failed = 0;

  try {
    // Получаем pending задачи
    const { data: tasks, error: fetchError } = await supabase
      .from("embedding_queue")
      .select(`
        id,
        transaction_id,
        attempts,
        transactions (
          id,
          note,
          counterparty,
          amount,
          direction,
          category_id,
          categories (name)
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      logger.error("Error fetching embedding queue", { error: fetchError });
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: "No pending tasks", processed: 0, failed: 0 });
    }

    logger.info("Processing embedding queue", { count: tasks.length });

    // Обрабатываем каждую задачу
    for (const task of tasks) {
      // Помечаем как processing
      await supabase
        .from("embedding_queue")
        .update({ status: "processing", attempts: task.attempts + 1 })
        .eq("id", task.id);

      try {
        // Supabase возвращает массив для join, берём первый элемент
        const txnData = task.transactions as unknown;
        const txnArray = txnData as Array<{
          id: string;
          note: string | null;
          counterparty: string | null;
          amount: number;
          direction: string;
          categories: Array<{ name: string }> | null;
        }> | null;
        
        const txn = txnArray?.[0];

        if (!txn) {
          throw new Error("Transaction not found");
        }
        
        // Строим текст для embedding
        const text = buildTransactionText({
          description: txn.note || txn.counterparty || "Транзакция",
          category: txn.categories?.[0]?.name || null,
          amount_minor: txn.amount,
          direction: txn.direction as "income" | "expense" | "transfer",
        });

        // Создаём embedding
        const embedding = await createEmbedding(text);

        // Сохраняем в транзакцию
        const { error: updateError } = await supabase
          .from("transactions")
          .update({ embedding })
          .eq("id", task.transaction_id);

        if (updateError) {
          throw updateError;
        }

        // Помечаем как completed
        await supabase
          .from("embedding_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", task.id);

        processed++;
        logger.debug("Embedding created", { transactionId: task.transaction_id });
      } catch (err) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        logger.error("Failed to create embedding", { transactionId: task.transaction_id, error: errorMessage });

        // Помечаем как failed или возвращаем в pending
        const newStatus = (task.attempts || 0) >= 2 ? "failed" : "pending";
        await supabase
          .from("embedding_queue")
          .update({ status: newStatus, error_message: errorMessage })
          .eq("id", task.id);
      }
    }

    logger.info("Embedding queue processed", { processed, failed });
    return NextResponse.json({ processed, failed });
  } catch (error) {
    logger.error("Error processing embedding queue", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * AI Chat API - Финансовый ассистент на Gemini
 * 
 * Гео-блокировка обходится через Vercel:
 * - preferredRegion = ["iad1"] выполняет функцию в Washington DC
 * - Gemini API доступен в US без ограничений
 */

import { toolHandlers } from "@/lib/ai/tool-handlers";
import { createRouteClient } from "@/lib/supabase/helpers";
import { convertToolsToGemini } from "@/lib/ai/convert-tools";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini-client";

export const runtime = "nodejs";
export const maxDuration = 60;
// Выполнять в US регионе для обхода гео-блокировки Gemini
export const preferredRegion = ["iad1"];

// Tools для function calling
const functionDeclarations = convertToolsToGemini();

// System prompt для финансового ассистента
const systemPrompt = `Ты — финансовый AI-ассистент приложения FinApp.

ВОЗМОЖНОСТИ:
- Анализ доходов и расходов пользователя
- Управление счетами и картами
- Отслеживание бюджетов и планов
- Персонализированные финансовые советы

ИНСТРУМЕНТЫ (Function Calling):
📊 АНАЛИТИКА:
- getAccountBalance - узнать баланс счетов
- getFinancialSummary - сводка за период (week/month/year)
- getExpensesByCategory - расходы по категориям
- getTransactions - история операций

📝 ДАННЫЕ:
- getAccounts - список счетов
- getCategories - категории
- getBudgets - бюджеты
- getPlans - финансовые цели

➕ СОЗДАНИЕ:
- addTransaction - записать расход/доход
- addCategory - создать категорию
- addBudget - создать бюджет
- addPlan - создать план накоплений
- addDebitCard - добавить дебетовую карту
- addCreditCard - добавить кредитную карту

ПРАВИЛА:
1. ВСЕГДА используй инструменты для получения данных (не выдумывай!)
2. Суммы в РУБЛЯХ (не копейках)
3. direction="expense" для расходов, "income" для доходов
4. Отвечай кратко и по делу, используй эмодзи: 💰 📊 ✅ ❌ 📈 📉 💳 🎯
5. При ошибках - объясни понятно что пошло не так

ПРИМЕРЫ:
- "Сколько у меня денег?" → getAccountBalance
- "Покажи расходы за месяц" → getExpensesByCategory
- "Добавь расход 500р на кафе" → addTransaction(amount=500, direction="expense", categoryName="Кафе")
- "Создай бюджет 10000р на продукты" → addBudget`;

export async function POST(req: Request) {
  try {
    // Получаем пользователя
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const userId = user.id;

    // Проверяем API ключ
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "Gemini API not configured" }, { status: 500 });
    }

    const { messages } = await req.json();
    
    // Конвертируем сообщения в формат Gemini
    const geminiContents: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = [];
    
    for (const msg of messages) {
      if (msg.role === "user") {
        geminiContents.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "assistant") {
        geminiContents.push({
          role: "model",
          parts: [{ text: msg.content || "" }],
        });
      }
    }
    
    const client = getGeminiClient();
    const model = GEMINI_MODELS.CHAT;
    
    // Логируем регион Vercel для отладки гео
    const vercelRegion = process.env.VERCEL_REGION || "local";
    console.log(`[AI Chat] Vercel Region: ${vercelRegion}`);
    console.log(`[AI Chat] Using model: ${model}`);
    console.log(`[AI Chat] Tools count: ${functionDeclarations.length}`);

    // Создаём streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Агентский цикл с function calling
          let iterations = 0;
          const maxIterations = 5;
          let conversationHistory = [...geminiContents];
          let finalText = "";

          while (iterations < maxIterations) {
            iterations++;
            console.log(`[AI Chat] Iteration ${iterations}`);

            // Вызываем Gemini API
            let response;
            try {
              response = await client.models.generateContent({
                model,
                contents: [
                  { role: "user", parts: [{ text: systemPrompt }] },
                  { role: "model", parts: [{ text: "Понял, готов помогать!" }] },
                  ...conversationHistory,
                ],
                config: {
                  tools: [{ functionDeclarations: functionDeclarations as unknown as import("@google/genai").FunctionDeclaration[] }],
                },
              });
            } catch (apiError) {
              console.error("[AI Chat] Gemini API Error:", apiError);
              const errMsg = apiError instanceof Error ? apiError.message : JSON.stringify(apiError);
              controller.enqueue(encoder.encode(`❌ Gemini API Error: ${errMsg}`));
              controller.close();
              return;
            }

            // Проверяем function calls
            const functionCalls = response.functionCalls;
            
            if (functionCalls && functionCalls.length > 0) {
              console.log(`[AI Chat] Function calls: ${functionCalls.length}`);
              
              // Добавляем ответ модели с function call
              conversationHistory.push({
                role: "model",
                parts: [{ text: "" }],
              });

              // Выполняем каждый function call
              for (const fc of functionCalls) {
                const functionName = fc.name as keyof typeof toolHandlers;
                const functionArgs = fc.args || {};
                
                console.log(`[AI Chat] Executing: ${functionName}`, functionArgs);

                let result;
                try {
                  const handler = toolHandlers[functionName];
                  if (handler) {
                    const argsWithUserId = { ...functionArgs, userId };
                    result = await handler(argsWithUserId as never);
                    console.log(`[AI Chat] Result:`, JSON.stringify(result).substring(0, 200));
                  } else {
                    result = { error: `Unknown function: ${functionName}` };
                  }
                } catch (err) {
                  console.error(`[AI Chat] Function error:`, err);
                  result = { error: err instanceof Error ? err.message : "Error" };
                }

                // Добавляем результат в историю
                conversationHistory.push({
                  role: "user",
                  parts: [{ text: `Результат ${functionName}: ${JSON.stringify(result)}` }],
                });
              }
              
              continue; // Продолжаем цикл
            }

            // Нет function calls - финальный ответ
            finalText = response.text || "Готово!";
            break;
          }

          console.log(`[AI Chat] Final: ${finalText.substring(0, 100)}...`);

          // Стримим ответ
          const words = finalText.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? words[i] : ' ' + words[i]);
            controller.enqueue(encoder.encode(chunk));
            await new Promise(r => setTimeout(r, 20));
          }

          controller.close();
        } catch (error) {
          console.error("[AI Chat] Error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("[AI Chat] Error message:", errorMessage);
          controller.enqueue(encoder.encode(`❌ Ошибка: ${errorMessage}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
    
  } catch (error) {
    console.error("[AI Chat] Critical error:", error);
    return Response.json(
      { error: "AI service error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

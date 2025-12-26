/**
 * AI Chat API - Финансовый ассистент на OpenRouter
 * 
 * Использует OpenRouter API для доступа к google/gemini-2.5-flash-preview-05-20
 * Модель жёстко зафиксирована и НЕ должна меняться!
 * 
 * Функционал:
 * - Streaming ответы
 * - Tool Calling (Function Calling)
 * - Агентский цикл выполнения инструментов
 */

import { toolHandlers } from "@/lib/ai/tool-handlers";
import { createRouteClient } from "@/lib/supabase/helpers";
import { convertToolsToOpenRouter } from "@/lib/ai/convert-tools";
import { 
  getOpenRouterClient, 
  OPENROUTER_CHAT_MODEL,
  type OpenRouterMessage,
} from "@/lib/ai/openrouter-client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// Tools для function calling
const openRouterTools = convertToolsToOpenRouter();

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
1. ВСЕГДА вызывай инструменты через function calling для получения данных (НЕ выдумывай данные!)
2. НИКОГДА не возвращай JSON как текст - используй function calling!
3. Суммы в РУБЛЯХ (не копейках)
4. direction="expense" для расходов, "income" для доходов
5. После получения данных от инструментов - формулируй красивый текстовый ответ с эмодзи: 💰 📊 ✅ ❌ 📈 📉 💳 🎯
6. При ошибках - объясни понятно что пошло не так

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

    // Проверяем API ключ OpenRouter (единый ключ для всех AI функций)
    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_FINANCE_API_KEY) {
      logger.error("[AI Chat] OPENROUTER_API_KEY not configured");
      return Response.json({ error: "OpenRouter API not configured" }, { status: 500 });
    }

    const { messages } = await req.json();
    
    // Конвертируем сообщения в формат OpenRouter
    const openRouterMessages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
    ];
    
    for (const msg of messages) {
      if (msg.role === "user") {
        openRouterMessages.push({
          role: "user",
          content: msg.content,
        });
      } else if (msg.role === "assistant") {
        openRouterMessages.push({
          role: "assistant",
          content: msg.content || "",
        });
      }
    }
    
    const client = getOpenRouterClient();
    
    logger.info("[AI Chat] Request", {
      model: OPENROUTER_CHAT_MODEL,
      messagesCount: openRouterMessages.length,
      toolsCount: openRouterTools.length,
    });

    // Создаём streaming response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Агентский цикл с function calling
          let iterations = 0;
          const maxIterations = 10;
          const conversationHistory = [...openRouterMessages];
          let finalText = "";

          while (iterations < maxIterations) {
            iterations++;
            logger.debug(`[AI Chat] Iteration ${iterations}`);

            // Вызываем OpenRouter API
            let response;
            try {
              response = await client.chat(conversationHistory, {
                tools: openRouterTools,
                tool_choice: "auto",
                temperature: 0.7,
                max_tokens: 4096,
              });
            } catch (apiError) {
              logger.error("[AI Chat] OpenRouter API Error:", apiError);
              const errMsg = apiError instanceof Error ? apiError.message : JSON.stringify(apiError);
              controller.enqueue(encoder.encode(`❌ OpenRouter API Error: ${errMsg}`));
              controller.close();
              return;
            }

            const choice = response.choices[0];
            if (!choice) {
              controller.enqueue(encoder.encode("❌ No response from AI"));
              controller.close();
              return;
            }

            const message = choice.message;
            const toolCalls = message.tool_calls;

            // Проверяем function calls
            if (toolCalls && toolCalls.length > 0) {
              logger.info(`[AI Chat] Tool calls: ${toolCalls.length}`);
              
              // Добавляем ответ модели с tool calls в историю
              // ВАЖНО: сохраняем reasoning_details для Gemini 3
              conversationHistory.push({
                role: "assistant",
                content: message.content,
                tool_calls: toolCalls,
                reasoning_details: message.reasoning_details, // Для Gemini 3
              });

              // Выполняем каждый tool call
              for (const tc of toolCalls) {
                const functionName = tc.function.name;
                let functionArgs: Record<string, unknown> = {};
                
                try {
                  functionArgs = JSON.parse(tc.function.arguments || "{}");
                } catch {
                  logger.error(`[AI Chat] Failed to parse arguments for ${functionName}`);
                  functionArgs = {};
                }
                
                logger.info(`[AI Chat] Executing: ${functionName}`, functionArgs);

                let result;
                try {
                  const handler = toolHandlers[functionName as keyof typeof toolHandlers];
                  if (handler) {
                    const argsWithUserId = { ...functionArgs, userId };
                    result = await handler(argsWithUserId as never);
                    logger.debug(`[AI Chat] Result:`, JSON.stringify(result).substring(0, 200));
                  } else {
                    result = { error: `Unknown function: ${functionName}` };
                  }
                } catch (err) {
                  logger.error(`[AI Chat] Function error:`, err);
                  result = { error: err instanceof Error ? err.message : "Error executing function" };
                }

                // Добавляем результат tool call в историю
                conversationHistory.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: JSON.stringify(result),
                });
              }
              
              continue; // Продолжаем цикл для получения финального ответа
            }

            // Нет function calls - финальный ответ
            finalText = message.content || "Готово!";
            break;
          }

          if (iterations >= maxIterations && !finalText) {
            finalText = "⚠️ Превышено количество итераций. Попробуйте упростить запрос.";
          }

          logger.info(`[AI Chat] Final response: ${finalText.substring(0, 100)}...`);

          // Стримим ответ по словам для плавного отображения
          const words = finalText.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? words[i] : ' ' + words[i]);
            controller.enqueue(encoder.encode(chunk));
            await new Promise(r => setTimeout(r, 15));
          }

          controller.close();
        } catch (error) {
          logger.error("[AI Chat] Stream error:", error);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
    logger.error("[AI Chat] Critical error:", error);
    return Response.json(
      { error: "AI service error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

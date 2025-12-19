/**
 * AI Chat API - интеграция с Google Gemini API
 * Manual agentic loop для выполнения tools
 */

import { toolHandlers } from "@/lib/ai/tool-handlers";
import { createRouteClient } from "@/lib/supabase/helpers";
import { convertToolsToGemini } from "@/lib/ai/convert-tools";
import { getGeminiClient, GEMINI_MODELS } from "@/lib/ai/gemini-client";
import type { FunctionDeclaration } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

// Автоматически генерируем tools из определений в формате Gemini
const functionDeclarations = convertToolsToGemini();

// Типы для Gemini
interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

interface GeminiFunctionResponse {
  name: string;
  response: {
    result: unknown;
  };
}

export async function POST(req: Request) {
  try {
    console.log('🔑 Checking SUPABASE_SERVICE_ROLE_KEY:', 
      process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✅' : 'MISSING ❌');
    
    // Получаем текущего пользователя
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return Response.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log('✅ User authenticated:', userId);
    
    // Проверяем API ключ Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      console.error("GEMINI_API_KEY is not set");
      return Response.json(
        { 
          error: "Gemini API key is not configured",
          details: "Please set GEMINI_API_KEY in your .env.local file"
        },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    
    // System prompt для Gemini
    const systemPrompt = `Ты — универсальный ассистент для приложения "Finapp". 

Твоя задача — помогать пользователю управлять ВСЕМИ аспектами жизни: финансами, заметками, планами, фитнесом.

📊 ДОСТУПНЫЕ ИНСТРУМЕНТЫ:

📁 КАТЕГОРИИ:
• addCategory - создать категорию расходов/доходов
• getCategories - посмотреть все категории
  Пример: "Создай категорию расходов Транспорт"

💳 СЧЕТА:
• addAccount - создать новый счёт/кошелёк
• getAccountBalance - проверить баланс счёта или всех счетов
• getAccounts - посмотреть все счета
  Пример: "Сколько у меня денег?", "Покажи все мои счета"

💰 ТРАНЗАКЦИИ:
• addTransaction - записать доход или расход
  Пример: "Потратил 500 рублей на Еду", "Заработал 50000 на Зарплате"
• getTransactions - посмотреть последние транзакции (с фильтрами по дате, категории)
  Пример: "Покажи мои траты", "Что я покупал в октябре?"
• processReceipt - обработать кассовый чек и создать транзакцию с позициями товаров
  ИСПОЛЬЗУЙ когда пользователь присылает ЧЕК от кассы (полный текст)

📊 АНАЛИТИКА И ОТЧЁТЫ:
• getExpensesByCategory - получить детальный анализ расходов по категориям за период
  Параметры: month (название месяца), year (год), startDate, endDate
  Пример: "Сколько я потратил за месяц?", "Покажи расходы за ноябрь"
• getFinancialSummary - получить общую финансовую сводку (доходы/расходы за период)
• searchTransactions - умный поиск транзакций по смыслу (RAG)
  Пример: "Покажи все кафе", "Сколько на такси"

📊 БЮДЖЕТЫ:
• addBudget - установить лимит на категорию
• getBudgets - посмотреть все бюджеты
  Пример: "Поставь бюджет 10000 на Еду"

📝 ЗАМЕТКИ:
• addNote - создать заметку
• getNotes - посмотреть заметки

🎯 ПЛАНЫ:
• addPlan - создать финансовую цель
• getPlans - посмотреть мои планы
• updatePlan - обновить план
• addPlanTopup - пополнить план

🔖 ЗАКЛАДКИ:
• addBookmark - сохранить ссылку
• getBookmarks - посмотреть закладки

💡 ПРОМПТЫ:
• addPrompt - сохранить AI промпт

💪 ФИТНЕС:
• addFitnessWorkout - записать тренировку
• getFitnessPrograms - посмотреть программы тренировок
  Пример: "Бегал 30 минут", "Тренировка в зале 60 минут"

🎯 СТИЛЬ ОТВЕТОВ:
- Кратко и по делу
- Эмодзи для наглядности (💰 📊 ✅ ❌ 📝 🎯 💪)
- Подтверждение каждого действия
- Если данных нет - предложи создать

ВАЖНО: 
- ВСЕГДА используй инструменты когда пользователь просит действие
- Для вопросов про расходы ОБЯЗАТЕЛЬНО используй getExpensesByCategory или getFinancialSummary
- Суммы в РУБЛЯХ (не копейках)
- Для расходов: direction="expense"
- Для доходов: direction="income"
- Будь дружелюбным и проактивным!`;

    // Конвертируем сообщения в формат Gemini
    const geminiContents: Array<{
      role: "user" | "model";
      parts: Array<{ text: string } | { functionCall: GeminiFunctionCall } | { functionResponse: GeminiFunctionResponse }>;
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
    
    // Получаем клиент Gemini
    const client = getGeminiClient();
    
    // Manual Agentic Loop
    const maxIterations = 5;
    let iteration = 0;
    let finalText = '';
    
    // История для agentic loop
    const conversationHistory = [...geminiContents];
    
    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}/${maxIterations}`);
      
      try {
        // Вызываем Gemini API
        const response = await client.models.generateContent({
          model: GEMINI_MODELS.CHAT, // gemini-3-pro-preview
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            { role: "model", parts: [{ text: "Понял, я готов помогать!" }] },
            ...conversationHistory,
          ],
          config: {
            tools: [{
              functionDeclarations: functionDeclarations as unknown as FunctionDeclaration[],
            }],
          },
        });

        console.log('📝 Gemini response received');
        
        // Проверяем наличие function calls
        const functionCalls = response.functionCalls;
        
        if (functionCalls && functionCalls.length > 0) {
          console.log('🔧 Function calls detected:', functionCalls.length);
          
          // Добавляем ответ модели с function call в историю
          conversationHistory.push({
            role: "model",
            parts: functionCalls.map(fc => ({
              functionCall: {
                name: fc.name || "",
                args: fc.args || {},
              },
            })),
          });
          
          // Выполняем каждый function call
          const functionResponses: Array<{ functionResponse: GeminiFunctionResponse }> = [];
          
          for (const fc of functionCalls) {
            const functionName = fc.name as keyof typeof toolHandlers;
            const functionArgs = fc.args || {};
            
            console.log(`⚙️ Executing: ${functionName}`, functionArgs);
            
            try {
              // Получаем handler
              const handler = toolHandlers[functionName];
              if (!handler) {
                throw new Error(`Tool handler not found: ${functionName}`);
              }
              
              // Вызываем handler с userId
              const argsWithUserId = { ...(functionArgs as object), userId };
              const result = await handler(argsWithUserId as never);
              console.log(`✅ Result:`, result);
              
              functionResponses.push({
                functionResponse: {
                  name: functionName,
                  response: { result },
                },
              });
            } catch (error) {
              console.error(`❌ Tool execution error for ${functionName}:`, error);
              
              let errorMessage = 'Произошла ошибка при выполнении операции';
              if (error instanceof Error) {
                if (error.message.includes('duplicate key')) {
                  errorMessage = 'Такая запись уже существует';
                } else if (error.message.includes('foreign key')) {
                  errorMessage = 'Не найдена связанная запись';
                } else if (error.message.includes('not found')) {
                  errorMessage = 'Запись не найдена';
                } else {
                  errorMessage = error.message;
                }
              }
              
              functionResponses.push({
                functionResponse: {
                  name: functionName,
                  response: { 
                    result: { 
                      success: false, 
                      error: errorMessage,
                      toolName: functionName,
                    },
                  },
                },
              });
            }
          }
          
          // Добавляем результаты function calls в историю
          conversationHistory.push({
            role: "user",
            parts: functionResponses,
          });
          
          // Продолжаем цикл - AI должен дать финальный ответ
          continue;
        }
        
        // Нет function calls - это финальный ответ
        finalText = response.text || '';
        console.log('✅ Final response received, streaming to client');
        
        // Создаём ReadableStream для отправки текста клиенту
        const stream = new ReadableStream({
          start(controller) {
            // Отправляем текст по частям для эффекта печати
            const words = finalText.split(' ');
            let index = 0;
            
            const sendChunk = () => {
              if (index < words.length) {
                const chunk = (index === 0 ? words[index] : ' ' + words[index]);
                controller.enqueue(new TextEncoder().encode(chunk));
                index++;
                setTimeout(sendChunk, 30);
              } else {
                controller.close();
              }
            };
            
            sendChunk();
          }
        });
        
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
          },
        });
        
      } catch (apiError) {
        console.error('Gemini API error:', apiError);
        console.error('Error details:', JSON.stringify(apiError, null, 2));
        if (apiError instanceof Error) {
          console.error('Error message:', apiError.message);
          console.error('Error name:', apiError.name);
        }
        throw apiError;
      }
    }
    
    // Если достигли максимума итераций
    if (iteration >= maxIterations) {
      console.warn('⚠️ Max iterations reached');
      finalText = '⏱️ Извините, операция заняла слишком много времени. Попробуйте упростить запрос.';
      
      return new Response(finalText, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    // Fallback
    return new Response('', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.error("❌ AI Chat Critical Error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
    
    let errorMessage = 'Произошла ошибка сервиса AI';
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Ошибка конфигурации AI сервиса. Проверьте настройки.';
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = 'Превышен лимит запросов. Попробуйте через минуту.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Превышено время ожидания. Попробуйте еще раз.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return Response.json(
      { 
        error: "AI service error",
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

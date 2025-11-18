/**
 * AI Chat API - прямая интеграция с OpenAI API БЕЗ Vercel AI SDK
 * Manual agentic loop для выполнения tools
 */

import { toolHandlers } from "@/lib/ai/tool-handlers";
import { createRouteClient } from "@/lib/supabase/helpers";
import { convertToolsToOpenAI } from "@/lib/ai/convert-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

// Автоматически генерируем ВСЕ 40+ tools из определений
const tools = convertToolsToOpenAI();

// Типы OpenAI API
interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface ToolResult {
  role: "tool";
  tool_call_id: string;
  content: string; // JSON string с результатом
}

// УДАЛЕНО: Старое ручное определение tools заменено автоматической генерацией выше
// Определение доступных tools для OpenAI
/*const tools_OLD = [
  {
    type: "function",
    function: {
      name: "addCategory",
      description: "Добавить новую категорию транзакций. Используй когда пользователь хочет создать новую категорию расходов/доходов.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Название категории"
          },
          type: {
            type: "string",
            enum: ["income", "expense"],
            description: "Тип категории: income (доход) или expense (расход)"
          },
          icon: {
            type: "string",
            description: "Иконка (emoji или material icon)",
          }
        },
        required: ["name", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getAccountBalance",
      description: "Получить баланс счета или всех счетов. Используй для проверки текущих денег пользователя.",
      parameters: {
        type: "object",
        properties: {
          accountName: {
            type: "string",
            description: "Название счёта. Если не указано - вернуть все счета"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addTransaction",
      description: "Добавить новую транзакцию (доход или расход). Используй когда пользователь хочет записать трату или доход.",
      parameters: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Сумма в рублях (например 1500.50)"
          },
          direction: {
            type: "string",
            enum: ["income", "expense"],
            description: "Тип: income (доход) или expense (расход)"
          },
          categoryName: {
            type: "string",
            description: "Название категории"
          },
          accountName: {
            type: "string",
            description: "Название счёта (опционально, по умолчанию основной счёт)"
          },
          note: {
            type: "string",
            description: "Описание/заметка к транзакции"
          },
          date: {
            type: "string",
            description: "Дата в формате YYYY-MM-DD (опционально, по умолчанию сегодня)"
          }
        },
        required: ["amount", "direction", "categoryName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addDebitCard",
      description: "Создать новую дебетовую карту. Используй когда пользователь хочет добавить дебетовую карту.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Название карты (например 'Сбербанк', 'Тинькофф')"
          },
          balance: {
            type: "number",
            description: "Начальный баланс в рублях"
          },
          currency: {
            type: "string",
            description: "Валюта (по умолчанию RUB)"
          },
          bank: {
            type: "string",
            description: "Название банка"
          },
          cardNumber: {
            type: "string",
            description: "Последние 4 цифры карты (опционально)"
          }
        },
        required: ["name", "balance"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addCreditCard",
      description: "Создать новую кредитную карту. Используй когда пользователь хочет добавить кредитную карту.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Название карты"
          },
          balance: {
            type: "number",
            description: "Текущий баланс (задолженность) в рублях"
          },
          creditLimit: {
            type: "number",
            description: "Кредитный лимит в рублях"
          },
          currency: {
            type: "string",
            description: "Валюта (по умолчанию RUB)"
          },
          bank: {
            type: "string",
            description: "Название банка"
          },
          cardNumber: {
            type: "string",
            description: "Последние 4 цифры карты (опционально)"
          }
        },
        required: ["name", "balance", "creditLimit"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addAccount",
      description: "Создать новый счёт/кошелёк. Используй когда пользователь хочет добавить карту, наличные или другой счёт.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Название счёта (например 'Сбербанк', 'Наличные')"
          },
          type: {
            type: "string",
            enum: ["cash", "debit_card", "credit_card", "savings"],
            description: "Тип счёта"
          },
          currency: {
            type: "string",
            description: "Валюта (по умолчанию RUB)"
          }
        },
        required: ["name", "type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addBudget",
      description: "Создать бюджет на категорию. Используй когда пользователь хочет установить лимит расходов.",
      parameters: {
        type: "object",
        properties: {
          categoryName: {
            type: "string",
            description: "Название категории для бюджета"
          },
          amount: {
            type: "number",
            description: "Лимит в рублях"
          },
          period: {
            type: "string",
            enum: ["month", "quarter", "year"],
            description: "Период бюджета (по умолчанию month)"
          }
        },
        required: ["categoryName", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchTransactions",
      description: "УМНЫЙ ПОИСК транзакций по смыслу запроса (RAG). Используй когда пользователь спрашивает про конкретные траты, категории, места. Например: 'покажи все кафе', 'сколько потратил на такси', 'где я ел в октябре'.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Поисковый запрос на естественном языке"
          },
          limit: {
            type: "number",
            description: "Количество результатов (по умолчанию 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTransactions",
      description: "Получить список ПОСЛЕДНИХ транзакций в хронологическом порядке. Используй для общего анализа трат.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Количество транзакций (по умолчанию 10)"
          },
          categoryName: {
            type: "string",
            description: "Фильтр по категории (опционально)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addNote",
      description: "Создать заметку. Используй когда пользователь хочет что-то записать или сохранить мысль.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Заголовок заметки"
          },
          content: {
            type: "string",
            description: "Содержание заметки"
          }
        },
        required: ["title", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getNotes",
      description: "Посмотреть список заметок пользователя.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Количество заметок (по умолчанию 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addPlan",
      description: "Создать финансовый план/цель. Используй когда пользователь хочет накопить деньги на что-то.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Название плана (например 'Отпуск', 'Новый телефон')"
          },
          goalAmount: {
            type: "number",
            description: "Целевая сумма в рублях"
          },
          targetDate: {
            type: "string",
            description: "Дата достижения цели в формате YYYY-MM-DD (опционально)"
          },
          description: {
            type: "string",
            description: "Описание плана (опционально)"
          }
        },
        required: ["name", "goalAmount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getPlans",
      description: "Посмотреть список финансовых планов пользователя.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addBookmark",
      description: "Сохранить закладку/ссылку. Используй когда пользователь хочет сохранить полезную ссылку.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Название закладки"
          },
          url: {
            type: "string",
            description: "URL ссылки"
          },
          description: {
            type: "string",
            description: "Описание (опционально)"
          }
        },
        required: ["title", "url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addPrompt",
      description: "Сохранить AI промпт. Используй когда пользователь хочет сохранить полезный промпт.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Название промпта"
          },
          content: {
            type: "string",
            description: "Текст промпта"
          },
          category: {
            type: "string",
            description: "Категория промпта (опционально)"
          }
        },
        required: ["title", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addWorkout",
      description: "Записать тренировку. Используй когда пользователь сообщает о физической активности.",
      parameters: {
        type: "object",
        properties: {
          programName: {
            type: "string",
            description: "Название программы/типа тренировки (например 'Бег', 'Зал', 'Йога')"
          },
          duration: {
            type: "number",
            description: "Длительность в минутах"
          },
          calories: {
            type: "number",
            description: "Сожженные калории (опционально)"
          },
          note: {
            type: "string",
            description: "Заметка о тренировке (опционально)"
          }
        },
        required: ["programName", "duration"]
      }
    }
  }
]; */

export async function POST(req: Request) {
  try {
    // Проверяем что Service Role ключ загрузился
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
    
    // Проверяем API ключ
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      console.error("OPENAI_API_KEY is not set");
      return Response.json(
        { 
          error: "OpenAI API key is not configured",
          details: "Please set OPENAI_API_KEY in your .env.local file"
        },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    
    // Добавляем system prompt
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
  Автоматически парсит чек, находит товары в БД, создаёт транзакцию и добавляет позиции
  Пример: пользователь присылает чек с текстом "Поступил кассовый чек: от ООО..."

📊 АНАЛИТИКА И ОТЧЁТЫ:
• getExpensesByCategory - получить детальный анализ расходов по категориям за период
  Параметры: month (название месяца), year (год), startDate, endDate
  Пример: "Сколько я потратил за месяц?", "Покажи расходы за ноябрь", "Траты за октябрь 2024"
  ВАЖНО: Всегда указывай month и year когда пользователь называет конкретный месяц!
• getFinancialSummary - получить общую финансовую сводку (доходы/расходы за период)
  Пример: "Дай финансовую сводку за месяц"
• searchTransactions - умный поиск транзакций по смыслу (RAG)
  Пример: "Покажи все кафе", "Сколько на такси", "Где я ел в октябре?"

📊 БЮДЖЕТЫ:
• addBudget - установить лимит на категорию
• getBudgets - посмотреть все бюджеты
  Пример: "Поставь бюджет 10000 на Еду"

📝 ЗАМЕТКИ:
• addNote - создать заметку
  Пример: "Запомни что надо купить молоко"
• getNotes - посмотреть заметки

🎯 ПЛАНЫ:
• addPlan - создать финансовую цель
  Пример: "Создай план накопить 100000 на отпуск"
• getPlans - посмотреть мои планы
• updatePlan - обновить план
• addPlanTopup - пополнить план

🔖 ЗАКЛАДКИ:
• addBookmark - сохранить ссылку
• getBookmarks - посмотреть закладки
  Пример: "Сохрани закладку на сайт"

💡 ПРОМПТЫ:
• addPrompt - сохранить AI промпт
  Пример: "Сохрани промпт для генерации отчётов"

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
- Будь дружелюбным и проактивным!
- RAG доступен через searchTransactions для умного поиска!`;

    const allMessages: (Message | ToolResult)[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];
    
    // Manual Agentic Loop
    const maxIterations = 5;
    let iteration = 0;
    let finalText = '';
    
    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}/${maxIterations}`);
      
      // Вызываем OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: allMessages,
          tools: tools,
          tool_choice: "auto",
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      // Читаем стриминг ответ
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("No response body");
      }

      let accumulatedContent = '';
      const toolCalls: ToolCall[] = [];
      let hasToolCalls = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
        
        for (const line of lines) {
          const data = line.replace(/^data:\s*/, '');
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.content) {
              accumulatedContent += delta.content;
            }
            
            if (delta?.tool_calls) {
              hasToolCalls = true;
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index;
                if (!toolCalls[index]) {
                  toolCalls[index] = {
                    id: toolCall.id,
                    type: "function",
                    function: { name: toolCall.function?.name || '', arguments: '' }
                  };
                }
                if (toolCall.function?.arguments) {
                  toolCalls[index].function.arguments += toolCall.function.arguments;
                }
              }
            }
          } catch {
            // Skip invalid JSON chunks
          }
        }
      }

      const aiMessage = {
        content: accumulatedContent,
        tool_calls: hasToolCalls ? toolCalls.filter(Boolean) : undefined
      };
      
      console.log('📝 AI response:', {
        content: aiMessage.content?.substring(0, 100),
        hasToolCalls: !!aiMessage.tool_calls
      });

      // Если есть tool calls - выполняем их
      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        console.log('🔧 Tool calls detected:', aiMessage.tool_calls.length);
        
        // Добавляем assistant message с tool calls
        allMessages.push({
          role: "assistant",
          content: aiMessage.content,
          tool_calls: aiMessage.tool_calls
        });
        
        // Выполняем каждый tool call
        for (const toolCall of aiMessage.tool_calls) {
          const functionName = toolCall.function.name as keyof typeof toolHandlers;
          let functionArgs: unknown;
          
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
            console.log(`⚙️ Executing: ${functionName}`, functionArgs);
            
            // Получаем handler
            const handler = toolHandlers[functionName];
            if (!handler) {
              throw new Error(`Tool handler not found: ${functionName}`);
            }
            
            // Вызываем handler с userId
            const argsWithUserId = { ...(functionArgs as object), userId };
            const result = await handler(argsWithUserId as never);
            console.log(`✅ Result:`, result);
            
            // Добавляем результат как tool message
            allMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (error) {
            console.error(`❌ Tool execution error for ${toolCall.function.name}:`, error);
            console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack');
            console.error(`❌ Function args:`, functionArgs);
            
            // Формируем понятное сообщение об ошибке
            let errorMessage = 'Произошла ошибка при выполнении операции';
            if (error instanceof Error) {
              // Проверяем специфичные ошибки БД
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
            
            // Добавляем ошибку как результат
            allMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ 
                success: false, 
                error: errorMessage,
                toolName: toolCall.function.name
              })
            });
          }
        }
        
        // Продолжаем цикл - AI должен дать финальный ответ
        continue;
      }
      
      // Нет tool calls - это финальный ответ, возвращаем стрим
      finalText = aiMessage.content || '';
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
              setTimeout(sendChunk, 30); // Задержка между словами
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

    // Fallback (не должен достигаться)
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
      } else if (error.message.includes('rate limit')) {
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

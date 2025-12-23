import { NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { streamChatCompletion, ChatMessage } from "@/lib/ai-studio/openrouter/client";
import { DEFAULT_MODEL } from "@/lib/ai-studio/openrouter/models";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface WebSearchConfig {
  enabled: boolean;
  maxResults?: number;
  engine?: "native" | "exa";
}

interface ReasoningConfig {
  enabled?: boolean;
  effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  maxTokens?: number;
}

interface StreamRequest {
  messages: Array<{ role: "user" | "assistant"; content: string; imageUrl?: string }>;
  model: string;
  systemPrompt?: string;
  config?: {
    temperature?: number;
    maxTokens?: number;
    webSearch?: boolean | WebSearchConfig;
    reasoning?: ReasoningConfig;
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const hasAccess = await hasAIStudioAccess(user.id, user.email);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, model, systemPrompt, config }: StreamRequest = await req.json();

    const actualModel = model || DEFAULT_MODEL;

    // Формируем сообщения для OpenRouter
    const openRouterMessages: ChatMessage[] = [];
    
    // Добавляем системный промпт
    if (systemPrompt) {
      openRouterMessages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // Добавляем историю сообщений
    for (const msg of messages) {
      openRouterMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    // Создаём streaming response
    const encoder = new TextEncoder();
    let inputTokens = 0;
    let outputTokens = 0;

    console.log(`[AI Studio] START - model: ${actualModel}, messages: ${openRouterMessages.length}`);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Подготавливаем параметры запроса
          const requestParams: Parameters<typeof streamChatCompletion>[0] = {
            model: actualModel,
            messages: openRouterMessages,
            temperature: config?.temperature ?? 0.7,
            max_tokens: config?.maxTokens ?? 4096,
            stream: true,
          };

          // Добавляем web search plugin если включен
          if (config?.webSearch) {
            const webConfig = typeof config.webSearch === 'object' ? config.webSearch : { enabled: true };
            if (webConfig.enabled !== false) {
              requestParams.plugins = [{
                id: "web",
                ...(webConfig.maxResults && { max_results: webConfig.maxResults }),
                ...(webConfig.engine && { engine: webConfig.engine }),
              }];
            }
          }

          // Добавляем reasoning config если включен
          if (config?.reasoning?.enabled) {
            requestParams.reasoning = {
              enabled: true,
              ...(config.reasoning.effort && { effort: config.reasoning.effort }),
              ...(config.reasoning.maxTokens && { max_tokens: config.reasoning.maxTokens }),
            };
          }

          const streamGenerator = streamChatCompletion(requestParams);

          let fullContent = "";
          let fullReasoning = "";
          let annotations: Array<{ type: string; url_citation?: { url: string; title: string; content?: string } }> = [];

          for await (const chunk of streamGenerator) {
            const delta = chunk.choices?.[0]?.delta;
            
            // Обработка reasoning tokens
            if (delta?.reasoning) {
              fullReasoning += delta.reasoning;
              const thinkingData = `data: ${JSON.stringify({ type: "thinking", text: delta.reasoning, done: false })}\n\n`;
              controller.enqueue(encoder.encode(thinkingData));
            }
            
            if (delta?.content) {
              fullContent += delta.content;
              const data = `data: ${JSON.stringify({ type: "text", text: delta.content, done: false })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // Обработка annotations (web search results)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message = (chunk.choices?.[0] as any)?.message;
            if (message?.annotations) {
              annotations = message.annotations;
            }

            // Обновляем usage если есть
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || 0;
            }

            // Проверяем finish_reason
            const finishReason = chunk.choices?.[0]?.finish_reason;
            if (finishReason) {
              console.log(`[AI Studio] Finish reason: ${finishReason}`);
              
              // Отправляем annotations если есть
              if (annotations.length > 0) {
                const sourcesData = `data: ${JSON.stringify({ 
                  type: "sources", 
                  sources: annotations.map(a => ({
                    url: a.url_citation?.url,
                    title: a.url_citation?.title,
                    content: a.url_citation?.content
                  })).filter(s => s.url)
                })}\n\n`;
                controller.enqueue(encoder.encode(sourcesData));
              }
            }
          }

          console.log(`[AI Studio] SUCCESS - length: ${fullContent.length}, tokens: ${inputTokens}/${outputTokens}`);

          // Логируем использование
          await logAIStudioUsage(
            user.id,
            null,
            "chat",
            actualModel,
            inputTokens,
            outputTokens
          );

          // Финальное сообщение
          const finalData = `data: ${JSON.stringify({ 
            type: "done", 
            done: true, 
            usage: { inputTokens, outputTokens } 
          })}\n\n`;
          controller.enqueue(encoder.encode(finalData));
          controller.close();
        } catch (error) {
          console.error("[AI Studio] Stream error:", error);
          const errorData = `data: ${JSON.stringify({ 
            type: "error", 
            error: error instanceof Error ? error.message : "Error", 
            done: true 
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat stream error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

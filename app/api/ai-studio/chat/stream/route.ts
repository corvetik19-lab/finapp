import { NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/ai/gemini-client";
import { hasAIStudioAccess, logAIStudioUsage } from "@/lib/ai-studio/access";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface StreamRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model: string;
  systemPrompt?: string;
  config?: {
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
    enableSearch?: boolean;
    enableCodeExecution?: boolean;
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

    const client = getGeminiClient();

    // Формируем contents с системным промптом
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    
    if (systemPrompt) {
      contents.push(
        { role: "user", parts: [{ text: `Системные инструкции:\n${systemPrompt}` }] },
        { role: "model", parts: [{ text: "Понял, следую инструкциям." }] }
      );
    }

    messages.forEach((m) => {
      contents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      });
    });

    // Конфигурация генерации
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: 65536,
      temperature: 0.7,
    };

    // Thinking level для моделей Gemini 3
    const isGemini3 = model.includes("gemini-3");
    if (isGemini3 && config?.thinkingLevel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: config.thinkingLevel === "minimal" ? 0 
          : config.thinkingLevel === "low" ? 1024 
          : config.thinkingLevel === "medium" ? 8192 
          : 32768
      };
    }

    // Tools
    const tools: Array<Record<string, unknown>> = [];
    if (config?.enableSearch) {
      tools.push({ googleSearch: {} });
    }
    if (config?.enableCodeExecution) {
      tools.push({ codeExecution: {} });
    }

    // Создаём streaming response
    const encoder = new TextEncoder();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.models.generateContentStream({
            model: model || "gemini-3-flash-preview",
            contents,
            config: {
              ...generationConfig,
              tools: tools.length > 0 ? tools : undefined,
            },
          });

          for await (const chunk of response) {
            if (chunk.usageMetadata) {
              totalInputTokens = chunk.usageMetadata.promptTokenCount || 0;
              totalOutputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
            }

            // Обрабатываем части ответа
            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                // Thinking (мысли модели)
                if ("thought" in part && part.thought === true && "text" in part) {
                  const data = JSON.stringify({ 
                    type: "thinking", 
                    text: part.text || "",
                    done: false 
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                // Обычный текст
                else if ("text" in part && part.text) {
                  const data = JSON.stringify({ 
                    type: "text", 
                    text: part.text,
                    done: false 
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                // Результат выполнения кода
                else if ("executableCode" in part) {
                  const execCode = part as { executableCode: { code: string; language: string } };
                  const data = JSON.stringify({
                    type: "code",
                    code: execCode.executableCode.code,
                    language: execCode.executableCode.language,
                    done: false
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
                else if ("codeExecutionResult" in part) {
                  const execResult = part as { codeExecutionResult: { output: string } };
                  const data = JSON.stringify({
                    type: "code_result",
                    output: execResult.codeExecutionResult.output,
                    done: false
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              }
            }

            // Grounding metadata (источники)
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              const sources = chunk.candidates[0].groundingMetadata.groundingChunks
                .filter((c: { web?: { uri?: string; title?: string } }) => c.web?.uri)
                .map((c: { web?: { uri?: string; title?: string } }) => ({
                  title: c.web?.title || c.web?.uri || "Источник",
                  url: c.web?.uri || ""
                }));
              
              if (sources.length > 0) {
                const data = JSON.stringify({
                  type: "sources",
                  sources,
                  done: false
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }

          // Финальное сообщение с метаданными
          const finalData = JSON.stringify({
            type: "done",
            done: true,
            usage: {
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
            },
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

          // Логируем использование
          await logAIStudioUsage(
            user.id,
            null,
            "chat",
            model || "gemini-3-flash-preview",
            totalInputTokens,
            totalOutputTokens
          );

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = JSON.stringify({ 
            type: "error",
            error: error instanceof Error ? error.message : "Stream error",
            done: true 
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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

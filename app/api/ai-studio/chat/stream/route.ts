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
    const actualModel = model || "gemini-2.0-flash";

    // Формируем contents для Gemini
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    
    if (systemPrompt) {
      contents.push(
        { role: "user", parts: [{ text: `Инструкции:\n${systemPrompt}` }] },
        { role: "model", parts: [{ text: "Понял, следую инструкциям." }] }
      );
    }

    // Добавляем историю сообщений
    for (const msg of messages) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Создаём streaming response
    const encoder = new TextEncoder();

    try {
      console.log(`[AI Studio] START - model: ${actualModel}`);
      
      const response = await client.models.generateContent({
        model: actualModel,
        contents,
      });

      const text = response.text || "";
      const usage = response.usageMetadata;
      
      console.log(`[AI Studio] SUCCESS - length: ${text.length}`);

      // Логируем использование
      await logAIStudioUsage(
        user.id,
        null,
        "chat",
        actualModel,
        usage?.promptTokenCount || 0,
        usage?.candidatesTokenCount || 0
      );

      // Создаём SSE стрим с ответом
      const stream = new ReadableStream({
        async start(controller) {
          // Отправляем текст чанками
          const chunkSize = 20;
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            const data = `data: ${JSON.stringify({ type: "text", text: chunk, done: false })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          
          // Финальное сообщение
          const finalData = `data: ${JSON.stringify({ type: "done", done: true, usage: { inputTokens: usage?.promptTokenCount || 0, outputTokens: usage?.candidatesTokenCount || 0 } })}\n\n`;
          controller.enqueue(encoder.encode(finalData));
          controller.close();
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
      console.error("[AI Studio] Error:", error);
      const errorStream = new ReadableStream({
        start(controller) {
          const errorData = `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Error", done: true })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }
  } catch (error) {
    console.error("Chat stream error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

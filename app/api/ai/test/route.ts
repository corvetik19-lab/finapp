import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    status: "ok",
    hasOpenAIKey,
    message: hasOpenAIKey 
      ? "✅ OpenAI API key настроен" 
      : "❌ OpenAI API key не найден. Добавьте OPENAI_API_KEY в .env.local",
    timestamp: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
  
  return NextResponse.json({
    status: "ok",
    hasOpenRouterKey,
    message: hasOpenRouterKey 
      ? "✅ OpenRouter API key настроен" 
      : "❌ OpenRouter API key не найден. Добавьте OPENROUTER_API_KEY в .env.local",
    timestamp: new Date().toISOString(),
  });
}

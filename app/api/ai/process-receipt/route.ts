import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { toolHandlers } from "@/lib/ai/tool-handlers";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    
    // Проверяем авторизацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Пользователь не авторизован" },
        { status: 401 }
      );
    }

    const { receiptText, accountName, preview } = await request.json();

    if (!receiptText || typeof receiptText !== "string") {
      return NextResponse.json(
        { success: false, message: "Текст чека не указан" },
        { status: 400 }
      );
    }

    // Обрабатываем чек через tool handler
    const result = await toolHandlers.processReceipt({
      receiptText,
      accountName,
      userId: user.id,
      preview: preview === true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing receipt:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Ошибка обработки чека",
      },
      { status: 500 }
    );
  }
}

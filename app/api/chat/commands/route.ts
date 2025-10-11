import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { parseCommand, executeCommand } from "@/lib/ai/commands";

export const dynamic = "force-dynamic";

/**
 * POST - парсинг и выполнение команды
 */
export async function POST(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, execute = false } = body;

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Парсим команду
    const parsed = await parseCommand(text);

    // Если нужно выполнить
    if (execute && parsed.type !== "unknown") {
      const result = await executeCommand(parsed, supabase, user.id);
      return NextResponse.json({
        parsed,
        executed: true,
        result,
      });
    }

    // Только парсинг
    return NextResponse.json({
      parsed,
      executed: false,
    });
  } catch (error) {
    console.error("Command API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

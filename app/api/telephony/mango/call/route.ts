import { NextRequest, NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { initiateCall, getUserExtension } from "@/lib/suppliers/mango-service";

// POST /api/telephony/mango/call
// Инициация исходящего звонка
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { toNumber } = body;

    if (!toNumber) {
      return NextResponse.json(
        { error: "toNumber is required" },
        { status: 400 }
      );
    }

    // Получаем внутренний номер пользователя
    const extension = await getUserExtension(user.id);

    if (!extension) {
      return NextResponse.json(
        { error: "Для вас не настроен внутренний номер телефонии" },
        { status: 400 }
      );
    }

    // Инициируем звонок
    const result = await initiateCall(toNumber, extension);

    if (result.success) {
      return NextResponse.json({
        success: true,
        callId: result.callId,
      });
    }

    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  } catch (error) {
    console.error("Call initiation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getKieClient } from "@/lib/kie";

export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const client = getKieClient();
    const credits = await client.getCredits();

    return NextResponse.json({
      credits,
      success: true,
    });

  } catch (error) {
    console.error("Kie credits error:", error);
    
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    return NextResponse.json(
      { error: message, credits: 0 },
      { status: 500 }
    );
  }
}

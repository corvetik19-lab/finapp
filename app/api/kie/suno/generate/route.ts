import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

const SUNO_API_URL = "https://api.kie.ai/api/v1/generate";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "KIE_API_KEY не настроен" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { 
      prompt, 
      customMode = false, 
      instrumental = false, 
      model = "V4_5",
      style,
      title,
      negativeStyle,
      vocalGender,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Не указано описание музыки" },
        { status: 400 }
      );
    }

    // Формируем запрос согласно документации Suno API
    const sunoRequest: Record<string, unknown> = {
      prompt: prompt.substring(0, customMode ? 5000 : 500),
      customMode,
      instrumental,
      model, // V5, V4_5PLUS, V4_5, V4_5ALL, V4
    };

    // В customMode нужны style и title
    if (customMode) {
      if (style) sunoRequest.style = style.substring(0, 1000);
      if (title) sunoRequest.title = title.substring(0, 80);
      if (negativeStyle) sunoRequest.negativeStyle = negativeStyle;
      if (vocalGender) sunoRequest.vocalGender = vocalGender;
    }

    console.log("Suno API request:", JSON.stringify(sunoRequest, null, 2));

    const response = await fetch(SUNO_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sunoRequest),
    });

    const data = await response.json();
    console.log("Suno API response:", JSON.stringify(data, null, 2));

    if (!response.ok || data.code !== 200) {
      return NextResponse.json(
        { error: data.msg || data.message || "Ошибка Suno API" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      taskId: data.data.taskId,
    });

  } catch (error) {
    console.error("Suno generate error:", error);
    
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

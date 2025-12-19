import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getKieClient, getModelById } from "@/lib/kie";

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

    const body = await request.json();
    const { modelId, input } = body;

    if (!modelId) {
      return NextResponse.json(
        { error: "Не указана модель" },
        { status: 400 }
      );
    }

    if (!input || typeof input !== "object") {
      return NextResponse.json(
        { error: "Не указаны входные данные" },
        { status: 400 }
      );
    }

    const model = getModelById(modelId);
    if (!model) {
      return NextResponse.json(
        { error: "Модель не найдена" },
        { status: 404 }
      );
    }

    // Validate required fields (skip file fields - they are validated as image_input array)
    for (const field of model.inputFields) {
      if (field.required && field.type !== "file" && !input[field.name]) {
        return NextResponse.json(
          { error: `Поле "${field.labelRu}" обязательно` },
          { status: 400 }
        );
      }
    }
    
    // Validate file fields separately
    for (const field of model.inputFields) {
      if (field.required && field.type === "file") {
        const fileValue = input[field.name];
        if (!fileValue || (Array.isArray(fileValue) && fileValue.length === 0)) {
          return NextResponse.json(
            { error: `Поле "${field.labelRu}" обязательно` },
            { status: 400 }
          );
        }
      }
    }

    const client = getKieClient();
    
    // Prepare input for API
    const apiInput = { ...input };
    
    // For nano-banana-pro, convert image_input to array format if it's a string URL
    if (model.modelId === "nano-banana-pro") {
      if (apiInput.image_input && typeof apiInput.image_input === "string") {
        apiInput.image_input = [apiInput.image_input];
      } else if (!apiInput.image_input) {
        apiInput.image_input = [];
      }
    }
    
    // Create task
    const result = await client.createTask(model.modelId, apiInput);

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      model: {
        id: model.id,
        name: model.nameRu,
        category: model.category,
      },
    });

  } catch (error) {
    console.error("Kie create task error:", error);
    
    let message = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    // Переводим известные ошибки на русский
    if (message.includes("insufficient") || message.includes("credits")) {
      message = "⚠️ Недостаточно кредитов на аккаунте Kie.ai. Пожалуйста, пополните баланс на kie.ai";
    } else if (message.includes("rate limit")) {
      message = "⏳ Превышен лимит запросов. Подождите немного и попробуйте снова";
    } else if (message.includes("unauthorized") || message.includes("invalid key")) {
      message = "🔑 Ошибка авторизации API. Проверьте ключ Kie.ai";
    } else if (message.includes("timeout")) {
      message = "⏰ Превышено время ожидания. Попробуйте снова";
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

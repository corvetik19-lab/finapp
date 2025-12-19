import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

const SUNO_STATUS_URL = "https://api.kie.ai/api/v1/generate/record-info";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Не указан taskId" },
        { status: 400 }
      );
    }

    const response = await fetch(`${SUNO_STATUS_URL}?taskId=${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      return NextResponse.json(
        { error: data.msg || data.message || "Ошибка получения статуса" },
        { status: response.status }
      );
    }

    const taskData = data.data;
    const status = taskData.status?.toUpperCase() || "PENDING";
    
    // Определяем прогресс и статус
    let progress = 0;
    let progressText = "";
    let isProcessing = true;
    let isSuccess = false;
    let isFailed = false;
    
    switch (status) {
      case "PENDING":
      case "QUEUED":
        progress = 10;
        progressText = "В очереди на генерацию...";
        break;
      case "PROCESSING":
      case "TEXT":
        progress = 30;
        progressText = "Генерация текста...";
        break;
      case "FIRST":
        progress = 60;
        progressText = "Создание первого трека...";
        break;
      case "COMPLETE":
      case "SUCCESS":
        progress = 100;
        progressText = "Готово!";
        isProcessing = false;
        isSuccess = true;
        break;
      case "FAILED":
      case "ERROR":
        progress = 0;
        progressText = "Ошибка";
        isProcessing = false;
        isFailed = true;
        break;
      default:
        progress = 20;
        progressText = `Обработка (${status})...`;
    }

    // Извлекаем URL аудио из ответа
    const resultUrls: string[] = [];
    if (taskData.response?.sunoData && Array.isArray(taskData.response.sunoData)) {
      for (const track of taskData.response.sunoData) {
        if (track.audioUrl) {
          resultUrls.push(track.audioUrl);
        }
      }
    }

    return NextResponse.json({
      taskId: taskData.taskId,
      status,
      progress,
      progressText,
      isProcessing,
      isSuccess,
      isFailed,
      resultUrls,
      tracks: taskData.response?.sunoData || [],
      errorMessage: isFailed ? (taskData.errorMessage || "Ошибка генерации") : null,
    });

  } catch (error) {
    console.error("Suno status error:", error);
    
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

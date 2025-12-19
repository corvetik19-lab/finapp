import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getKieClient, KIE_TASK_STATES } from "@/lib/kie";

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

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Не указан taskId" },
        { status: 400 }
      );
    }

    const client = getKieClient();
    const status = await client.getTaskStatus(taskId);

    // Parse result if task is successful
    let resultUrls: string[] = [];
    if (status.state === KIE_TASK_STATES.SUCCESS && status.resultJson) {
      const result = client.parseTaskResult(status.resultJson);
      if (result?.resultUrls) {
        resultUrls = result.resultUrls;
      }
    }

    // Calculate progress percentage based on state
    let progress = 0;
    let progressText = "";
    switch (status.state) {
      case KIE_TASK_STATES.WAITING:
        progress = 10;
        progressText = "Ожидание в очереди...";
        break;
      case KIE_TASK_STATES.QUEUING:
        progress = 30;
        progressText = "В очереди на генерацию...";
        break;
      case KIE_TASK_STATES.GENERATING:
        progress = 65;
        progressText = "Генерация изображения...";
        break;
      case KIE_TASK_STATES.SUCCESS:
        progress = 100;
        progressText = "Готово!";
        break;
      case KIE_TASK_STATES.FAIL:
        progress = 0;
        progressText = "Ошибка";
        break;
    }

    return NextResponse.json({
      taskId: status.taskId,
      model: status.model,
      state: status.state,
      progress,
      progressText,
      isProcessing: client.isTaskProcessing(status.state),
      isSuccess: client.isTaskSuccess(status.state),
      isFailed: client.isTaskFailed(status.state),
      resultUrls,
      errorCode: status.failCode || null,
      errorMessage: status.failMsg || null,
      createdAt: status.createTime,
      completedAt: status.completeTime || null,
    });

  } catch (error) {
    console.error("Kie task status error:", error);
    
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET - получить статус onboarding
 */
export async function GET() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // Если записи нет, создаём новую
    if (!data) {
      const { data: newProgress, error: insertError } = await supabase
        .from("onboarding_progress")
        .insert({
          user_id: user.id,
          completed: false,
          current_step: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json(newProgress);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - обновить прогресс onboarding
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { current_step, step_id, completed, skipped } = body;

    const updateData: Record<string, string | number | string[] | boolean> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof current_step === "number") {
      updateData.current_step = current_step;
    }

    if (step_id) {
      // Добавляем шаг в список завершённых
      const { data: currentProgress } = await supabase
        .from("onboarding_progress")
        .select("steps_completed")
        .eq("user_id", user.id)
        .single();

      const stepsCompleted = currentProgress?.steps_completed || [];
      if (!stepsCompleted.includes(step_id)) {
        updateData.steps_completed = [...stepsCompleted, step_id];
      }
    }

    if (typeof completed === "boolean") {
      updateData.completed = completed;
      if (completed) {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (typeof skipped === "boolean") {
      updateData.skipped = skipped;
    }

    const { data, error } = await supabase
      .from("onboarding_progress")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Onboarding PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - сбросить onboarding (для повторного прохождения)
 */
export async function POST() {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("onboarding_progress")
      .update({
        completed: false,
        current_step: 0,
        steps_completed: [],
        skipped: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

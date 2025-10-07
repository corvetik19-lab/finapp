import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/helpers";
import { reportFormSchema } from "@/lib/reports/schema";

// GET /api/reports - получить все сохранённые отчёты
export async function GET() {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch reports:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    // Преобразуем snake_case в camelCase для фронтенда
    const reports = data?.map(report => ({
      id: report.id,
      name: report.name,
      category: report.category,
      period: report.period,
      dateFrom: report.date_from,
      dateTo: report.date_to,
      dataTypes: report.data_types || [],
      categories: report.categories || [],
      accounts: report.accounts || [],
      reportType: report.report_type,
      format: report.format,
      note: report.note,
      createdAt: report.created_at,
    })) || [];

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/reports - создать/сохранить отчёт
export async function POST(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = reportFormSchema.parse(body);

    // Конвертируем даты в формат date для БД (если они есть)
    const dateFrom = validatedData.dateFrom 
      ? new Date(validatedData.dateFrom).toISOString().split('T')[0] 
      : null;
    const dateTo = validatedData.dateTo 
      ? new Date(validatedData.dateTo).toISOString().split('T')[0] 
      : null;

    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        name: validatedData.name,
        category: validatedData.category,
        period: validatedData.period,
        date_from: dateFrom,
        date_to: dateTo,
        data_types: validatedData.dataTypes,
        categories: validatedData.categories || [],
        accounts: validatedData.accounts || [],
        report_type: validatedData.reportType,
        format: validatedData.format,
        note: validatedData.note || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create report:", error);
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 });
  }
}

// DELETE /api/reports?id=... - удалить отчёт
export async function DELETE(req: Request) {
  try {
    const supabase = await createRouteClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete report:", error);
      return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

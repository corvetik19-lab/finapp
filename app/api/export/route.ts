import { NextResponse } from "next/server";
import { createRSCClient } from "@/lib/supabase/server";
import { generatePDFReport, type ExportData } from "@/lib/export/pdf";
import { generateExcelReport } from "@/lib/export/excel";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createRSCClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "pdf"; // pdf, excel
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing start or end date" },
        { status: 400 }
      );
    }

    // Получаем транзакции за период
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select(`
        id,
        date,
        description,
        amount,
        direction,
        categories!inner(name)
      `)
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (txError) throw txError;

    // Подготавливаем данные
    const totalIncome = (transactions || [])
      .filter((t: { direction: string }) => t.direction === "income")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const totalExpense = (transactions || [])
      .filter((t: { direction: string }) => t.direction === "expense")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    // Группируем по категориям
    const categoryMap = new Map<string, number>();
    (transactions || [])
      .filter((t: { direction: string }) => t.direction === "expense")
      .forEach((t: { amount: number; categories?: Array<{ name: string }> }) => {
        const catName = t.categories?.[0]?.name || "Без категории";
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + t.amount);
      });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, amount]) => ({
        category,
        amount,
      })
    );

    const exportData: ExportData = {
      transactions: (transactions || []).map((t: { date: string; description?: string; categories?: Array<{ name: string }>; amount: number; direction: string }) => ({
        date: t.date,
        description: t.description || "",
        category: t.categories?.[0]?.name || "Без категории",
        amount: t.amount,
        direction: t.direction,
      })),
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
      categoryBreakdown,
    };

    // Генерация файла
    let blob: Blob;
    let filename: string;
    let mimeType: string;

    if (format === "excel") {
      blob = await generateExcelReport(exportData);
      filename = `finapp-report-${startDate}-${endDate}.xlsx`;
      mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else {
      blob = await generatePDFReport(exportData);
      filename = `finapp-report-${startDate}-${endDate}.pdf`;
      mimeType = "application/pdf";
    }

    // Возвращаем файл
    return new NextResponse(blob, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

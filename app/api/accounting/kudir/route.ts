import { NextRequest, NextResponse } from "next/server";
import {
  getKudirEntriesFull,
  getKudirYearSummary,
  createKudirEntryManual,
  syncKudirFromDocuments,
  getKudirExportData,
  KudirFilters,
} from "@/lib/accounting/kudir-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "entries";
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const quarter = searchParams.get("quarter") ? parseInt(searchParams.get("quarter")!) : undefined;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const entryType = searchParams.get("entryType") as "income" | "expense" | "all" | undefined;
  const search = searchParams.get("search") || undefined;

  try {
    switch (action) {
      case "entries": {
        const filters: KudirFilters = { year, quarter, month, entryType, search };
        const entries = await getKudirEntriesFull(filters);
        return NextResponse.json({ entries });
      }

      case "summary": {
        const summary = await getKudirYearSummary(year);
        return NextResponse.json(summary);
      }

      case "export": {
        const data = await getKudirExportData(year);
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in kudir API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { entryDate, description, income, expense, documentId, tenderId } = body;

        if (!entryDate || !description) {
          return NextResponse.json(
            { error: "entryDate and description are required" },
            { status: 400 }
          );
        }

        const result = await createKudirEntryManual({
          entryDate,
          description,
          income,
          expense,
          documentId,
          tenderId,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ entryId: result.entryId });
      }

      case "sync": {
        const { year } = body;

        if (!year) {
          return NextResponse.json({ error: "year is required" }, { status: 400 });
        }

        const result = await syncKudirFromDocuments(year);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ created: result.created });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in kudir API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

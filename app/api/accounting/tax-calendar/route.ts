import { NextRequest, NextResponse } from "next/server";
import {
  getTaxCalendar,
  getUpcomingTaxPayments,
  getOverdueTaxPayments,
  getTaxStatistics,
  createTaxPayment,
  generateTaxCalendarForYear,
  TaxType,
} from "@/lib/accounting/tax-calendar-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "calendar";
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const days = parseInt(searchParams.get("days") || "30");

  try {
    switch (action) {
      case "calendar":
        const calendar = await getTaxCalendar(year);
        return NextResponse.json({ entries: calendar });

      case "upcoming":
        const upcoming = await getUpcomingTaxPayments(days);
        return NextResponse.json({ entries: upcoming });

      case "overdue":
        const overdue = await getOverdueTaxPayments();
        return NextResponse.json({ entries: overdue });

      case "statistics":
        const stats = await getTaxStatistics(year);
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in tax calendar API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { taxType, taxName, period, dueDate, amount, notes } = body;

        if (!taxType || !period || !dueDate) {
          return NextResponse.json(
            { error: "taxType, period, and dueDate are required" },
            { status: 400 }
          );
        }

        const result = await createTaxPayment({
          taxType: taxType as TaxType,
          taxName,
          period,
          dueDate,
          amount,
          notes,
        });

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ paymentId: result.paymentId });
      }

      case "generate": {
        const { year, taxTypes } = body;

        if (!year || !taxTypes || !Array.isArray(taxTypes)) {
          return NextResponse.json(
            { error: "year and taxTypes array are required" },
            { status: 400 }
          );
        }

        const result = await generateTaxCalendarForYear(year, taxTypes as TaxType[]);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ created: result.created });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in tax calendar API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getIncomeExpenseReport,
  getVatReport,
  getProfitLossReport,
  getCounterpartyReport,
  getTenderReport,
  ReportFilters,
  ReportPeriod,
} from "@/lib/accounting/reports-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const period = (searchParams.get("period") || "month") as ReportPeriod;
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const type = searchParams.get("type") || "income-expense";

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "dateFrom and dateTo are required" },
      { status: 400 }
    );
  }

  const filters: ReportFilters = {
    period,
    dateFrom,
    dateTo,
  };

  try {
    let reportData;

    switch (type) {
      case "income-expense":
        reportData = await getIncomeExpenseReport(filters);
        break;
      case "vat":
        reportData = await getVatReport(filters);
        break;
      case "profit-loss":
        reportData = await getProfitLossReport(filters);
        break;
      case "counterparty":
        reportData = await getCounterpartyReport(filters);
        break;
      case "tender":
        reportData = await getTenderReport(filters);
        break;
      default:
        return NextResponse.json(
          { error: "Unknown report type" },
          { status: 400 }
        );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

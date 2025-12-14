import { NextRequest, NextResponse } from "next/server";
import {
  calculateUsn6,
  calculateUsn15,
  calculateVat,
  calculateIpInsurance,
  calculateEmployeeInsurance,
} from "@/lib/accounting/tax-calculator-service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "usn6";
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const quarter = parseInt(searchParams.get("quarter") || "1");
  const hasEmployees = searchParams.get("hasEmployees") === "true";

  try {
    switch (type) {
      case "usn6": {
        const result = await calculateUsn6(year, hasEmployees);
        return NextResponse.json(result);
      }

      case "usn15": {
        const result = await calculateUsn15(year);
        return NextResponse.json(result);
      }

      case "vat": {
        const result = await calculateVat(year, quarter);
        return NextResponse.json(result);
      }

      case "ip-insurance": {
        const result = await calculateIpInsurance(year);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown calculator type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in tax calculator API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, salaries } = body;

    if (type === "employee-insurance") {
      if (!salaries || !Array.isArray(salaries)) {
        return NextResponse.json(
          { error: "salaries array is required" },
          { status: 400 }
        );
      }

      const result = calculateEmployeeInsurance(salaries);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown calculator type" }, { status: 400 });
  } catch (error) {
    console.error("Error in tax calculator API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

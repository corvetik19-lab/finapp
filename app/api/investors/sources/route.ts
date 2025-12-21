import { NextResponse } from "next/server";
import { getSources } from "@/lib/investors/service";

export async function GET() {
  try {
    const sources = await getSources();
    return NextResponse.json({ data: sources });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json({ error: "Ошибка загрузки источников" }, { status: 500 });
  }
}

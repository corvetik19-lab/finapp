import { NextResponse } from "next/server";
import { getDrivers } from "@/lib/logistics/service";

export async function GET() {
  try {
    const drivers = await getDrivers();
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении водителей' },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { exportTransactionsAction } from "../actions";

export async function GET(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  return exportTransactionsAction({ searchParams });
}

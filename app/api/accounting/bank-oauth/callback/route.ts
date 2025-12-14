import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/accounting/bank-oauth";
import { BankCode } from "@/lib/accounting/bank-types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const bankCode = searchParams.get("bank") as BankCode || "tinkoff";

  // Базовый URL для редиректа
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUrl = `${baseUrl}/tenders/accounting/bank-integrations`;

  // Обработка ошибки от банка
  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Проверка обязательных параметров
  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent("Отсутствуют обязательные параметры")}`
    );
  }

  // Обмен code на токены
  const result = await exchangeCodeForTokens(bankCode, code, state);

  if (!result.success) {
    return NextResponse.redirect(
      `${redirectUrl}?error=${encodeURIComponent(result.error || "Ошибка авторизации")}`
    );
  }

  // Успешная авторизация
  return NextResponse.redirect(`${redirectUrl}?success=true`);
}

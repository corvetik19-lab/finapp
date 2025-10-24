import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1 - API информация и доступные endpoints
 */
export async function GET() {
  return NextResponse.json({
    name: "Finappka API",
    version: "1.0.0",
    description: "REST API для доступа к данным финансового трекера",
    documentation: "/api/docs",
    endpoints: {
      transactions: {
        list: "GET /api/v1/transactions",
        create: "POST /api/v1/transactions",
        description: "Управление транзакциями",
      },
      accounts: {
        list: "GET /api/v1/accounts",
        create: "POST /api/v1/accounts",
        description: "Управление счетами",
      },
      budgets: {
        list: "GET /api/v1/budgets",
        create: "POST /api/v1/budgets",
        description: "Управление бюджетами",
      },
      categories: {
        list: "GET /api/v1/categories",
        create: "POST /api/v1/categories",
        description: "Управление категориями",
      },
    },
    authentication: {
      type: "API Key",
      header: "Authorization: Bearer YOUR_API_KEY",
      obtain: "Сгенерируйте ключ в настройках профиля",
    },
    rate_limiting: {
      default: "100 requests per minute",
      headers: {
        limit: "X-RateLimit-Limit",
        remaining: "X-RateLimit-Remaining",
      },
    },
    support: {
      email: "support@finappka.com",
      docs: "https://finappka.com/docs/api",
    },
  });
}

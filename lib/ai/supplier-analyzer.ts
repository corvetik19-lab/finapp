/**
 * AI Анализатор поставщиков
 * Оценка рисков, рекомендации, мониторинг
 */

import { getGeminiClient, GEMINI_MODELS } from "./openrouter-compat";
import { searchEntities, getEntityRelations } from "./entity-extractor";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface SupplierRiskAssessment {
  supplierId: string;
  supplierName: string;
  overallRisk: "low" | "medium" | "high" | "critical";
  riskScore: number; // 0-100
  riskFactors: Array<{
    category: string;
    factor: string;
    severity: "low" | "medium" | "high";
    details: string;
  }>;
  certificates: Array<{
    name: string;
    status: "valid" | "expired" | "missing" | "unknown";
    expiryDate?: string;
  }>;
  recommendations: string[];
  lastUpdated: string;
}

export interface SupplierComparison {
  suppliers: Array<{
    id: string;
    name: string;
    score: number;
    pros: string[];
    cons: string[];
  }>;
  recommendation: string;
  criteria: Array<{
    name: string;
    weight: number;
    scores: Record<string, number>;
  }>;
}

export interface PurchaseRecommendation {
  productName: string;
  recommendedSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    score: number;
    price?: number;
    deliveryTime?: string;
    reason: string;
  }>;
  alternativeProducts: Array<{
    name: string;
    reason: string;
  }>;
}

/**
 * Оценивает риски поставщика
 */
export async function assessSupplierRisk(
  supplierId: string,
  userId: string
): Promise<SupplierRiskAssessment> {
  const supabase = await createRSCClient();

  // Получаем данные поставщика
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  // Ищем связанные сущности (сертификаты, лицензии)
  const entities = await searchEntities(supplier.name, userId, undefined, 20);
  
  // Получаем связи
  const certificates: Array<{
    name: string;
    status: "valid" | "expired" | "missing" | "unknown";
    expiryDate?: string;
  }> = [];

  for (const entity of entities) {
    if (entity.type === "certificate" || entity.type === "license") {
      certificates.push({
        name: entity.name,
        status: "valid", // TODO: проверять срок действия
        expiryDate: entity.data.expiryDate as string | undefined,
      });
    }

    const relations = await getEntityRelations(entity.id, userId, 1);
    for (const rel of relations) {
      if (rel.relType === "HAS_CERT") {
        certificates.push({
          name: rel.toName,
          status: "valid",
        });
      }
    }
  }

  // Получаем историю заказов
  const { data: orders } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("supplier_id", supplierId)
    .order("occurred_at", { ascending: false })
    .limit(50);

  // Анализируем через Gemini
  const client = getGeminiClient();

  const analysisPrompt = `Проанализируй риски поставщика и дай оценку.

ПОСТАВЩИК:
- Название: ${supplier.name}
- ИНН: ${supplier.inn || "не указан"}
- Адрес: ${supplier.address || "не указан"}
- Контакты: ${supplier.contact_email || ""} ${supplier.contact_phone || ""}

СЕРТИФИКАТЫ И ЛИЦЕНЗИИ:
${certificates.map(c => `- ${c.name} (${c.status})`).join("\n") || "Не найдены"}

ИСТОРИЯ ЗАКАЗОВ:
- Всего заказов: ${orders?.length || 0}
- Последний заказ: ${orders?.[0]?.occurred_at || "нет данных"}

Оцени риски по категориям:
1. Финансовые риски
2. Репутационные риски
3. Операционные риски
4. Юридические риски
5. Риски качества

Ответь в формате JSON:
{
  "overallRisk": "low|medium|high|critical",
  "riskScore": 0-100,
  "riskFactors": [
    {
      "category": "финансовый",
      "factor": "описание фактора",
      "severity": "low|medium|high",
      "details": "подробности"
    }
  ],
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");

    return {
      supplierId,
      supplierName: supplier.name,
      overallRisk: result.overallRisk || "medium",
      riskScore: result.riskScore || 50,
      riskFactors: result.riskFactors || [],
      certificates,
      recommendations: result.recommendations || [],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Supplier risk assessment error:", error);
    
    return {
      supplierId,
      supplierName: supplier.name,
      overallRisk: "medium",
      riskScore: 50,
      riskFactors: [],
      certificates,
      recommendations: ["Недостаточно данных для полной оценки рисков"],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Сравнивает поставщиков
 */
export async function compareSuppliers(
  supplierIds: string[],
  userId: string,
  criteria?: string[]
): Promise<SupplierComparison> {
  const supabase = await createRSCClient();

  // Получаем данные поставщиков
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .in("id", supplierIds);

  if (!suppliers || suppliers.length === 0) {
    throw new Error("Suppliers not found");
  }

  // Получаем историю заказов для каждого
  const supplierData = await Promise.all(
    suppliers.map(async (supplier) => {
      const { data: orders } = await supabase
        .from("transactions")
        .select("amount_minor, occurred_at")
        .eq("user_id", userId)
        .eq("supplier_id", supplier.id)
        .order("occurred_at", { ascending: false })
        .limit(20);

      const totalAmount = orders?.reduce((sum, o) => sum + Math.abs(o.amount_minor), 0) || 0;
      
      return {
        ...supplier,
        ordersCount: orders?.length || 0,
        totalAmount: totalAmount / 100,
        lastOrder: orders?.[0]?.occurred_at,
      };
    })
  );

  // Анализируем через Gemini
  const client = getGeminiClient();

  const defaultCriteria = criteria || [
    "Цена",
    "Качество",
    "Надёжность",
    "Скорость доставки",
    "Условия оплаты",
  ];

  const comparisonPrompt = `Сравни поставщиков и дай рекомендацию.

ПОСТАВЩИКИ:
${supplierData.map(s => `
- ${s.name}
  ИНН: ${s.inn || "не указан"}
  Заказов: ${s.ordersCount}
  Общая сумма: ${s.totalAmount.toFixed(2)} ₽
  Последний заказ: ${s.lastOrder || "нет"}
`).join("\n")}

КРИТЕРИИ СРАВНЕНИЯ: ${defaultCriteria.join(", ")}

Ответь в формате JSON:
{
  "suppliers": [
    {
      "id": "id поставщика",
      "name": "название",
      "score": 0-100,
      "pros": ["преимущество 1"],
      "cons": ["недостаток 1"]
    }
  ],
  "recommendation": "итоговая рекомендация",
  "criteria": [
    {
      "name": "критерий",
      "weight": 0.2,
      "scores": {"supplier_id": 80}
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: comparisonPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");

    return {
      suppliers: result.suppliers || supplierData.map(s => ({
        id: s.id,
        name: s.name,
        score: 50,
        pros: [],
        cons: [],
      })),
      recommendation: result.recommendation || "Недостаточно данных для рекомендации",
      criteria: result.criteria || [],
    };
  } catch (error) {
    logger.error("Supplier comparison error:", error);
    
    return {
      suppliers: supplierData.map(s => ({
        id: s.id,
        name: s.name,
        score: 50,
        pros: [],
        cons: [],
      })),
      recommendation: "Ошибка при сравнении. Попробуйте позже.",
      criteria: [],
    };
  }
}

/**
 * Рекомендует поставщиков для закупки
 */
export async function recommendSuppliersForPurchase(
  productName: string,
  userId: string,
  quantity?: number,
  budget?: number
): Promise<PurchaseRecommendation> {
  const supabase = await createRSCClient();

  // Ищем поставщиков по товару
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _entities = await searchEntities(
    `${productName} поставщик`,
    userId,
    "supplier",
    10
  );

  // Получаем всех поставщиков
  const { data: allSuppliers } = await supabase
    .from("suppliers")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .limit(20);

  // Получаем историю закупок этого товара
  const { data: productHistory } = await supabase
    .from("transaction_items")
    .select(`
      *,
      transactions!inner(supplier_id, occurred_at)
    `)
    .eq("transactions.user_id", userId)
    .ilike("name", `%${productName}%`)
    .order("transactions.occurred_at", { ascending: false })
    .limit(20);

  // Собираем данные о поставщиках этого товара
  const supplierStats = new Map<string, {
    count: number;
    avgPrice: number;
    lastDate: string;
  }>();

  productHistory?.forEach((item) => {
    const supplierId = item.transactions?.supplier_id;
    if (!supplierId) return;

    const existing = supplierStats.get(supplierId) || {
      count: 0,
      avgPrice: 0,
      lastDate: "",
    };

    supplierStats.set(supplierId, {
      count: existing.count + 1,
      avgPrice: (existing.avgPrice * existing.count + item.price_per_unit) / (existing.count + 1),
      lastDate: item.transactions?.occurred_at || existing.lastDate,
    });
  });

  // Анализируем через Gemini
  const client = getGeminiClient();

  const recommendPrompt = `Рекомендуй поставщиков для закупки товара.

ТОВАР: ${productName}
${quantity ? `КОЛИЧЕСТВО: ${quantity}` : ""}
${budget ? `БЮДЖЕТ: ${budget} ₽` : ""}

ИСТОРИЯ ЗАКУПОК:
${Array.from(supplierStats.entries()).map(([id, stats]) => {
  const supplier = allSuppliers?.find(s => s.id === id);
  return `- ${supplier?.name || id}: ${stats.count} закупок, средняя цена ${(stats.avgPrice / 100).toFixed(2)} ₽`;
}).join("\n") || "Нет истории"}

ДОСТУПНЫЕ ПОСТАВЩИКИ:
${allSuppliers?.map(s => `- ${s.name} (ИНН: ${s.inn || "не указан"})`).join("\n") || "Нет данных"}

Ответь в формате JSON:
{
  "recommendedSuppliers": [
    {
      "supplierId": "id или null",
      "supplierName": "название",
      "score": 0-100,
      "price": цена или null,
      "deliveryTime": "срок доставки или null",
      "reason": "причина рекомендации"
    }
  ],
  "alternativeProducts": [
    {
      "name": "альтернативный товар",
      "reason": "почему может подойти"
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: recommendPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const result = JSON.parse(response.text || "{}");

    return {
      productName,
      recommendedSuppliers: result.recommendedSuppliers || [],
      alternativeProducts: result.alternativeProducts || [],
    };
  } catch (error) {
    logger.error("Purchase recommendation error:", error);
    
    return {
      productName,
      recommendedSuppliers: [],
      alternativeProducts: [],
    };
  }
}

/**
 * Анализирует надёжность поставщика по истории
 */
export async function analyzeSupplierReliability(
  supplierId: string,
  userId: string
): Promise<{
  reliability: number;
  onTimeDelivery: number;
  qualityScore: number;
  priceStability: number;
  issues: string[];
  trend: "improving" | "stable" | "declining";
}> {
  const supabase = await createRSCClient();

  // Получаем историю заказов
  const { data: orders } = await supabase
    .from("transactions")
    .select("*, transaction_items(*)")
    .eq("user_id", userId)
    .eq("supplier_id", supplierId)
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (!orders || orders.length < 3) {
    return {
      reliability: 50,
      onTimeDelivery: 50,
      qualityScore: 50,
      priceStability: 50,
      issues: ["Недостаточно данных для анализа"],
      trend: "stable",
    };
  }

  // Анализируем через Gemini
  const client = getGeminiClient();

  const analysisPrompt = `Проанализируй надёжность поставщика на основе истории заказов.

ИСТОРИЯ ЗАКАЗОВ (последние ${orders.length}):
${orders.slice(0, 20).map(o => `
- Дата: ${o.occurred_at}
  Сумма: ${(Math.abs(o.amount_minor) / 100).toFixed(2)} ₽
  Позиций: ${o.transaction_items?.length || 0}
`).join("\n")}

Оцени:
1. Общая надёжность (0-100)
2. Своевременность поставок (0-100)
3. Качество товаров (0-100)
4. Стабильность цен (0-100)

Ответь в формате JSON:
{
  "reliability": 80,
  "onTimeDelivery": 85,
  "qualityScore": 75,
  "priceStability": 90,
  "issues": ["проблема 1"],
  "trend": "improving|stable|declining"
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: analysisPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch {
    return {
      reliability: 50,
      onTimeDelivery: 50,
      qualityScore: 50,
      priceStability: 50,
      issues: ["Ошибка анализа"],
      trend: "stable",
    };
  }
}

/**
 * Генерирует отчёт по поставщикам
 */
export async function generateSupplierReport(
  userId: string,
  period: { start: string; end: string }
): Promise<string> {
  const supabase = await createRSCClient();

  // Получаем статистику по поставщикам за период
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      supplier_id,
      amount_minor,
      occurred_at,
      suppliers(name)
    `)
    .eq("user_id", userId)
    .eq("direction", "expense")
    .gte("occurred_at", period.start)
    .lte("occurred_at", period.end)
    .not("supplier_id", "is", null);

  // Группируем по поставщикам
  const supplierStats = new Map<string, {
    name: string;
    total: number;
    count: number;
  }>();

  transactions?.forEach((t) => {
    if (!t.supplier_id) return;
    const existing = supplierStats.get(t.supplier_id) || {
      name: (t.suppliers as { name?: string } | null)?.name || "Неизвестный",
      total: 0,
      count: 0,
    };
    supplierStats.set(t.supplier_id, {
      name: existing.name,
      total: existing.total + Math.abs(t.amount_minor),
      count: existing.count + 1,
    });
  });

  // Генерируем отчёт через Gemini
  const client = getGeminiClient();

  const statsArray = Array.from(supplierStats.entries())
    .sort((a, b) => b[1].total - a[1].total);

  const reportPrompt = `Создай аналитический отчёт по поставщикам.

ПЕРИОД: ${period.start} - ${period.end}

СТАТИСТИКА ПО ПОСТАВЩИКАМ:
${statsArray.map(([, stats]) => 
  `- ${stats.name}: ${(stats.total / 100).toFixed(2)} ₽ (${stats.count} заказов)`
).join("\n") || "Нет данных"}

ОБЩАЯ СУММА: ${(statsArray.reduce((sum, [, s]) => sum + s.total, 0) / 100).toFixed(2)} ₽

Создай структурированный отчёт:
1. 📊 Общая статистика
2. 🏆 ТОП-5 поставщиков
3. 📈 Тренды и динамика
4. ⚠️ Риски и рекомендации
5. 💡 Возможности оптимизации

Используй эмодзи и маркированные списки.`;

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: reportPrompt,
  });

  return response.text || "Не удалось создать отчёт.";
}

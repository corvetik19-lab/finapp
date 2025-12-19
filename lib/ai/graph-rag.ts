/**
 * Graph-RAG для тендеров
 * Комбинирует семантический поиск с графом знаний
 */

import { getGeminiClient, GEMINI_MODELS } from "./gemini-client";
import { searchDocumentChunks } from "./document-processor";
import { searchEntities, getEntityRelations } from "./entity-extractor";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface GraphRAGContext {
  documentChunks: Array<{
    text: string;
    documentId: string;
    similarity: number;
  }>;
  entities: Array<{
    id: string;
    type: string;
    name: string;
    data: Record<string, unknown>;
  }>;
  relations: Array<{
    fromName: string;
    relType: string;
    toName: string;
  }>;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  overallScore: number;
  requirements: Array<{
    requirement: string;
    status: "met" | "not_met" | "partial" | "unknown";
    details: string;
    relatedEntities: string[];
  }>;
  missingDocuments: string[];
  recommendations: string[];
}

/**
 * Собирает контекст из графа знаний и документов
 */
export async function buildGraphRAGContext(
  query: string,
  userId: string,
  options: {
    tenderId?: string;
    supplierId?: string;
    module?: string;
    maxChunks?: number;
    maxEntities?: number;
  } = {}
): Promise<GraphRAGContext> {
  // 1. Поиск релевантных чанков документов
  const chunks = await searchDocumentChunks(query, userId, {
    module: options.module || "tenders",
    limit: options.maxChunks || 5,
    threshold: 0.6,
  });

  // 2. Поиск релевантных сущностей
  const entities = await searchEntities(
    query,
    userId,
    undefined,
    options.maxEntities || 10
  );

  // 3. Получаем связи для найденных сущностей
  const allRelations: Array<{
    fromName: string;
    relType: string;
    toName: string;
  }> = [];

  for (const entity of entities.slice(0, 5)) {
    const relations = await getEntityRelations(entity.id, userId, 1);
    
    for (const rel of relations) {
      allRelations.push({
        fromName: rel.fromName,
        relType: rel.relType,
        toName: rel.toName,
      });
    }
  }

  // Убираем дубликаты связей
  const uniqueRelations = allRelations.filter(
    (rel, index, self) =>
      index ===
      self.findIndex(
        (r) =>
          r.fromName === rel.fromName &&
          r.relType === rel.relType &&
          r.toName === rel.toName
      )
  );

  return {
    documentChunks: chunks.map((c) => ({
      text: c.textContent,
      documentId: c.documentId,
      similarity: c.similarity,
    })),
    entities: entities.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      data: e.data,
    })),
    relations: uniqueRelations,
  };
}

/**
 * Форматирует контекст для промпта
 */
export function formatGraphContextForPrompt(context: GraphRAGContext): string {
  const parts: string[] = [];

  // Документы
  if (context.documentChunks.length > 0) {
    parts.push("📄 РЕЛЕВАНТНЫЕ ДОКУМЕНТЫ:");
    context.documentChunks.forEach((chunk, i) => {
      parts.push(`[Документ ${i + 1}] (релевантность: ${(chunk.similarity * 100).toFixed(0)}%)`);
      parts.push(chunk.text.substring(0, 500) + (chunk.text.length > 500 ? "..." : ""));
      parts.push("");
    });
  }

  // Сущности
  if (context.entities.length > 0) {
    parts.push("🏢 НАЙДЕННЫЕ СУЩНОСТИ:");
    context.entities.forEach((entity) => {
      const dataStr = Object.keys(entity.data).length > 0 
        ? ` (${JSON.stringify(entity.data)})`
        : "";
      parts.push(`• [${entity.type}] ${entity.name}${dataStr}`);
    });
    parts.push("");
  }

  // Связи
  if (context.relations.length > 0) {
    parts.push("🔗 СВЯЗИ:");
    context.relations.forEach((rel) => {
      parts.push(`• ${rel.fromName} —[${rel.relType}]→ ${rel.toName}`);
    });
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Отвечает на вопрос с использованием Graph-RAG
 */
export async function answerWithGraphRAG(
  question: string,
  userId: string,
  options: {
    tenderId?: string;
    supplierId?: string;
  } = {}
): Promise<string> {
  // Собираем контекст
  const context = await buildGraphRAGContext(question, userId, {
    tenderId: options.tenderId,
    supplierId: options.supplierId,
    module: "tenders",
  });

  if (
    context.documentChunks.length === 0 &&
    context.entities.length === 0
  ) {
    return "К сожалению, я не нашёл релевантной информации по вашему вопросу. Попробуйте загрузить документы или переформулировать вопрос.";
  }

  const contextText = formatGraphContextForPrompt(context);

  // Генерируем ответ
  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: `Ты — эксперт по анализу тендерной документации.

КОНТЕКСТ:
${contextText}

ВОПРОС ПОЛЬЗОВАТЕЛЯ:
${question}

Дай подробный ответ на основе предоставленного контекста. 
Если информации недостаточно, честно скажи об этом.
Ссылайся на конкретные документы и сущности из контекста.
Отвечай на русском языке.`,
  });

  return response.text || "Не удалось сгенерировать ответ.";
}

/**
 * Проверяет соответствие поставщика требованиям тендера
 */
export async function checkCompliance(
  tenderId: string,
  supplierId: string,
  userId: string
): Promise<ComplianceCheckResult> {
  const supabase = await createRSCClient();

  // Получаем информацию о тендере
  const { data: tender } = await supabase
    .from("tenders")
    .select("*")
    .eq("id", tenderId)
    .single();

  // Получаем информацию о поставщике
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (!tender || !supplier) {
    throw new Error("Tender or supplier not found");
  }

  // Ищем сущности поставщика (сертификаты, лицензии)
  const supplierEntities = await searchEntities(
    supplier.name,
    userId,
    undefined,
    20
  );

  // Ищем требования тендера из документов
  const tenderRequirements = await searchDocumentChunks(
    "требования сертификаты лицензии документы",
    userId,
    {
      module: "tenders",
      limit: 10,
    }
  );

  // Получаем связи
  const supplierCerts: string[] = [];
  for (const entity of supplierEntities) {
    if (entity.type === "certificate" || entity.type === "license") {
      supplierCerts.push(entity.name);
    }
    
    const relations = await getEntityRelations(entity.id, userId, 1);
    for (const rel of relations) {
      if (rel.relType === "HAS_CERT" && rel.toType === "certificate") {
        supplierCerts.push(rel.toName);
      }
    }
  }

  // Анализируем соответствие через Gemini
  const client = getGeminiClient();

  const analysisPrompt = `Проанализируй соответствие поставщика требованиям тендера.

ПОСТАВЩИК: ${supplier.name}
ИНН: ${supplier.inn || "не указан"}
Имеющиеся сертификаты/лицензии: ${supplierCerts.join(", ") || "не найдены"}

ТРЕБОВАНИЯ ТЕНДЕРА (из документов):
${tenderRequirements.map(c => c.textContent).join("\n\n").substring(0, 10000)}

Ответь в формате JSON:
{
  "isCompliant": true/false,
  "overallScore": 0-100,
  "requirements": [
    {
      "requirement": "описание требования",
      "status": "met|not_met|partial|unknown",
      "details": "пояснение",
      "relatedEntities": ["название сертификата"]
    }
  ],
  "missingDocuments": ["список недостающих документов"],
  "recommendations": ["рекомендации"]
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
      isCompliant: result.isCompliant || false,
      overallScore: result.overallScore || 0,
      requirements: result.requirements || [],
      missingDocuments: result.missingDocuments || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    logger.error("Compliance check error:", error);
    
    return {
      isCompliant: false,
      overallScore: 0,
      requirements: [],
      missingDocuments: [],
      recommendations: ["Ошибка при анализе соответствия. Попробуйте позже."],
    };
  }
}

/**
 * Анализирует риски по тендеру
 */
export async function analyzeRisks(
  tenderId: string,
  userId: string
): Promise<{
  risks: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    mitigation: string;
  }>;
  overallRisk: "low" | "medium" | "high" | "critical";
}> {
  // Собираем контекст по тендеру
  const context = await buildGraphRAGContext(
    "риски нарушения штрафы проблемы срыв сроки",
    userId,
    { tenderId, module: "tenders" }
  );

  const contextText = formatGraphContextForPrompt(context);

  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: `Проанализируй потенциальные риски по тендеру на основе документов.

КОНТЕКСТ:
${contextText}

Определи риски по категориям:
- Финансовые риски
- Риски срыва сроков
- Юридические риски
- Репутационные риски
- Технические риски

Ответь в формате JSON:
{
  "risks": [
    {
      "type": "финансовый",
      "severity": "high",
      "description": "описание риска",
      "mitigation": "способ минимизации"
    }
  ],
  "overallRisk": "medium"
}`,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return {
      risks: result.risks || [],
      overallRisk: result.overallRisk || "medium",
    };
  } catch {
    return {
      risks: [],
      overallRisk: "medium",
    };
  }
}

/**
 * Генерирует сводку по тендеру
 */
export async function generateTenderSummary(
  tenderId: string,
  userId: string
): Promise<string> {
  const supabase = await createRSCClient();

  // Получаем документы тендера
  const { data: docs } = await supabase
    .from("documents")
    .select("id, file_name")
    .eq("tender_id", tenderId)
    .eq("status", "completed");

  if (!docs || docs.length === 0) {
    return "Документы тендера не найдены или ещё не обработаны.";
  }

  // Собираем контекст
  const context = await buildGraphRAGContext(
    "тендер закупка требования условия сроки цена",
    userId,
    { tenderId, module: "tenders", maxChunks: 15 }
  );

  const contextText = formatGraphContextForPrompt(context);

  const client = getGeminiClient();

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.CHAT,
    contents: `Создай структурированную сводку по тендеру на основе документов.

КОНТЕКСТ:
${contextText}

Включи в сводку:
1. 📋 Общая информация (предмет закупки, заказчик)
2. 💰 Финансовые условия (НМЦ, обеспечение)
3. 📅 Ключевые даты и сроки
4. 📄 Требования к участникам
5. 📦 Требования к продукции/услугам
6. ⚠️ Важные особенности и ограничения

Форматируй ответ с эмодзи и маркированными списками.`,
  });

  const summary = response.text || "Не удалось создать сводку.";

  // Сохраняем в БД
  await supabase.from("ai_summaries").insert({
    user_id: userId,
    tender_id: tenderId,
    summary_type: "tender_requirements",
    title: "Сводка по тендеру",
    content: summary,
    model_used: GEMINI_MODELS.CHAT,
  });

  return summary;
}

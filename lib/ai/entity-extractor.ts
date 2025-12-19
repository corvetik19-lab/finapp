/**
 * Entity Extractor для Graph-RAG
 * Извлекает сущности и связи из документов с помощью Gemini
 */

import { getGeminiClient, GEMINI_MODELS } from "./gemini-client";
import { createEmbedding } from "./embeddings";
import { createRSCClient } from "@/lib/supabase/helpers";
import { logger } from "@/lib/logger";

export interface ExtractedEntity {
  type: string;
  name: string;
  normalizedName: string;
  externalId?: string;
  externalSource?: string;
  data: Record<string, unknown>;
  confidence: number;
}

export interface ExtractedRelation {
  fromEntityName: string;
  relationType: string;
  toEntityName: string;
  data?: Record<string, unknown>;
  confidence: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

/**
 * Типы сущностей для тендеров
 */
export const ENTITY_TYPES = {
  SUPPLIER: "supplier",
  CERTIFICATE: "certificate",
  GOST: "gost",
  REQUIREMENT: "requirement",
  PRODUCT: "product",
  PERSON: "person",
  ORGANIZATION: "organization",
  DOCUMENT: "document",
  LICENSE: "license",
} as const;

/**
 * Типы связей
 */
export const RELATION_TYPES = {
  HAS_CERT: "HAS_CERT",           // Поставщик имеет сертификат
  REQUIRES_CERT: "REQUIRES_CERT", // Тендер требует сертификат
  SUPPLIES: "SUPPLIES",           // Поставщик поставляет товар
  WORKS_FOR: "WORKS_FOR",         // Человек работает в организации
  VIOLATES: "VIOLATES",           // Нарушение
  PARTICIPATES: "PARTICIPATES",   // Участвует в тендере
  REFERENCES: "REFERENCES",       // Ссылается на документ/ГОСТ
  REQUIRES: "REQUIRES",           // Требует наличие
} as const;

/**
 * Нормализует имя сущности для поиска дубликатов
 */
export function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[«»"']/g, "")
    .replace(/\s+/g, " ")
    .replace(/ооо|зао|оао|пао|ип/gi, "")
    .trim();
}

/**
 * Извлекает сущности и связи из текста с помощью Gemini
 */
export async function extractEntitiesFromText(
  text: string,
  context?: string
): Promise<ExtractionResult> {
  const client = getGeminiClient();

  const prompt = `Проанализируй следующий текст документа и извлеки из него сущности и связи.

${context ? `Контекст: ${context}\n\n` : ""}

ТЕКСТ:
${text.substring(0, 15000)}

Извлеки следующие типы сущностей:
- supplier: Поставщики, компании, ООО, ИП
- certificate: Сертификаты (ХАССП, ISO, и т.д.)
- gost: ГОСТы, стандарты (ГОСТ Р, ТУ, СанПиН)
- requirement: Требования к участникам
- product: Товары, продукция
- person: Люди (директора, контактные лица)
- organization: Государственные органы, заказчики
- license: Лицензии, разрешения

Извлеки связи между сущностями:
- HAS_CERT: компания имеет сертификат
- REQUIRES_CERT: тендер требует сертификат
- SUPPLIES: компания поставляет товар
- WORKS_FOR: человек работает в организации
- REFERENCES: ссылка на ГОСТ/стандарт
- REQUIRES: требует наличие документа

Ответь ТОЛЬКО в формате JSON:
{
  "entities": [
    {
      "type": "supplier",
      "name": "ООО Ромашка",
      "externalId": "1234567890",
      "externalSource": "ИНН",
      "data": { "address": "г. Москва" },
      "confidence": 0.95
    }
  ],
  "relations": [
    {
      "fromEntityName": "ООО Ромашка",
      "relationType": "HAS_CERT",
      "toEntityName": "Сертификат ХАССП",
      "confidence": 0.9
    }
  ]
}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODELS.CHAT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);

    // Нормализуем имена сущностей
    const entities: ExtractedEntity[] = (result.entities || []).map(
      (e: Record<string, unknown>) => ({
        type: e.type as string,
        name: e.name as string,
        normalizedName: normalizeEntityName(e.name as string),
        externalId: e.externalId as string | undefined,
        externalSource: e.externalSource as string | undefined,
        data: (e.data as Record<string, unknown>) || {},
        confidence: (e.confidence as number) || 0.8,
      })
    );

    const relations: ExtractedRelation[] = (result.relations || []).map(
      (r: Record<string, unknown>) => ({
        fromEntityName: r.fromEntityName as string,
        relationType: r.relationType as string,
        toEntityName: r.toEntityName as string,
        data: r.data as Record<string, unknown> | undefined,
        confidence: (r.confidence as number) || 0.8,
      })
    );

    return { entities, relations };
  } catch (error) {
    logger.error("Entity extraction error:", error);
    return { entities: [], relations: [] };
  }
}

/**
 * Сохраняет извлечённые сущности в БД
 */
export async function saveEntities(
  entities: ExtractedEntity[],
  userId: string,
  companyId?: string
): Promise<Map<string, string>> {
  const supabase = await createRSCClient();
  const entityIdMap = new Map<string, string>();

  for (const entity of entities) {
    // Проверяем существует ли сущность
    const { data: existing } = await supabase
      .from("entities")
      .select("id")
      .eq("user_id", userId)
      .eq("normalized_name", entity.normalizedName)
      .eq("entity_type", entity.type)
      .is("deleted_at", null)
      .single();

    if (existing) {
      entityIdMap.set(entity.name, existing.id);
      continue;
    }

    // Создаём embedding для сущности
    const embedding = await createEmbedding(
      `${entity.type}: ${entity.name}. ${JSON.stringify(entity.data)}`
    );

    // Вставляем новую сущность
    const { data: newEntity, error } = await supabase
      .from("entities")
      .insert({
        user_id: userId,
        company_id: companyId || null,
        entity_type: entity.type,
        name: entity.name,
        normalized_name: entity.normalizedName,
        external_id: entity.externalId || null,
        external_source: entity.externalSource || null,
        data: entity.data,
        confidence: entity.confidence,
        embedding: `[${embedding.join(",")}]`,
      })
      .select("id")
      .single();

    if (error) {
      logger.error(`Failed to insert entity ${entity.name}:`, error);
      continue;
    }

    entityIdMap.set(entity.name, newEntity.id);
  }

  return entityIdMap;
}

/**
 * Сохраняет связи в БД
 */
export async function saveRelations(
  relations: ExtractedRelation[],
  entityIdMap: Map<string, string>,
  userId: string,
  sourceDocumentId?: string
): Promise<number> {
  const supabase = await createRSCClient();
  let savedCount = 0;

  for (const relation of relations) {
    const fromId = entityIdMap.get(relation.fromEntityName);
    const toId = entityIdMap.get(relation.toEntityName);

    if (!fromId || !toId) {
      logger.warn(
        `Relation skipped: missing entity ${relation.fromEntityName} -> ${relation.toEntityName}`
      );
      continue;
    }

    // Проверяем существует ли связь
    const { data: existing } = await supabase
      .from("relations")
      .select("id")
      .eq("from_entity_id", fromId)
      .eq("to_entity_id", toId)
      .eq("rel_type", relation.relationType)
      .single();

    if (existing) {
      continue;
    }

    // Вставляем связь
    const { error } = await supabase.from("relations").insert({
      user_id: userId,
      from_entity_id: fromId,
      to_entity_id: toId,
      rel_type: relation.relationType,
      data: relation.data || {},
      confidence: relation.confidence,
      source_document_id: sourceDocumentId || null,
    });

    if (error) {
      logger.error(`Failed to insert relation:`, error);
      continue;
    }

    savedCount++;
  }

  return savedCount;
}

/**
 * Извлекает и сохраняет сущности из документа
 */
export async function extractAndSaveFromDocument(
  documentId: string,
  userId: string,
  companyId?: string
): Promise<{ entitiesCount: number; relationsCount: number }> {
  const supabase = await createRSCClient();

  // Получаем чанки документа
  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("text_content")
    .eq("document_id", documentId)
    .order("chunk_index")
    .limit(10); // Берём первые 10 чанков

  if (!chunks || chunks.length === 0) {
    return { entitiesCount: 0, relationsCount: 0 };
  }

  // Объединяем текст
  const fullText = chunks.map((c) => c.text_content).join("\n\n");

  // Извлекаем сущности
  const { entities, relations } = await extractEntitiesFromText(fullText);

  if (entities.length === 0) {
    return { entitiesCount: 0, relationsCount: 0 };
  }

  // Сохраняем сущности
  const entityIdMap = await saveEntities(entities, userId, companyId);

  // Сохраняем связи
  const relationsCount = await saveRelations(
    relations,
    entityIdMap,
    userId,
    documentId
  );

  logger.info(
    `Extracted from document ${documentId}: ${entities.length} entities, ${relationsCount} relations`
  );

  return {
    entitiesCount: entities.length,
    relationsCount,
  };
}

/**
 * Ищет сущности по запросу
 */
export async function searchEntities(
  query: string,
  userId: string,
  entityType?: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    type: string;
    name: string;
    data: Record<string, unknown>;
    similarity: number;
  }>
> {
  const supabase = await createRSCClient();

  const queryEmbedding = await createEmbedding(query);

  const { data, error } = await supabase.rpc("match_entities", {
    query_embedding: queryEmbedding,
    match_threshold: 0.6,
    match_count: limit,
    filter_user_id: userId,
    filter_entity_type: entityType || null,
  });

  if (error) {
    logger.error("Entity search error:", error);
    return [];
  }

  return (data || []).map((e: Record<string, unknown>) => ({
    id: e.id as string,
    type: e.entity_type as string,
    name: e.name as string,
    data: e.data as Record<string, unknown>,
    similarity: e.similarity as number,
  }));
}

/**
 * Получает связи сущности
 */
export async function getEntityRelations(
  entityId: string,
  userId: string,
  maxDepth = 2
): Promise<
  Array<{
    fromId: string;
    fromName: string;
    fromType: string;
    relType: string;
    toId: string;
    toName: string;
    toType: string;
    depth: number;
  }>
> {
  const supabase = await createRSCClient();

  const { data, error } = await supabase.rpc("get_entity_relations", {
    entity_id: entityId,
    filter_user_id: userId,
    max_depth: maxDepth,
  });

  if (error) {
    logger.error("Get relations error:", error);
    return [];
  }

  return (data || []).map((r: Record<string, unknown>) => ({
    fromId: r.from_id as string,
    fromName: r.from_name as string,
    fromType: r.from_type as string,
    relType: r.rel_type as string,
    toId: r.to_id as string,
    toName: r.to_name as string,
    toType: r.to_type as string,
    depth: r.depth as number,
  }));
}

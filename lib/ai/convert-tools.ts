/**
 * Утилита для конвертации Zod схем в формат OpenAI/OpenRouter и Gemini Function Calling
 */

import { aiTools, toolSchemas } from "./tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { OpenRouterTool } from "./openrouter-client";

// Type для Gemini (если всё ещё нужен для legacy)
const Type = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
} as const;

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Конвертирует наши tools в формат OpenAI
 */
export function convertToolsToOpenAI() {
  const openaiTools: OpenAITool[] = [];

  for (const [toolName, toolDef] of Object.entries(aiTools)) {
    const schema = toolSchemas[toolName as keyof typeof toolSchemas];
    
    if (!schema) continue;

    // Конвертируем Zod схему в JSON Schema
    // Несовместимость типов zod@3.x и zod-to-json-schema - требуется приведение
    const jsonSchema = zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0], toolName) as Record<string, unknown>;

    openaiTools.push({
      type: "function",
      function: {
        name: toolName,
        description: toolDef.description,
        parameters: {
          type: "object",
          properties: (jsonSchema.properties as Record<string, unknown>) || {},
          required: (jsonSchema.required as string[]) || [],
        },
      },
    });
  }

  return openaiTools;
}

/**
 * Получить JSON Schema для конкретного tool
 */
export function getToolSchema(toolName: string) {
  const schema = toolSchemas[toolName as keyof typeof toolSchemas];
  if (!schema) return null;
  
  // Несовместимость типов zod@3.x и zod-to-json-schema - требуется приведение
  return zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0], toolName);
}

/**
 * Конвертирует JSON Schema тип в Gemini Type
 */
function convertJsonTypeToGemini(jsonType: string): string {
  const typeMap: Record<string, string> = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
    object: Type.OBJECT,
  };
  return typeMap[jsonType] || Type.STRING;
}

/**
 * Конвертирует JSON Schema свойство в формат Gemini
 */
function convertPropertyToGemini(prop: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: convertJsonTypeToGemini(prop.type as string),
  };
  
  if (prop.description) {
    result.description = prop.description;
  }
  
  if (prop.enum) {
    result.enum = prop.enum;
  }
  
  if (prop.type === "array" && prop.items) {
    const items = prop.items as Record<string, unknown>;
    result.items = { type: convertJsonTypeToGemini(items.type as string) };
  }
  
  return result;
}

/**
 * Интерфейс для Gemini function declaration
 * Поддерживает оба формата: parameters (2.5) и parametersJsonSchema (3.0)
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Конвертирует наши tools в формат Gemini Function Declarations
 */
export function convertToolsToGemini(): GeminiFunctionDeclaration[] {
  const geminiTools: GeminiFunctionDeclaration[] = [];

  for (const [toolName, toolDef] of Object.entries(aiTools)) {
    const schema = toolSchemas[toolName as keyof typeof toolSchemas];
    
    if (!schema) continue;

    // Конвертируем Zod схему в JSON Schema
    const jsonSchema = zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0], toolName) as Record<string, unknown>;
    
    // Конвертируем properties в формат Gemini
    const jsonProperties = (jsonSchema.properties as Record<string, Record<string, unknown>>) || {};
    const geminiProperties: Record<string, unknown> = {};
    
    for (const [propName, propDef] of Object.entries(jsonProperties)) {
      geminiProperties[propName] = convertPropertyToGemini(propDef);
    }

    geminiTools.push({
      name: toolName,
      description: toolDef.description,
      parameters: {
        type: Type.OBJECT,
        properties: geminiProperties,
        required: (jsonSchema.required as string[]) || [],
      },
    });
  }

  return geminiTools;
}

/**
 * Интерфейс для Interactions API tool
 */
interface InteractionsTool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Конвертирует наши tools в формат Interactions API (Gemini 3)
 * Формат: { type: 'function', name: '...', description: '...', parameters: {...} }
 */
export function convertToolsForInteractions(): InteractionsTool[] {
  const tools: InteractionsTool[] = [];

  for (const [toolName, toolDef] of Object.entries(aiTools)) {
    const schema = toolSchemas[toolName as keyof typeof toolSchemas];
    
    if (!schema) continue;

    // Конвертируем Zod схему в JSON Schema
    const jsonSchema = zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0], toolName) as Record<string, unknown>;
    
    // Простые properties для Interactions API
    const jsonProperties = (jsonSchema.properties as Record<string, Record<string, unknown>>) || {};
    const simpleProperties: Record<string, unknown> = {};
    
    for (const [propName, propDef] of Object.entries(jsonProperties)) {
      simpleProperties[propName] = {
        type: propDef.type || "string",
        description: propDef.description || propName,
      };
      if (propDef.enum) {
        (simpleProperties[propName] as Record<string, unknown>).enum = propDef.enum;
      }
    }

    tools.push({
      type: "function",
      name: toolName,
      description: toolDef.description,
      parameters: {
        type: "object",
        properties: simpleProperties,
        required: (jsonSchema.required as string[]) || [],
      },
    });
  }

  return tools;
}

/**
 * Конвертирует наши tools в формат OpenRouter (OpenAI-совместимый)
 * Формат: { type: 'function', function: { name, description, parameters } }
 */
export function convertToolsToOpenRouter(): OpenRouterTool[] {
  const tools: OpenRouterTool[] = [];

  for (const [toolName, toolDef] of Object.entries(aiTools)) {
    const schema = toolSchemas[toolName as keyof typeof toolSchemas];
    
    if (!schema) continue;

    // Конвертируем Zod схему в JSON Schema
    const jsonSchema = zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0], toolName) as Record<string, unknown>;

    tools.push({
      type: "function",
      function: {
        name: toolName,
        description: toolDef.description,
        parameters: {
          type: "object",
          properties: (jsonSchema.properties as Record<string, unknown>) || {},
          required: (jsonSchema.required as string[]) || [],
        },
      },
    });
  }

  return tools;
}

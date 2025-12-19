/**
 * Утилита для конвертации Zod схем в формат OpenAI и Gemini Function Calling
 */

import { aiTools, toolSchemas } from "./tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Type } from "@google/genai";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(schema as any, toolName) as Record<string, unknown>;

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
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any, toolName);
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
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(schema as any, toolName) as Record<string, unknown>;
    
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

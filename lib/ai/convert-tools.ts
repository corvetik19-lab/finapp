/**
 * Утилита для конвертации Zod схем в формат OpenAI Function Calling
 */

import { aiTools, toolSchemas } from "./tools";
import { zodToJsonSchema } from "zod-to-json-schema";

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
    const jsonSchema = zodToJsonSchema(schema, toolName) as Record<string, unknown>;

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
  
  return zodToJsonSchema(schema, toolName);
}

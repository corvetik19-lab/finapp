"use server";

import { getOpenRouterClient } from "@/lib/ai/openrouter-client";

export interface CodeExecutionResult {
  code: string;
  output: string;
  language: string;
  success: boolean;
  error?: string;
}

// Выполнение кода через OpenRouter (без реального выполнения)
export async function executeCode(
  prompt: string,
  existingCode?: string
): Promise<CodeExecutionResult | { error: string }> {
  try {
    const client = getOpenRouterClient();
    
    const fullPrompt = existingCode
      ? `У меня есть код:\n\`\`\`\n${existingCode}\n\`\`\`\n\n${prompt}\n\nНапиши код и покажи ожидаемый результат.`
      : `${prompt}\n\nНапиши код и покажи ожидаемый результат.`;
    
    const response = await client.chat([
      { role: "user", content: fullPrompt }
    ], {
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || "";
    
    // Извлекаем код из текста
    const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[2].trim() : "";
    const language = codeMatch?.[1] || "python";
    
    // Удаляем блок кода для получения объяснения/вывода
    const output = text.replace(/```[\s\S]*?```/g, "").trim();

    return {
      code,
      output,
      language,
      success: true,
    };
  } catch (error) {
    console.error("Code execution error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Генерация и объяснение кода через OpenRouter
export async function generateCode(
  description: string,
  language: string = "python"
): Promise<{ code: string; explanation: string } | { error: string }> {
  try {
    const client = getOpenRouterClient();
    
    const response = await client.chat([
      { 
        role: "user", 
        content: `Напиши код на ${language} для следующей задачи:\n${description}\n\nПредоставь код и краткое объяснение.`
      }
    ], {
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || "";
    
    // Извлекаем код
    const codeMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[2].trim() : "";
    
    // Удаляем блок кода из объяснения
    const explanation = text.replace(/```[\s\S]*?```/g, "").trim();

    return { code, explanation };
  } catch (error) {
    console.error("Code generation error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

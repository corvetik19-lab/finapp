"use server";

import { getGeminiClient } from "@/lib/ai/gemini-client";

export interface CodeExecutionResult {
  code: string;
  output: string;
  language: string;
  success: boolean;
  error?: string;
}

// Выполнение кода с Gemini Code Execution
export async function executeCode(
  prompt: string,
  existingCode?: string
): Promise<CodeExecutionResult | { error: string }> {
  try {
    const client = getGeminiClient();
    
    const fullPrompt = existingCode
      ? `У меня есть код:\n\`\`\`\n${existingCode}\n\`\`\`\n\n${prompt}`
      : prompt;
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{ text: fullPrompt }],
      }],
      config: {
        tools: [{
          codeExecution: {},
        }],
      },
    });

    // Извлекаем код и результат выполнения
    let code = "";
    let output = "";
    let language = "python";
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if ("executableCode" in part && part.executableCode) {
        code = part.executableCode.code || "";
        language = part.executableCode.language || "python";
      }
      if ("codeExecutionResult" in part && part.codeExecutionResult) {
        output = part.codeExecutionResult.output || "";
      }
    }

    // Если нет executableCode, попробуем извлечь код из текста
    if (!code && response.text) {
      const codeMatch = response.text.match(/```(\w+)?\n([\s\S]*?)```/);
      if (codeMatch) {
        language = codeMatch[1] || "python";
        code = codeMatch[2];
      }
    }

    return {
      code,
      output: output || response.text || "",
      language,
      success: true,
    };
  } catch (error) {
    console.error("Code execution error:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Генерация и объяснение кода
export async function generateCode(
  description: string,
  language: string = "python"
): Promise<{ code: string; explanation: string } | { error: string }> {
  try {
    const client = getGeminiClient();
    
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{ 
          text: `Напиши код на ${language} для следующей задачи:\n${description}\n\nПредоставь код и краткое объяснение.` 
        }],
      }],
    });

    const text = response.text || "";
    
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

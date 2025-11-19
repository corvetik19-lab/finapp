"use server";

import OpenAI from "openai";

// Инициализируем клиент OpenAI только на сервере
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OCRResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * Распознает текст с изображения или PDF чека
 */
export async function recognizeReceiptFile(formData: FormData): Promise<OCRResult> {
  try {
    const file = formData.get("file") as File;
    
    if (!file) {
      return { success: false, text: "", error: "Файл не найден" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // 1. Обработка PDF (текстовый слой)
    if (mimeType === "application/pdf") {
      try {
        // Polyfill для DOMMatrix (нужен для некоторых версий pdf библиотек в Node.js)
        if (!global.DOMMatrix) {
          // @ts-expect-error - Polyfill for missing DOMMatrix in Node.js
          global.DOMMatrix = class DOMMatrix {
            constructor() { return this; }
            toFloat32Array() { return [1, 0, 0, 1, 0, 0]; }
            translate() { return this; }
            scale() { return this; }
            rotate() { return this; }
            multiply() { return this; }
            inverse() { return this; }
          };
        }

        // Lazy load pdf-parse чтобы избежать ошибок инициализации
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdf = require("pdf-parse");
        
        const data = await pdf(buffer);
        const text = data.text.trim();
        
        if (text.length > 10) {
          // Если удалось извлечь текст программно
          return { success: true, text };
        }
        // Если текст пустой, возможно это скан в PDF. 
        // В данной реализации мы возвращаем ошибку для сканов PDF, 
        // так как конвертация PDF->Image на Vercel требует тяжелых зависимостей.
        return { 
          success: false, 
          text: "", 
          error: "Не удалось извлечь текст из PDF. Если это скан/фото в PDF, пожалуйста, конвертируйте его в JPG/PNG." 
        };
      } catch (e) {
        console.error("PDF parse error:", e);
        return { success: false, text: "", error: "Ошибка чтения PDF файла" };
      }
    }

    // 2. Обработка Изображений (GPT-4o Vision)
    if (mimeType.startsWith("image/")) {
      const base64Image = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Используем самую умную модель для Vision
        messages: [
          {
            role: "system",
            content: `Ты - профессиональный OCR сканер чеков. 
            Твоя задача - извлечь ВЕСЬ текст с изображения чека.
            
            Правила:
            1. Выпиши весь видимый текст построчно.
            2. Сохраняй структуру чека (название магазина сверху, товары в середине, итого снизу).
            3. НЕ добавляй никаких комментариев (типа "Вот текст чека").
            4. НЕ используй markdown блоки кода. Просто текст.
            5. Если текст неразборчив, напиши "[неразборчиво]".`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Распознай этот чек:" },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                  detail: "high" // Высокая детализация для мелкого текста
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
      });

      const text = response.choices[0]?.message?.content || "";
      
      if (!text) {
        return { success: false, text: "", error: "Нейросеть не вернула текст" };
      }

      return { success: true, text };
    }

    return { success: false, text: "", error: "Неподдерживаемый формат файла. Используйте JPG, PNG или PDF." };

  } catch (error: unknown) {
    console.error("OCR Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
    return { 
      success: false, 
      text: "", 
      error: errorMessage || "Ошибка при распознавании файла" 
    };
  }
}

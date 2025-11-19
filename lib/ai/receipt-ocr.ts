"use server";

import OpenAI from "openai";
import { createRSCClient } from "@/lib/supabase/server";

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
 * Внутренняя функция для обработки буфера файла
 */
async function processFileBuffer(buffer: Buffer, mimeType: string): Promise<OCRResult> {
  try {
    // 1. Обработка PDF (текстовый слой)
    if (mimeType === "application/pdf") {
      try {
        // Polyfill для DOMMatrix
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

        // Lazy load pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdf = require("pdf-parse");
        
        const data = await pdf(buffer);
        const text = data.text.trim();
        
        if (text.length > 10) {
          return { success: true, text };
        }
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
        model: "gpt-4o",
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
                  detail: "high"
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

/**
 * Распознает текст с изображения или PDF чека (из FormData)
 */
export async function recognizeReceiptFile(formData: FormData): Promise<OCRResult> {
  try {
    const file = formData.get("file") as File;
    
    if (!file) {
      return { success: false, text: "", error: "Файл не найден" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    return processFileBuffer(buffer, file.type);

  } catch (error: unknown) {
    console.error("Recognize File Error:", error);
    return { 
      success: false, 
      text: "", 
      error: "Ошибка при обработке файла" 
    };
  }
}

/**
 * Распознает текст чека, который уже загружен в Supabase Storage
 */
export async function recognizeReceiptFromPath(filePath: string, mimeType: string): Promise<OCRResult> {
  try {
    const supabase = await createRSCClient();
    
    // Скачиваем файл из Storage
    const { data, error } = await supabase
      .storage
      .from('attachments')
      .download(filePath);

    if (error || !data) {
      console.error("Download error:", error);
      return { success: false, text: "", error: "Не удалось скачать файл из хранилища" };
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return processFileBuffer(buffer, mimeType);

  } catch (error: unknown) {
    console.error("Recognize Path Error:", error);
    return { 
      success: false, 
      text: "", 
      error: "Ошибка при обработке файла из хранилища" 
    };
  }
}

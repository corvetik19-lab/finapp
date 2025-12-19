// Тестовый скрипт для проверки Gemini API
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCRqd_tgHp3Gkcdd2ggiKN6CZESGv2USiY";

async function testGemini() {
  console.log("Testing Gemini API...");
  console.log("API Key:", apiKey.slice(0, 10) + "...");
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    console.log("Calling generateContent...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Привет! Скажи что-нибудь.",
    });
    
    console.log("Response:", response.text);
    console.log("SUCCESS!");
  } catch (error) {
    console.error("ERROR:", error);
    console.error("Error message:", error.message);
    console.error("Error name:", error.name);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testGemini();

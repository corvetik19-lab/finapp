// Тестовый скрипт для проверки генерации изображений через Vertex AI
const { GoogleGenAI, Modality } = require("@google/genai");

async function testImageGeneration() {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  
  console.log("=== Gemini Image Test (Vertex AI) ===");
  console.log("Project ID:", projectId);
  
  if (!projectId) {
    console.error("ERROR: GOOGLE_PROJECT_ID not set");
    process.exit(1);
  }
  
  try {
    // Используем Vertex AI для обхода гео-блокировки
    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: "us-central1", // Пробуем US регион
    });
    
    console.log("\nClient created successfully");
    
    // Пробуем gemini-2.0-flash-exp - поддерживает генерацию изображений
    const MODEL = "gemini-2.0-flash-exp";
    console.log(`Calling ${MODEL}...\n`);
    
    const response = await client.models.generateContent({
      model: MODEL,
      contents: "Generate an image of a cute orange kitten playing with a ball of yarn.",
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
    
    console.log("Response received!");
    console.log("Candidates:", response.candidates?.length || 0);
    
    if (response.candidates && response.candidates[0]) {
      const parts = response.candidates[0].content?.parts || [];
      console.log("Parts count:", parts.length);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.text) {
          console.log(`Part ${i} - Text:`, part.text.substring(0, 100) + "...");
        }
        if (part.inlineData) {
          console.log(`Part ${i} - Image: mimeType=${part.inlineData.mimeType}, data length=${part.inlineData.data?.length || 0}`);
        }
      }
    }
    
    console.log("\n=== SUCCESS ===");
  } catch (error) {
    console.error("\n=== ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
      console.error("\nThis is a RATE LIMIT error. Check your quotas in Google Cloud Console.");
    } else if (error.message.includes("403") || error.message.includes("PERMISSION_DENIED")) {
      console.error("\nThis is a PERMISSION error. Make sure the API is enabled and you have access.");
    } else if (error.message.includes("404") || error.message.includes("NOT_FOUND")) {
      console.error("\nModel not found. Check if gemini-3-pro-image-preview is available in your project.");
    }
    
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
  }
}

testImageGeneration();

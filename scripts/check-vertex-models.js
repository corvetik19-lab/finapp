
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const projectId = process.env.GOOGLE_PROJECT_ID;
  // Gemini 3 Pro доступен только в global регионе!
  const location = process.env.GOOGLE_LOCATION || "global";
  const usLocation = "us-central1"; // Veo требует US регион

  if (!projectId) {
    console.error("No GOOGLE_PROJECT_ID found");
    return;
  }

  console.log(`Checking Vertex AI models in project: ${projectId}, location: ${location}`);

  try {
    const client = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: location,
    });

    // Try to list models if SDK supports it, or test specific models
    // The unified SDK might not have a listModels for Vertex yet in this version?
    // Let's try to generate with gemini-3-pro-preview to confirm 404
    
    const modelsToTest = [
        // Text models (global)
        "gemini-3-pro-preview",
        "gemini-2.5-pro",
        // Image models (global)
        "gemini-3-pro-image-preview",
    ];

    for (const model of modelsToTest) {
        console.log(`Testing model: ${model}...`);
        try {
            const response = await client.models.generateContent({
                model: model,
                contents: {
                    role: 'user',
                    parts: [{ text: 'Hi' }]
                }
            });
            console.log(`[SUCCESS] ${model} is available!`);
        } catch (e) {
            console.log(`[FAILED] ${model}: ${e.message}`);
        }
    }

    // Тестируем Veo в US регионе
    console.log(`\nTesting Veo models in US region (${usLocation})...`);
    const usClient = new GoogleGenAI({
      vertexai: true,
      project: projectId,
      location: usLocation,
    });

    const veoModels = [
        "veo-3.1-generate-preview",
        "veo-3.1-fast-generate-001",
        "veo-2.0-generate-001",
    ];

    for (const model of veoModels) {
        console.log(`Testing model: ${model} (US)...`);
        try {
            const response = await usClient.models.generateContent({
                model: model,
                contents: {
                    role: 'user',
                    parts: [{ text: 'Create a 5 second video of a sunset' }]
                }
            });
            console.log(`[SUCCESS] ${model} is available in US!`);
        } catch (e) {
            console.log(`[FAILED] ${model}: ${e.message}`);
        }
    }

  } catch (error) {
    console.error("Error initializing client:", error);
  }
}

main();

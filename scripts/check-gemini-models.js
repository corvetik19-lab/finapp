
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config({ path: '.env.local' });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found");
    return;
  }

  console.log("Using API Key:", apiKey.substring(0, 10) + "...");

  try {
    const client = new GoogleGenAI({ apiKey });
    
    console.log("Attempting to generate with gemini-3-pro-preview...");
    
    try {
        // Correct format for generateContent in @google/genai might be slightly different depending on version
        // But let's try the standard one
        const response = await client.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                role: 'user',
                parts: [{ text: 'Hello' }]
            }
        });
        console.log("Success!");
        console.log(response);
    } catch (e) {
        console.error("Error generating with gemini-3-pro-preview:", e.message);
        console.error(JSON.stringify(e, null, 2));
    }
    
  } catch (error) {
    console.error("Error initializing client:", error);
  }
}

main();

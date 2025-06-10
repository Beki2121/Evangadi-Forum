const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config(); // Assuming you have your API key in .env

async function listAvailableModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const { models } = await genAI.listModels();
    console.log("Available Gemini Models:");
    for (const model of models) {
      console.log(`- Name: ${model.name}`);
      console.log(`  DisplayName: ${model.displayName}`);
      console.log(
        `  Supported Methods: ${model.supportedGenerationMethods.join(", ")}`
      );
      console.log("---");
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listAvailableModels();

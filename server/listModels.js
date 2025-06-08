require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    "GEMINI_API_KEY is not set in environment variables. Cannot list models."
  );
  process.exit(1);
}

async function main() {
  const genAI = new GoogleGenerativeAI(API_KEY);

  console.log("Attempting to list models with provided API key...");
  try {
    const { models } = await genAI.listModels();

    console.log("--- Available Models ---");
    for (const model of models) {
      console.log(`Name: ${model.name}`);
      console.log(`Description: ${model.description}`);
      console.log(
        `Input Methods: ${model.supportedGenerationMethods.join(", ")}`
      );
      console.log(`Max Input Tokens: ${model.inputTokenLimit}`);
      console.log("------------------------");
    }
  } catch (error) {
    console.error("Error listing models:", error);
    console.error(
      "This usually indicates a problem with your API key, its permissions, or project billing/API enablement."
    );
  }
}

main();

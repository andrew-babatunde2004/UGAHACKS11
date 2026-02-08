const { GoogleGenAI } = require("@google/genai");

const categoryData = require("../datasets/categories.json");
const foodstuffData = require("../datasets/foodstuffDictionary.json");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const gemini = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash";

// [0] = Category ID 1, ... etc
const elementsPerCategory = [
  7, 23, 52, 7, 34, 52, 46, 25, 30, 49, 6, 31, 2, 6, 16, 2, 33, 68, 68, 6,
  13, 5, 104, 5, 36
];

const extractGeminiText = (response) => {
  if (!response) return null;
  if (typeof response.text === "string") return response.text;
  if (typeof response.output_text === "string") return response.output_text;
  const outputsText = response?.outputs?.[0]?.text;
  if (typeof outputsText === "string") return outputsText;
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const combined = parts.map((p) => p?.text ?? "").join("");
    return combined || null;
  }
  return null;
};

async function chooseFoodstuffFromBarcode(barcodeJson) {
  const barcodePayload = JSON.stringify(barcodeJson);

  const categoryListString = categoryData.data
    .map((row) => {
      const idObj = row.find((obj) => obj.ID !== undefined);
      const nameObj = row.find((obj) => obj.Category_Name !== undefined);
      return `ID ${idObj.ID}: ${nameObj.Category_Name}`;
    })
    .join(", ");

  const categoryPrompt = `Given the information '${barcodePayload}' and the following category list: '${categoryListString}', pick the most likely corresponding Category ID. Return ONLY the number.`;

  const deduction = await gemini.models.generateContent({
    model: model,
    contents: categoryPrompt,
    generationConfig: {
      temperature: 0
    }
  });

  const categoryText = extractGeminiText(deduction);
  if (!categoryText) {
    console.error("Gemini category response:", JSON.stringify(deduction, null, 2));
    throw new Error("Gemini returned no category output");
  }

  const categoryId = categoryText.trim();
  const catIdInt = parseInt(categoryId, 10);
  if (!Number.isFinite(catIdInt) || catIdInt <= 0 || catIdInt > elementsPerCategory.length) {
    throw new Error(`Invalid category ID from Gemini: ${categoryId}`);
  }

  const startIndex = elementsPerCategory
    .slice(0, catIdInt - 1)
    .reduce((acc, val) => acc + val, 0);
  const itemCount = elementsPerCategory[catIdInt - 1];

  const filteredRows = foodstuffData.data.slice(startIndex, startIndex + itemCount);

  const productListString = filteredRows
    .map((row) => {
      const idObj = row.find((obj) => obj.ID !== undefined);
      const nameObj = row.find((obj) => obj.Name !== undefined);
      const subObj = row.find((obj) => obj.Name_subtitle !== undefined);
      return `ID ${idObj.ID}: ${nameObj.Name}${
        subObj?.Name_subtitle ? " (" + subObj.Name_subtitle + ")" : ""
      }`;
    })
    .join(", ");

  const finalDeduction = await gemini.models.generateContent({
    model: model,
    contents: `Using this product info '${barcodePayload}', find the specific Product ID from this list: ${productListString}. Return ONLY the number.`,
    generationConfig: {
      temperature: 0
    }
  });

  const finalText = extractGeminiText(finalDeduction);
  if (!finalText) {
    console.error("Gemini product response:", JSON.stringify(finalDeduction, null, 2));
    throw new Error("Gemini returned no product output");
  }

  const finalProductId = finalText.trim();
  return filteredRows.find((row) => row.some((obj) => obj.ID == finalProductId));
}

module.exports = {
  chooseFoodstuffFromBarcode
};

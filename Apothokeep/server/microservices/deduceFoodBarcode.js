const { GoogleGenAI } = require("@google/genai");

const categoryJson = require("../datasets/categories.json");
const foodstuffJson = require("../datasets/foodstuffByCategory.json");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const gemini = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash";

const extractFirstNumber = (text) => {
  if (!text) return null;
  const match = String(text).match(/\d+/);
  return match ? match[0] : null;
};

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
  const categoryListString = categoryJson.data
    .map((row) => {
      const idObj = row.find((obj) => obj.ID !== undefined);
      const nameObj = row.find((obj) => obj.Category_Name !== undefined);
      return `ID ${idObj.ID}: ${nameObj.Category_Name}`;
    })
    .join(", ");

  /**const barcodeMetaListString = barcodeJson.data
    .map((row) => {
      const idObj = row.find((obj) => obj.ID !== undefined);
      const nameObj = row.find((obj) => obj.Category_Name !== undefined);
      return `ID ${idObj.ID}: ${nameObj.Category_Name}`;
    })
    .join(", ");*/

  // Better formatting for Gemini to understand barcode data
  const productName = barcodeJson.product?.product_name || "";
  const brands = barcodeJson.product?.brands || "";
  const tags = barcodeJson.product?.categories_tags?.join(", ") || "";
  if (!productName && !tags && !brands) {
    throw new Error("Scan has no product name or category tags");
  }

  const categoryPrompt = `Given the information from a scan 'Brand: ${brands}; Product: ${productName}; Tags: ${tags}' and the following category list: '${categoryListString}', pick the most likely corresponding Category ID. Return ONLY the number.`;

  // Create the interaction 
  const deduction = await gemini.models.generateContent({
    model,
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

  const categoryId = extractFirstNumber(categoryText) ?? categoryText.trim();
  console.log("Gemini chose Category ID: " + categoryId);

  const catIdInt = parseInt(categoryId, 10);
  if (!Number.isFinite(catIdInt) || catIdInt <= 0) {
    throw new Error(`Invalid category ID from Gemini: ${categoryId}`);
  }

  const filteredRows = foodstuffJson.categories[String(catIdInt)] || [];
  if (filteredRows.length === 0) {
    throw new Error(`No items found for category ID ${catIdInt}`);
  }

  const productListString = filteredRows
    .map((row) => {
      const idObj = row.find((obj) => obj.ID !== undefined);
      const nameObj = row.find((obj) => obj.Name !== undefined);
      const subObj = row.find((obj) => obj.Name_subtitle !== undefined);
      return `ID ${idObj.ID}: ${nameObj.Name}${
        subObj?.Name_subtitle
          ? " (" + subObj.Name_subtitle + ")"
          : ""
      }`;
    })
    .join(", ");

  const finalDeduction = await gemini.models.generateContent({
    model,
    contents: `Brand: ${brands}. Product: ${productName}. From this list, find the specific Product ID. Return ONLY the number. List: ${productListString}`,
    generationConfig: {
      temperature: 0
    }
  });

  const finalText = extractGeminiText(finalDeduction);
  if (!finalText) {
    console.error("Gemini product response:", JSON.stringify(finalDeduction, null, 2));
    throw new Error("Gemini returned no product output");
  }

  const finalProductId = extractFirstNumber(finalText) ?? finalText.trim();
  console.log("Final Product ID: " + finalProductId);

  /**const finalText = extractGeminiText(finalDeduction);
  if (!finalText) {
    console.error(
      "Gemini product response:",
      JSON.stringify(finalDeduction, null, 2)
    );
    throw new Error("Gemini returned no product output");
  }*/

  return filteredRows.find((row) =>
    row.some((obj) => obj.ID == finalProductId)
  );
}

module.exports = {
  chooseFoodstuffFromBarcode
};

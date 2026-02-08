import { GoogleGenAI } from "@google/generative-ai";

const categoryJson = require("../datasets/categories.json");
const foodstuffJson = require("../datasets/foodstuffByCategory.json");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const gemini = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash";

const elementsPerCategory = [
  7, 23, 52, 7, 34, 52, 46, 25, 30, 49, 6, 31, 2, 6, 16, 2, 33, 68, 68, 6,
  13, 5, 104, 5, 36
];

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
  const tags = barcodeJson.product?.categories_tags?.join(", ") || "";

  const categoryPrompt = `Given the information from a scan '${productName} - ${tags}' and the following category list: '${categoryListString}', 
  pick the most likely corresponding Category ID. Return ONLY the number.`;

  // Create the interaction 
  const deduction = await gemini.interactions.create({
      model,
      system_instruction: "MISSION CRITICAL: Return ONLY the numeric ID. Do not include any text or explanation.",
      input: categoryPrompt
  });

  const categoryId = deduction.outputs[0].text.trim();
  console.log("Gemini chose Category ID: " + categoryId);

  const catIdInt = parseInt(categoryId);

  const startIndex = elementsPerCategory
    .slice(0, catIdInt - 1)
    .reduce((acc, val) => acc + val, 0);

  const itemCount = elementsPerCategory[catIdInt - 1];

  const filteredRows = foodstuffJson.data.slice(
    startIndex,
    startIndex + itemCount
  );

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

  const finalDeduction = await gemini.interactions.create({
    model,
    system_instruction: "Return ONLY the numeric Product ID. No text.",
    input: `Find the specific Product ID for that same brand from this list: ${productListString}`,
    previous_interaction_id: deduction.id
  });

  const finalProductId = finalDeduction.outputs[0].text.trim();
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
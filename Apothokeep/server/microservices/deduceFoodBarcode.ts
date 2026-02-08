// @ts-ignore
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createLogger } from "../utils/logger";
import categoryJsonRaw from "../datasets/categories.json";
import foodstuffJsonRaw from "../datasets/foodstuffByCategory.json";

// Load environment variables
dotenv.config();

const categoryJson = categoryJsonRaw as any;
const foodstuffJson = foodstuffJsonRaw as any;

const logger = createLogger("FoodDeduction");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenAI({ apiKey });
const MODEL_NAME = "gemini-2.0-flash"; 

const elementsPerCategory = [
  7, 23, 52, 7, 34, 52, 46, 25, 30, 49, 6, 31, 2, 6, 16, 2, 33, 68, 68, 6,
  13, 5, 104, 5, 36
];

interface BarcodeProduct {
  product?: {
    product_name?: string;
    categories_tags?: string[];
  };
}

type KVRow = Array<Record<string, any>>;

export async function chooseFoodstuffFromBarcode(
  barcodeJson: BarcodeProduct
): Promise<KVRow | null> {
  try {
    const categoryListString = categoryJson.data
      .map((row: KVRow) => {
        const idObj = row.find((obj) => obj.ID !== undefined);
        const nameObj = row.find((obj) => obj.Category_Name !== undefined);
        return `ID ${idObj?.ID}: ${nameObj?.Category_Name}`;
      })
      .join(", ");

    const productName = barcodeJson.product?.product_name || "";
    const tags = barcodeJson.product?.categories_tags?.join(", ") || "";

    logger.info("Processing barcode", { productName, tags });

    const categoryPrompt = `Given the information from a scan '${productName} - ${tags}' and the following category list: '${categoryListString}',
pick the most likely corresponding Category ID. Return ONLY the number.`;

    // Use correct Gemini API
    const categoryResult = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: categoryPrompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const categoryId = (categoryResult.text || "").trim();
    logger.info("Gemini chose Category ID:", categoryId);

    const catIdInt = parseInt(categoryId);
    if (isNaN(catIdInt) || catIdInt < 1 || catIdInt > elementsPerCategory.length) {
      logger.warn("Invalid category ID returned from Gemini:", categoryId);
      return null;
    }

    const startIndex = elementsPerCategory
      .slice(0, catIdInt - 1)
      .reduce((acc, val) => acc + val, 0);

    const itemCount = elementsPerCategory[catIdInt - 1];

    const filteredRows = foodstuffJson.data.slice(
      startIndex,
      startIndex + itemCount
    );

    const productListString = filteredRows
      .map((row: KVRow) => {
        const idObj = row.find((obj) => obj.ID !== undefined);
        const nameObj = row.find((obj) => obj.Name !== undefined);
        const subObj = row.find((obj) => obj.Name_subtitle !== undefined);
        return `ID ${idObj?.ID}: ${nameObj?.Name}${
          subObj?.Name_subtitle ? " (" + subObj.Name_subtitle + ")" : ""
        }`;
      })
      .join(", ");

    const productPrompt = `Find the specific Product ID for '${productName}' from this list: ${productListString}. Return ONLY the numeric Product ID. No text.`;

    const productResult = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: productPrompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const finalProductId = (productResult.text || "").trim();
    logger.info("Final Product ID:", finalProductId);

    const matchedRow = filteredRows.find((row: KVRow) =>
      row.some((obj) => obj.ID == finalProductId)
    );

    if (!matchedRow) {
      logger.warn("No matching product found for ID:", finalProductId);
      return null;
    }

    return matchedRow as KVRow;
  } catch (error) {
    logger.error("Error in chooseFoodstuffFromBarcode:", error);
    return null;
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "../utils/logger";
import categoryJson from "../datasets/categories.json";
import foodstuffJson from "../datasets/foodstuffByCategory.json";

const logger = createLogger("FoodDeduction");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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
      .map((row) => {
        const idObj = row.find((obj: any) => obj.ID !== undefined);
        const nameObj = row.find((obj: any) => obj.Category_Name !== undefined);
        return `ID ${idObj.ID}: ${nameObj.Category_Name}`;
      })
      .join(", ");

    const productName = barcodeJson.product?.product_name || "";
    const tags = barcodeJson.product?.categories_tags?.join(", ") || "";

    logger.info("Processing barcode", { productName, tags });

    const categoryPrompt = `Given the information from a scan '${productName} - ${tags}' and the following category list: '${categoryListString}',
pick the most likely corresponding Category ID. Return ONLY the number.`;

    // Use correct Gemini API
    const categoryResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: categoryPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const categoryResponse = await categoryResult.response;
    const categoryId = categoryResponse.text().trim();
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
      .map((row: any) => {
        const idObj = row.find((obj: any) => obj.ID !== undefined);
        const nameObj = row.find((obj: any) => obj.Name !== undefined);
        const subObj = row.find((obj: any) => obj.Name_subtitle !== undefined);
        return `ID ${idObj.ID}: ${nameObj.Name}${
          subObj?.Name_subtitle ? " (" + subObj.Name_subtitle + ")" : ""
        }`;
      })
      .join(", ");

    const productPrompt = `Find the specific Product ID for '${productName}' from this list: ${productListString}. Return ONLY the numeric Product ID. No text.`;

    const productResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: productPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10,
      },
    });

    const productResponse = await productResult.response;
    const finalProductId = productResponse.text().trim();
    logger.info("Final Product ID:", finalProductId);

    const matchedRow = filteredRows.find((row: any) =>
      row.some((obj: any) => obj.ID == finalProductId)
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

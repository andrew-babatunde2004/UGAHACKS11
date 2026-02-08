import fs from "fs";
import path from "path";

interface FoodstuffByCategory {
    name: string;
    categories: Record<string, any[]>;
    metadata: {
        totalCategories: number;
        createdAt: string;
    };
}

let categoryDataCache: FoodstuffByCategory | null = null;

const loadCategoryData = (): FoodstuffByCategory => {
    if (categoryDataCache) return categoryDataCache;

    const filePath = path.join(__dirname, "../datasets/foodstuffByCategory.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    categoryDataCache = JSON.parse(rawData);
    return categoryDataCache!;
};

/**
 * Get all food items for a specific category ID
 * @param categoryId - The category ID (1-25)
 * @returns Array of food items in that category, or empty array if not found
 */
export const getFoodItemsByCategory = (categoryId: number): any[] => {
    const data = loadCategoryData();
    const categoryKey = categoryId.toString();
    return data.categories[categoryKey] || [];
};

/**
 * Get a simplified list of food names and keywords for a category
 * Useful for sending to Gemini API with minimal tokens
 * @param categoryId - The category ID (1-25)
 * @returns Array of simplified food item objects
 */
export const getSimplifiedFoodItemsByCategory = (categoryId: number): Array<{
    name: string;
    keywords: string;
    refrigerateMin?: number;
    refrigerateMax?: number;
    refrigerateMetric?: string;
}> => {
    const items = getFoodItemsByCategory(categoryId);

    return items.map((itemArray: any[]) => {
        // Extract key fields from the array structure
        const nameObj = itemArray.find((obj: any) => obj.Name !== undefined);
        const keywordsObj = itemArray.find((obj: any) => obj.Keywords !== undefined);
        const dopRefrigMin = itemArray.find((obj: any) => obj.DOP_Refrigerate_Min !== undefined);
        const dopRefrigMax = itemArray.find((obj: any) => obj.DOP_Refrigerate_Max !== undefined);
        const dopRefrigMetric = itemArray.find((obj: any) => obj.DOP_Refrigerate_Metric !== undefined);

        return {
            name: nameObj?.Name || "Unknown",
            keywords: keywordsObj?.Keywords || "",
            refrigerateMin: dopRefrigMin?.DOP_Refrigerate_Min,
            refrigerateMax: dopRefrigMax?.DOP_Refrigerate_Max,
            refrigerateMetric: dopRefrigMetric?.DOP_Refrigerate_Metric,
        };
    });
};

/**
 * Get all available category IDs
 * @returns Array of category IDs as numbers
 */
export const getAvailableCategoryIds = (): number[] => {
    const data = loadCategoryData();
    return Object.keys(data.categories).map(id => parseInt(id)).sort((a, b) => a - b);
};

import fs from "fs";
import path from "path";

interface CategoryData {
    ID: number;
}

interface CategoryInfo {
    Category_Name: string;
}

// Type for the internal structure of categories.json rows
// It's an array of objects: [{ID: 1}, {Category_Name: "Baby Food"}, {Subcategory_Name: null}]
type CategoryRow = [CategoryData, CategoryInfo, any];

let categoriesCache: CategoryRow[] | null = null;

const loadCategories = (): CategoryRow[] => {
    if (categoriesCache) return categoriesCache;

    const filePath = path.join(__dirname, "../datasets/categories.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(rawData);
    categoriesCache = json.data;
    return categoriesCache!;
};

export const getCategoryNameById = (targetId: number): string | null => {
    const categories = loadCategories();
    let left = 0;
    let right = categories.length - 1;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        // data[mid][0] is {ID: number}
        const currentId = categories[mid][0].ID;

        if (currentId === targetId) {
            // data[mid][1] is {Category_Name: string}
            return categories[mid][1].Category_Name;
        } else if (currentId < targetId) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return null;
};

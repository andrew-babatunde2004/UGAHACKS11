import fs from "fs";
import path from "path";

interface FoodItem {
    ID?: number;
    Category_ID?: number;
    Name?: string;
    Keywords?: string;
    [key: string]: any;
}

const createCategoryIndex = () => {
    console.log("Reading foodstuffDictionary.json...");
    const inputPath = path.join(__dirname, "../datasets/foodstuffDictionary.json");
    const outputPath = path.join(__dirname, "../datasets/foodstuffByCategory.json");

    const rawData = fs.readFileSync(inputPath, "utf-8");
    const json = JSON.parse(rawData);

    console.log(`Total items in dictionary: ${json.data.length}`);

    // Group by Category_ID
    const byCategory: Record<string, any[]> = {};

    json.data.forEach((itemArray: any[]) => {
        // Each item is an array of objects like [{ID: 1}, {Category_ID: 7}, {Name: "Butter"}, ...]
        // Find the Category_ID
        const categoryObj = itemArray.find((obj: any) => obj.Category_ID !== undefined);

        if (categoryObj && categoryObj.Category_ID) {
            const categoryId = categoryObj.Category_ID.toString();

            if (!byCategory[categoryId]) {
                byCategory[categoryId] = [];
            }

            byCategory[categoryId].push(itemArray);
        }
    });

    // Write to new file
    const output = {
        name: "Product By Category",
        categories: byCategory,
        metadata: {
            totalCategories: Object.keys(byCategory).length,
            createdAt: new Date().toISOString(),
        }
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\nCategory Index created successfully!`);
    console.log(`Output: ${outputPath}`);
    console.log(`Total categories: ${Object.keys(byCategory).length}`);

    // Print summary
    Object.keys(byCategory).sort((a, b) => parseInt(a) - parseInt(b)).forEach(catId => {
        console.log(`  Category ${catId}: ${byCategory[catId].length} items`);
    });
};

createCategoryIndex();

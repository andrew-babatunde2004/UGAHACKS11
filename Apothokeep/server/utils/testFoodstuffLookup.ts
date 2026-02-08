import { getFoodItemsByCategory, getSimplifiedFoodItemsByCategory, getAvailableCategoryIds } from "./foodstuffLookup";
import { getCategoryNameById } from "./categorySearch";

console.log("=== Testing Category Lookup ===\n");

// Test 1: Get all category IDs
const categoryIds = getAvailableCategoryIds();
console.log(`Total categories: ${categoryIds.length}`);
console.log(`Category IDs: ${categoryIds.join(", ")}\n`);

// Test 2: Get items for Category 7 (Dairy Products & Eggs)
const categoryId = 7;
const categoryName = getCategoryNameById(categoryId);
console.log(`Category ${categoryId}: ${categoryName}`);

const fullItems = getFoodItemsByCategory(categoryId);
console.log(`Total items in category: ${fullItems.length}`);

const simplifiedItems = getSimplifiedFoodItemsByCategory(categoryId);
console.log(`\nFirst 5 simplified items:`);
simplifiedItems.slice(0, 5).forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.name}`);
    console.log(`     Keywords: ${item.keywords}`);
    console.log(`     Refrigerate: ${item.refrigerateMin}-${item.refrigerateMax} ${item.refrigerateMetric || "N/A"}`);
});

// Test 3: Token estimation
const jsonString = JSON.stringify(simplifiedItems);
const estimatedTokens = Math.ceil(jsonString.length / 4); // Rough estimate: 1 token ≈ 4 chars
console.log(`\nEstimated tokens for Category ${categoryId}: ~${estimatedTokens} tokens`);
console.log(`JSON size: ${(jsonString.length / 1024).toFixed(2)} KB`);

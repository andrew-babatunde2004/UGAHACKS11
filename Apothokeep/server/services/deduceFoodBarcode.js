import { GoogleGenAI } from "@google/generative-ai";

const categoryData = require('../data/categories.json');
const foodstuffData = require('../data/foodstuffDictionary.json');

const apiKey = process.env.GEMINI_API_KEY;
const gemini = new GoogleGenAI({ apiKey });

const model = 'gemini-2.5-flash';

// [0] = Category ID 1, ... etc
const elementsPerCategory = [7, 23, 52, 7, 34, 52, 46, 25, 30, 49, 6, 31, 2, 6, 16, 2, 33, 68, 68, 6, 13, 5, 104, 5, 36];

// TODO - make barcodeJson readable for Gemini
async function chooseFoodstuffFromBarcode(barcodeJson, categoriesJson, foodstuffDictionaryJson) {
    // Extract IDs and Names into a readable string for Gemini
    const categoryListString = categoriesJson.data.map(row => {
        const idObj = row.find(obj => obj.ID !== undefined);
        const nameObj = row.find(obj => obj.Category_Name !== undefined);
        return `ID ${idObj.ID}: ${nameObj.Category_Name}`;
    }).join(", ");

    // Construct the prompt with correct backtick usage
    const categoryPrompt = `Given the information '${barcodeJson}' and the following category list: '${categoryListString}', 
    pick the most likely corresponding Category ID. Return ONLY the number.`;

    // Create the interaction 
    const deduction = await gemini.interactions.create({
        model: 'gemini-2.5-flash',
        system_instruction: "Return ONLY the numeric ID. Do not include any text or explanation.",
        input: categoryPrompt
    });

    // Trim categoryID to remove any whitespace and log the result
    const categoryId = deduction.outputs[0].text.trim();
    console.log('Gemini chose Category ID: ' + categoryId);

    // Get all elements from foodstuffDictionary that match the chosen categoryID
    // Calculate where to start in the sorted dictionary

    const catIdInt = parseInt(categoryId);

    // Sum all counts in elementsPerCategory up to (catIdInt - 1)
    const startIndex = elementsPerCategory.slice(0, catIdInt - 1).reduce((acc, val) => acc + val, 0);
    const itemCount = elementsPerCategory[catIdInt - 1];

    // Get the subset of products for this specific category
    const filteredRows = foodstuffDictionaryJson.data.slice(startIndex, startIndex + itemCount);

    // Format the matched products for Gemini
    const productListString = filteredRows.map(row => {
        const idObj = row.find(obj => obj.ID !== undefined);
        const nameObj = row.find(obj => obj.Name !== undefined);
        const subObj = row.find(obj => obj.Name_subtitle !== undefined);
        return `ID ${idObj.ID}: ${nameObj.Name}${subObj?.Name_subtitle ? ' (' + subObj.Name_subtitle + ')' : ''}`;
    }).join(", ");

    // The second turn is stateful—Gemini remembers the brand from the previous turn
    const finalDeduction = await gemini.interactions.create({
        model: model,
        input: `Find the specific Product ID for that same brand from this list: ${productListString}`,
        previous_interaction_id: deduction.id // Passes the context
    });

    const finalProductId = finalDeduction.outputs[0].text.trim();
    console.log('Final Product ID: ' + finalProductId);

    // Return the full product object from your dictionary
    return filteredRows.find(row => row.some(obj => obj.ID == finalProductId));
}








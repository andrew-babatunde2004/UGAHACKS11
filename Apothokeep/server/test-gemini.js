const { GoogleGenAI } = require("@google/genai");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "server", ".env") });

const apiKey = process.env.GEMINI_API_KEY;
console.log("API Key found:", apiKey ? "Yes (starts with " + apiKey.substring(0, 5) + "...)" : "No");

if (!apiKey) {
    process.exit(1);
}

const gemini = new GoogleGenAI({ apiKey });
const model = "gemini-1.5-flash"; // testing with a known valid model

async function test() {
    try {
        console.log(`Testing Gemini with model: ${model}...`);
        const result = await gemini.models.generateContent({
            model: model,
            contents: "Say 'Gemini is connected!'",
        });

        // Attempting to extract text based on the logic in deduceFoodBarcode.js
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

        const text = extractGeminiText(result);
        console.log("Response:", text);
        if (text) {
            console.log("SUCCESS: Gemini is correctly connected.");
        } else {
            console.log("FAILED: No text in response.");
            console.log("Full response:", JSON.stringify(result, null, 2));
        }
    } catch (err) {
        console.error("ERROR connecting to Gemini:", err.message);
        if (err.message.includes("not found")) {
            console.log("Tip: Check the model name and SDK version.");
        }
    }
}

test();

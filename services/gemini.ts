import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// Debugging: Check if key is loaded (do not log the actual key in production)
if (!API_KEY) {
    console.error("❌ EXPO_PUBLIC_GEMINI_API_KEY is missing. Please add it to your .env file and restart the server.");
} else {
    console.log(`✅ Gemini API Key loaded (Length: ${API_KEY.length})`);
}

const genAI = new GoogleGenerativeAI(API_KEY);

// User explicitly requested this specific model ID.
export const model = genAI.getGenerativeModel({ model: "google/gemini-2.5-flash-lite-preview-09-2025" });

export const analyzeImage = async (base64Image: string, prompt: string) => {
    if (!API_KEY) {
        throw new Error("API Key is missing. Please check your .env file.");
    }
    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg",
                },
            },
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw error;
    }
};

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";
const MODEL_ID = "google/gemini-2.5-flash-lite-preview-09-2025";

export const chatWithAI = async (prompt: string, base64Image?: string) => {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API Key is missing.");
    }

    const messages = [
        {
            role: "user",
            content: base64Image ? [
                { type: "text", text: prompt },
                {
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${base64Image}`
                    }
                }
            ] : prompt
        }
    ];

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://collegescanner.app", // Optional, for OpenRouter rankings
                "X-Title": "College Scanner App", // Optional
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: messages,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || "OpenRouter Error");
        }

        return data.choices[0].message.content;
    } catch (error) {
        console.error("OpenRouter API Error:", error);
        throw error;
    }
};

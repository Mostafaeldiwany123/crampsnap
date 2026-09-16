import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLEAI_KEY_STORAGE = 'user_googleai_api_key';
const GOOGLEAI_MODEL_STORAGE = 'user_googleai_model';
const GOOGLEAI_ANALYTICS_STORAGE = 'user_googleai_analytics';

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODELS: AIModelOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Main & Fastest (Recommended)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Newest Flash (Intro pricing)' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Latest Flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Flash (GA)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Flagship Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Flash-Lite tier' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Flagship reasoning' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Mid-tier' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', description: 'High-volume workhorse' },
];

export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export const getGoogleAIApiKey = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(GOOGLEAI_KEY_STORAGE);
    if (saved && saved.trim()) return saved.trim();
    return process.env.EXPO_PUBLIC_GOOGLEAI_API_KEY || '';
  } catch (e) {
    return '';
  }
};

export const setGoogleAIApiKey = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(GOOGLEAI_KEY_STORAGE, key.trim());
  } catch (e) {
    console.error('Error saving Google AI API key:', e);
  }
};

export const getGoogleAIModel = async (): Promise<string> => {
  try {
    const model = await AsyncStorage.getItem(GOOGLEAI_MODEL_STORAGE);
    if (model && AVAILABLE_MODELS.some(m => m.id === model)) {
      return model;
    }
    return DEFAULT_MODEL_ID;
  } catch (e) {
    return DEFAULT_MODEL_ID;
  }
};

export const setGoogleAIModel = async (model: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(GOOGLEAI_MODEL_STORAGE, model);
  } catch (e) {
    console.error('Error saving Google AI model:', e);
  }
};

export interface AIAnalytics {
  totalRequests: number;
  lastUsed?: string;
  lastModel?: string;
}

export const getAIAnalytics = async (): Promise<AIAnalytics> => {
  try {
    const raw = await AsyncStorage.getItem(GOOGLEAI_ANALYTICS_STORAGE);
    return raw ? JSON.parse(raw) : { totalRequests: 0 };
  } catch (e) {
    return { totalRequests: 0 };
  }
};

const recordAISuccess = async (modelUsed: string) => {
  try {
    const current = await getAIAnalytics();
    const updated: AIAnalytics = {
      totalRequests: (current.totalRequests || 0) + 1,
      lastUsed: new Date().toISOString(),
      lastModel: modelUsed,
    };
    await AsyncStorage.setItem(
      GOOGLEAI_ANALYTICS_STORAGE,
      JSON.stringify(updated)
    );
  } catch (e) {}
};

/**
 * Execute Gemini generateContent with automatic fallback and zero-latency thinking config
 */
export const executeGenerateContent = async (
  apiKey: string,
  primaryModel: string,
  basePayload: any,
  timeoutMs: number = 18000
): Promise<{ text: string; modelUsed: string }> => {
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter(m => m !== primaryModel)];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const payload = JSON.parse(JSON.stringify(basePayload));
    // For 2.5 flash models, disable thinking budget for instant output
    if (model.includes('2.5-flash') && payload.generationConfig) {
      payload.generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.error) {
        // If thinkingConfig is not supported on this specific model/tier, retry without it
        if (data.error.message?.includes('thinkingConfig')) {
          delete payload.generationConfig.thinkingConfig;
          const retryRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );
          const retryData = await retryRes.json();
          if (retryData.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { text: retryData.candidates[0].content.parts[0].text, modelUsed: model };
          }
        }
        throw new Error(data.error.message || `Google AI Error: ${data.error.code || response.status}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No content returned from Google AI Studio.');
      }

      return { text, modelUsed: model };
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      const msg = error?.message || '';
      console.warn(`[GoogleAI] Model ${model} issue: ${msg}. Trying fallback...`);

      // If invalid API key, fail immediately without trying fallbacks
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Google AI failed to generate a response. Please check your network or API key.');
};

export const chatWithAI = async (prompt: string, base64Image?: string, schema?: any) => {
  const apiKey = await getGoogleAIApiKey();
  if (!apiKey) {
    throw new Error(
      'Google AI API Key is missing. Please enter your API key in the Profile tab.'
    );
  }

  const modelId = await getGoogleAIModel();

  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: base64Image,
      },
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      ...(schema ? { responseSchema: schema } : {}),
    },
  };

  const { text, modelUsed } = await executeGenerateContent(apiKey, modelId, payload);
  await recordAISuccess(modelUsed).catch(() => {});
  return text;
};

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const chatWithLibraryAgent = async (
  history: ChatMessage[],
  libraryContext: string
): Promise<string> => {
  const apiKey = await getGoogleAIApiKey();
  if (!apiKey) {
    throw new Error('Google AI API Key is missing. Please enter your API key in the Profile tab.');
  }

  const modelId = await getGoogleAIModel();

  const systemInstruction = `You are CramSnap Agent, an intelligent academic AI assistant inside a student's photo notes app.
You have access to the user's library of captured notes, whiteboards, and documents.
Your goal is to answer their questions about their notes, explain concepts, find specific information, or summarize topics.

LIBRARY CONTEXT (Current Active Notes in User's Library):
${libraryContext || 'The user library is currently empty. There are no notes or images.'}

INSTRUCTIONS:
1. Format ALL responses using clean Markdown. Use **bold** for key terms, bullet lists for multiple items, and headings (##) for sections if needed.
   - IMPORTANT: Do NOT wrap regular words, names, titles, subjects, or general text in inline backticks. Only use inline backticks for actual programming code, command names, or file paths.
2. For ALL mathematical expressions, equations, formulas, and math symbols, you MUST use standard KaTeX / LaTeX syntax:
   - Use inline math with single dollar signs: $formula$ (e.g. $E = mc^2$, $f(x) = \\frac{1}{x}$, $\\alpha + \\beta = 90^\\circ$).
   - Use display/block math with double dollar signs on their own lines: $$formula$$ (e.g. $$\\int_{a}^{b} f(x)dx = F(b) - F(a)$$, $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$).
   - CRITICAL: NEVER wrap math or KaTeX formulas inside backticks (\`) or code blocks. Math must be enclosed ONLY in dollar signs directly.
   - NEVER use plain text fractions like "x / y" or plain text superscripts when explaining math; always use proper KaTeX formatting.
3. Keep responses clear, concise, and well-organized. Output your response directly.
4. Active Notes only: ONLY reference notes that currently exist in the LIBRARY CONTEXT above. If the user asks for a specific note or image, output the exact tag [NOTE:note_id] (e.g. "Here is the note: [NOTE:12345-abcde]").
5. NOTE tags: output [NOTE:note_id] as plain raw text ONLY on its own line — NEVER inside backticks, asterisks, bullets, or markdown formatting (e.g. correct: [NOTE:abc-123], wrong: *[NOTE:abc-123]*, \`[NOTE:abc-123]\`, * [NOTE:abc-123]).
6. Deleted / Missing Notes: If a note is not present in the current LIBRARY CONTEXT (even if mentioned in earlier conversation messages), it has been deleted or does not exist. Do NOT output a [NOTE:id] tag for it; politely inform the user that it is no longer in their library or was deleted.`;

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  const payload = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: contents,
    generationConfig: {
      temperature: 0.3,
    },
  };

  const { text, modelUsed } = await executeGenerateContent(apiKey, modelId, payload);
  await recordAISuccess(modelUsed).catch(() => {});
  return text;
};

// Backward-compatible wrapper
export const streamChatWithLibraryAgent = async (
  history: ChatMessage[],
  libraryContext: string,
  onUpdate: (text: string) => void
): Promise<string> => {
  const text = await chatWithLibraryAgent(history, libraryContext);
  onUpdate(text);
  return text;
};


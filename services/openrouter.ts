import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENROUTER_KEY_STORAGE = 'user_openrouter_api_key';
const OPENROUTER_MODEL_STORAGE = 'user_openrouter_model';
const OPENROUTER_ANALYTICS_STORAGE = 'user_openrouter_analytics';

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export const PRESET_MODELS: AIModelOption[] = [
  {
    id: 'google/gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini Flash Lite',
    description: 'Ultra fast & economical',
    provider: 'Google',
  },
  {
    id: 'google/gemini-flash-1.5',
    name: 'Gemini 1.5 Flash',
    description: 'Document & whiteboard comprehension',
    provider: 'Google',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast & accurate multimodal',
    provider: 'OpenAI',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Superior handwriting & OCR',
    provider: 'Anthropic',
  },
];

export const DEFAULT_MODEL_ID = 'google/gemini-2.5-flash-lite-preview-09-2025';

export const getOpenRouterApiKey = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(OPENROUTER_KEY_STORAGE);
    if (saved && saved.trim()) return saved.trim();
    return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
  } catch (e) {
    return '';
  }
};

export const setOpenRouterApiKey = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
  } catch (e) {
    console.error('Error saving OpenRouter API key:', e);
  }
};

export const getOpenRouterModel = async (): Promise<string> => {
  try {
    const model = await AsyncStorage.getItem(OPENROUTER_MODEL_STORAGE);
    return model || DEFAULT_MODEL_ID;
  } catch (e) {
    return DEFAULT_MODEL_ID;
  }
};

export const setOpenRouterModel = async (model: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(OPENROUTER_MODEL_STORAGE, model);
  } catch (e) {
    console.error('Error saving OpenRouter model:', e);
  }
};

export interface AIAnalytics {
  totalRequests: number;
  lastUsed?: string;
  lastModel?: string;
}

export const getAIAnalytics = async (): Promise<AIAnalytics> => {
  try {
    const raw = await AsyncStorage.getItem(OPENROUTER_ANALYTICS_STORAGE);
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
      OPENROUTER_ANALYTICS_STORAGE,
      JSON.stringify(updated)
    );
  } catch (e) {}
};

export const chatWithAI = async (prompt: string, base64Image?: string) => {
  const apiKey = await getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      'OpenRouter API Key is missing. Please enter your API key in the Profile tab.'
    );
  }

  const modelId = await getOpenRouterModel();

  const messages = [
    {
      role: 'user',
      content: base64Image
        ? [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ]
        : prompt,
    },
  ];

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://collegescanner.app',
          'X-Title': 'College Scanner App',
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages,
          response_format: { type: 'json_object' },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter Error');
    }

    // Record success in local analytics
    await recordAISuccess(modelId);

    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    throw error;
  }
};

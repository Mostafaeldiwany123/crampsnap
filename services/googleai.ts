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
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', description: 'Newest Flash (Intro pricing)' },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Latest Flash' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Flash (GA)' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Flagship Flash' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Flash-Lite tier' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Flagship reasoning' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Mid-tier' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', description: 'High-volume workhorse' },
];

export const DEFAULT_MODEL_ID = 'gemini-3.5-flash-lite';

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
    let model = await AsyncStorage.getItem(GOOGLEAI_MODEL_STORAGE);
    
    // Auto-migrate models that are dead for new API keys
    if (model === 'gemini-2.5-flash-lite') model = 'gemini-3.5-flash-lite';
    if (model === 'gemini-2.5-flash') model = 'gemini-3.5-flash';
    if (model === 'gemini-2.5-pro') model = 'gemini-3.1-pro-preview';
    
    return model || DEFAULT_MODEL_ID;
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts,
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            ...(schema ? { responseSchema: schema } : {})
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Google AI Studio Error');
    }

    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No content returned from Google AI Studio.');
    }

    // Record success in local analytics
    await recordAISuccess(modelId);

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Google AI Studio API Error:', error);
    throw error;
  }
};

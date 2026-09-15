import { supabase } from './supabase';

export const analyzeWithAI = async (base64Image: string, prompt: string): Promise<string> => {
    try {
        if (!supabase) throw new Error('Supabase not configured');

        const { data, error } = await supabase.functions.invoke('analyze-note', {
            body: {
                image: base64Image,
                prompt: prompt
            },
        });

        if (error) {
            console.error('Edge function error:', error);
            throw new Error('AI analysis failed');
        }

        return data.content;
    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    }
};

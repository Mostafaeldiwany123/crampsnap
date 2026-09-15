import { supabase } from './supabase';

export const trackUsage = async (event: string, metadata: any = {}) => {
    try {
        // Only track if Supabase is properly initialized
        if (!supabase) {
            console.log('Usage tracking skipped (Supabase not configured):', event);
            return;
        }

        const { error } = await supabase
            .from('usage_logs')
            .insert([
                {
                    event_type: event,
                    metadata,
                    platform: typeof window !== 'undefined' ? 'web' : 'mobile'
                }
            ]);

        if (error) console.warn('Usage tracking error:', error.message);
    } catch (e) {
        // Silently fail tracking to not break user experience
        console.error('Usage tracking failed:', e);
    }
};

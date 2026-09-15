import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_LOGS_KEY = 'college_app_usage_logs';

export const trackUsage = async (event: string, metadata: any = {}) => {
  try {
    const raw = await AsyncStorage.getItem(USAGE_LOGS_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({
      event,
      metadata,
      timestamp: new Date().toISOString(),
    });
    // Keep last 50 events locally
    await AsyncStorage.setItem(USAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch (e) {
    console.log('Usage tracking local note:', event);
  }
};

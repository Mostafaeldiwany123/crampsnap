import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/scan');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FBBF24" />
    </View>
  );
}

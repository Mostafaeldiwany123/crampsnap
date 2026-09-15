import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(tabs)/scan');
    }, 150);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.loaderContent}>
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
        <Text style={styles.appName}>COLLEGE SCANNER</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spinner: {
    transform: [{ scale: 1.1 }],
  },
  appName: {
    fontSize: 12,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 3,
  },
});

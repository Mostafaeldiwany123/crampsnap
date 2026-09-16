import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Key,
  Eye,
  EyeSlash,
  ShieldCheck,
  LinkSimple,
  ArrowRight,
} from 'phosphor-react-native';
import { setGoogleAIApiKey } from '@/services/googleai';

export default function OnboardingScreen() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    const clean = apiKey.trim().replace(/\s+/g, '');
    if (!clean) {
      setError('Paste your Gemini API key to continue.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await setGoogleAIApiKey(clean);
      router.replace('/scan');
    } catch (e) {
      setError('Something went wrong saving your key. Please try again.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Centered group: brand + setup card */}
        <View style={styles.centerGroup}>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.iconTile}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome to CramSnap</Text>
          <Text style={styles.tagline}>Your lecture photos, organized by AI.</Text>
        </View>

        {/* One-time API key setup */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>One-Time Setup</Text>

          <View style={styles.inputRow}>
            <Key size={20} color="#64748B" weight="regular" />
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={(t) => {
                setApiKey(t);
                if (error) setError('');
              }}
              placeholder="Paste your Gemini API key"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="password"
              onSubmitEditing={handleStart}
              returnKeyType="done"
              editable={!saving}
            />
            <TouchableOpacity
              onPress={() => setShowKey(!showKey)}
              hitSlop={8}
              activeOpacity={0.7}
            >
              {showKey ? (
                <EyeSlash size={20} color="#64748B" weight="regular" />
              ) : (
                <Eye size={20} color="#64748B" weight="regular" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
            activeOpacity={0.7}
          >
            <LinkSimple size={15} color="#3B82F6" weight="bold" />
            <Text style={styles.linkText}>Don't have a key? Get one free</Text>
            <ArrowRight size={13} color="#3B82F6" weight="bold" />
          </TouchableOpacity>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.cta, !apiKey.trim() && styles.ctaMuted]}
            onPress={handleStart}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.ctaText}>Start using CramSnap</Text>
                <ArrowRight size={18} color="#FFFFFF" weight="bold" />
              </>
            )}
          </TouchableOpacity>
        </View>
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <ShieldCheck size={14} color="#64748B" weight="fill" />
          <Text style={styles.privacyText} numberOfLines={1}>
            Stored only on this device — never uploaded.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  centerGroup: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconTile: {
    width: 108,
    height: 108,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  icon: {
    width: 84,
    height: 84,
    borderRadius: 22,
  },
  title: {
    fontSize: 30,
    fontFamily: 'Assistant',
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Assistant',
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: 'Assistant',
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#3B82F6',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#EF4444',
    textAlign: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    height: 54,
  },
  ctaMuted: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 24,
    paddingHorizontal: 10,
  },
  privacyText: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
    textAlign: 'center',
    flexShrink: 1,
  },
});
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  FilePdf,
  Trash,
  CaretRight,
  Eye,
  EyeSlash,
  Check,
  Cpu,
  Database,
  Images,
  Sparkle,
} from 'phosphor-react-native';
import {
  getNotes,
  getCategories,
  getStorageUsage,
  clearAllData,
} from '@/services/notes';
import {
  getOpenRouterApiKey,
  setOpenRouterApiKey,
  getOpenRouterModel,
  setOpenRouterModel,
  getAIAnalytics,
  AIAnalytics,
} from '@/services/openrouter';
import { Note, Category } from '@/types';

export default function ProfileScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storageUsage, setStorageUsage] = useState({ bytes: 0, formatted: '0 KB' });
  const [aiAnalytics, setAiAnalytics] = useState<AIAnalytics>({ totalRequests: 0 });

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const [exportingAll, setExportingAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allNotes, allCats, storage, analytics, savedKey] =
        await Promise.all([
          getNotes(),
          getCategories(),
          getStorageUsage(),
          getAIAnalytics(),
          getOpenRouterApiKey(),
        ]);

      setNotes(allNotes);
      setCategories(allCats);
      setStorageUsage(storage);
      setAiAnalytics(analytics);
      setApiKey(savedKey || '');
    } catch (e) {
      console.error('Failed to load profile & analytics data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSaveApiKey = async () => {
    await setOpenRouterApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleExportAllPDF = async () => {
    if (notes.length === 0) {
      Alert.alert('No Notes', 'You do not have any notes to export yet.');
      return;
    }

    setExportingAll(true);
    try {
      const notesHtml = notes
        .map(
          (n) => `
          <div style="page-break-after: always; padding-bottom: 30px; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 20px; color: #0f172a; margin-bottom: 6px;">${n.title || 'Untitled Note'}</h2>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Captured: ${new Date(n.created_at || Date.now()).toLocaleDateString()}</div>
            ${n.image_url ? `<img src="${n.image_url}" style="max-width: 100%; max-height: 400px; border-radius: 8px; margin-bottom: 16px;" />` : ''}
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${n.content || 'No extracted text.'}</div>
          </div>
        `
        )
        .join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Study Vault Backup</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 26px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
            </style>
          </head>
          <body>
            <h1>Complete Study Vault (${notes.length} notes)</h1>
            ${notesHtml}
          </body>
        </html>
      `;

      const { uri } = await printToFileAsync({ html: fullHtml });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error('Export error:', e);
      Alert.alert('Export Error', 'Failed to generate PDF vault.');
    } finally {
      setExportingAll(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Local Data',
      'This will delete all saved lecture notes and categories from your device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadData();
            Alert.alert('Data Reset', 'All local data has been cleared.');
          },
        },
      ]
    );
  };

  const photoCount = notes.filter((n) => !!n.image_url).length;

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics & AI</Text>
        <Text style={styles.headerSubtitle}>
          Local vault metrics & OpenRouter configuration
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── METRICS GRID (Borderless, solid clean cards) ─── */}
        <Text style={styles.sectionHeading}>DATA USAGE & METRICS</Text>
        <View style={styles.grid}>
          <View style={styles.statBox}>
            <Images size={22} color="#0F172A" weight="regular" />
            <Text style={styles.statValue}>{photoCount}</Text>
            <Text style={styles.statLabel}>Photos Saved</Text>
          </View>

          <View style={styles.statBox}>
            <FilePdf size={22} color="#0F172A" weight="regular" />
            <Text style={styles.statValue}>{notes.length}</Text>
            <Text style={styles.statLabel}>Total Notes</Text>
          </View>

          <View style={styles.statBox}>
            <Database size={22} color="#0F172A" weight="regular" />
            <Text style={styles.statValue}>{storageUsage.formatted}</Text>
            <Text style={styles.statLabel}>Storage Used</Text>
          </View>

          <View style={styles.statBox}>
            <Cpu size={22} color="#0F172A" weight="regular" />
            <Text style={styles.statValue}>{aiAnalytics.totalRequests || 0}</Text>
            <Text style={styles.statLabel}>AI Analyzed</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ─── OPENROUTER AI CONFIGURATION ─── */}
        <Text style={styles.sectionHeading}>OPENROUTER AI</Text>
        <Text style={styles.sectionDescription}>
          Enter your API key to enable instant OCR, mathematical formula extraction, and AI categorization.
        </Text>

        {/* API Key Input */}
        <View style={styles.keyInputRow}>
          <TextInput
            style={styles.keyInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-or-v1-..."
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.iconActionBtn}
            onPress={() => setShowKey(!showKey)}
            activeOpacity={0.7}
          >
            {showKey ? (
              <EyeSlash size={20} color="#64748B" weight="regular" />
            ) : (
              <Eye size={20} color="#64748B" weight="regular" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveKeyBtn, keySaved && styles.saveKeyBtnSuccess]}
            onPress={handleSaveApiKey}
            activeOpacity={0.8}
          >
            {keySaved ? (
              <Check size={18} color="#FFFFFF" weight="bold" />
            ) : (
              <Text style={styles.saveKeyBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* ─── DATA MANAGEMENT ─── */}
        <Text style={styles.sectionHeading}>DATA MANAGEMENT</Text>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleExportAllPDF}
          disabled={exportingAll}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <FilePdf size={22} color="#0F172A" weight="regular" />
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>
                {exportingAll ? 'Generating PDF...' : 'Export Notes to PDF'}
              </Text>
              <Text style={styles.actionSub}>
                Download compiled study guide ({notes.length} notes)
              </Text>
            </View>
          </View>
          {exportingAll ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <CaretRight size={18} color="#94A3B8" weight="bold" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleResetData}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <Trash size={22} color="#EF4444" weight="regular" />
            <View style={styles.actionTextCol}>
              <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
                Clear Local Vault
              </Text>
              <Text style={styles.actionSub}>
                Delete all photos and categories on this device
              </Text>
            </View>
          </View>
          <CaretRight size={18} color="#EF4444" weight="bold" />
        </TouchableOpacity>

        <Text style={styles.footerText}>
          College Scanner &bull; 100% Local-First &bull; v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 84 : 64, // Pushed down further
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 30,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 110,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  subHeading: {
    fontSize: 11,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
  },
  // Metrics Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  // Key Input
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  keyInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#0F172A',
    paddingVertical: 10,
  },
  iconActionBtn: {
    padding: 6,
  },
  saveKeyBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveKeyBtnSuccess: {
    backgroundColor: '#10B981',
  },
  saveKeyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Assistant',
    fontWeight: '700',
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
    marginTop: 28,
    marginBottom: 16,
  },
});

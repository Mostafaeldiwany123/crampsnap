import {
  AIAnalytics,
  AVAILABLE_MODELS,
  getAIAnalytics,
  getGoogleAIApiKey,
  getGoogleAIModel,
  setGoogleAIApiKey,
  setGoogleAIModel,
} from '@/services/googleai';
import {
  clearAllData,
  getNotes,
  getStorageUsage
} from '@/services/notes';
import { Note } from '@/types';
import { printToFileAsync } from 'expo-print';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  CaretRight,
  Check,
  Cpu,
  Eye,
  EyeSlash,
  Key,
  LinkSimple,
  Trash
} from 'phosphor-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function ProfileScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [storageUsage, setStorageUsage] = useState({ bytes: 0, formatted: '0 KB' });
  const [aiAnalytics, setAiAnalytics] = useState<AIAnalytics>({ totalRequests: 0 });

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showModelModal, setShowModelModal] = useState(false);

  const [exportingAll, setExportingAll] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allNotes, storage, analytics, savedKey, savedModel] =
        await Promise.all([
          getNotes(),
          getStorageUsage(),
          getAIAnalytics(),
          getGoogleAIApiKey(),
          getGoogleAIModel(),
        ]);

      setNotes(allNotes);
      setStorageUsage(storage);
      setAiAnalytics(analytics);
      setApiKey(savedKey || '');
      setSelectedModel(savedModel);
    } catch (e) {
      console.error('Failed to load profile data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSaveApiKey = async (newKey: string) => {
    setApiKey(newKey);
    await setGoogleAIApiKey(newKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleSelectModel = async (modelId: string) => {
    await setGoogleAIModel(modelId);
    setSelectedModel(modelId);
    setShowModelModal(false);
  };

  const handleExportAllPDF = async () => {
    if (notes.length === 0) {
      Alert.alert('No Notes', 'You do not have any notes to export yet.');
      return;
    }
    setExportingAll(true);
    try {
      const notesHtml = notes.map((n) => `
          <div style="page-break-after: always; padding-bottom: 30px; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 20px; color: #0f172a; margin-bottom: 6px;">${n.title || 'Untitled Note'}</h2>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Captured: ${new Date(n.created_at || Date.now()).toLocaleDateString()}</div>
            ${n.image_url ? `<img src="${n.image_url}" style="max-width: 100%; max-height: 400px; border-radius: 8px; margin-bottom: 16px;" />` : ''}
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${n.content || 'No extracted text.'}</div>
          </div>
        `).join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8"><title>Study Vault</title>
            <style>body { font-family: -apple-system, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }</style>
          </head>
          <body><h1>Complete Study Vault (${notes.length} notes)</h1>${notesHtml}</body>
        </html>
      `;
      const { uri } = await printToFileAsync({ html: fullHtml });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Export Error', 'Failed to generate PDF vault.');
    } finally {
      setExportingAll(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Clear Local Vault',
      'This will delete all saved lecture notes and categories from your device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await loadData();
          },
        },
      ]
    );
  };

  const photoCount = notes.filter((n) => !!n.image_url).length;
  const selectedModelData = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>

        {/* STATS OVERVIEW - MINIMALIST */}
        <Text style={styles.sectionHeader}>ANALYTICS</Text>
        <View style={styles.cardGroup}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{photoCount}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{notes.length}</Text>
              <Text style={styles.statLabel}>Personal Notes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{aiAnalytics.totalRequests || 0}</Text>
              <Text style={styles.statLabel}>AI Uses</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeader}>GOOGLE AI STUDIO</Text>
        <View style={styles.cardGroup}>

          <View style={styles.cardRow}>
            <Key size={22} color="#64748B" weight="regular" style={styles.rowIcon} />
            <View style={styles.cardRowContent}>
              <Text style={styles.cardRowTitle}>API Key</Text>
              <TextInput
                style={styles.keyInput}
                value={apiKey}
                onChangeText={handleSaveApiKey}
                placeholder="AIzaSy..."
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowKey(!showKey)}
              style={{ padding: 4, marginLeft: 4 }}
              activeOpacity={0.7}
            >
              {showKey ? (
                <EyeSlash size={20} color="#64748B" weight="regular" />
              ) : (
                <Eye size={20} color="#64748B" weight="regular" />
              )}
            </TouchableOpacity>
            {keySaved && <Check size={18} color="#10B981" weight="bold" style={{ marginLeft: 8 }} />}
          </View>
          <View style={styles.cardDivider} />

          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setShowModelModal(true)}
            activeOpacity={0.7}
          >
            <Cpu size={22} color="#64748B" weight="regular" style={styles.rowIcon} />
            <View style={styles.cardRowContent}>
              <Text style={styles.cardRowTitle}>AI Model</Text>
              <Text style={styles.cardRowValue} numberOfLines={1}>{selectedModelData.name}</Text>
            </View>
            <CaretRight size={18} color="#CBD5E1" weight="bold" />
          </TouchableOpacity>
          <View style={styles.cardDivider} />

          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
            activeOpacity={0.7}
          >
            <LinkSimple size={22} color="#64748B" weight="regular" style={styles.rowIcon} />
            <View style={styles.cardRowContent}>
              <Text style={styles.cardRowTitle}>Get Free API Key</Text>
            </View>
            <CaretRight size={18} color="#CBD5E1" weight="bold" />
          </TouchableOpacity>
        </View>

        {/* DESTRUCTIVE ACTIONS */}
        <View style={[styles.cardGroup, { marginTop: 24 }]}>

          <TouchableOpacity
            style={styles.cardRow}
            onPress={handleResetData}
            activeOpacity={0.7}
          >
            <Trash size={22} color="#EF4444" weight="regular" style={styles.rowIcon} />
            <View style={styles.cardRowContent}>
              <Text style={[styles.cardRowTitle, { color: '#EF4444' }]}>Clear Local Vault</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>College Scanner v1.0.0</Text>
      </ScrollView>

      {/* Model Selection Modal */}
      <Modal
        visible={showModelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select AI Model</Text>
              <TouchableOpacity onPress={() => setShowModelModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={AVAILABLE_MODELS}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, selectedModel === item.id && styles.modalOptionSelected]}
                  onPress={() => handleSelectModel(item.id)}
                >
                  <View style={styles.modalOptionText}>
                    <Text style={[styles.modalOptionTitle, selectedModel === item.id && styles.modalOptionTitleSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.modalOptionSub}>{item.description}</Text>
                  </View>
                  {selectedModel === item.id && <Check size={20} color="#3B82F6" weight="bold" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 24,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#64748B',
    marginTop: 4,
  },
  // Group Headers
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  rowIcon: {
    marginRight: 16,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginLeft: 54, // Align with text start
  },
  cardRowContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRowTitle: {
    fontSize: 16,
    fontFamily: 'Assistant',
    color: '#0F172A',
    fontWeight: '500',
  },
  cardRowValue: {
    fontSize: 15,
    fontFamily: 'Assistant',
    color: '#64748B',
    paddingRight: 8,
    maxWidth: '50%',
    textAlign: 'right',
  },
  keyInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontFamily: 'Assistant',
    color: '#64748B',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cardFooterText: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
    marginLeft: 12,
    marginBottom: 32,
    lineHeight: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#CBD5E1',
    marginTop: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    fontSize: 16,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalOptionTitleSelected: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  modalOptionSub: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
});

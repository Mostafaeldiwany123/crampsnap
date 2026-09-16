import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  CaretLeft,
  ShareNetwork,
  Trash,
  Copy,
  FilePdf,
  Check,
  ArrowsOut,
  X,
  CaretRight,
  CheckCircle,
} from 'phosphor-react-native';
import { deleteNote, getCategories, getNote, updateNote } from '@/services/notes';
import { trackUsage } from '@/services/usage';
import { Category, Note } from '@/types';

const { width, height } = Dimensions.get('window');

export default function NotePreviewScreen() {
  const { content, id } = useLocalSearchParams<{ content: string; id: string }>();
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [editUserNote, setEditUserNote] = useState('');

  const loadNote = async () => {
    if (id) {
      try {
        setLoading(true);
        const foundNote = await getNote(id);
        if (foundNote) {
          setNote(foundNote);
          setEditUserNote(foundNote.user_note || '');
          if (foundNote.category_id) {
            const cats = await getCategories();
            const cat = cats.find((c) => c.id === foundNote.category_id);
            setCategory(cat || null);
          }
        }
      } catch (e) {
        console.error('Error fetching note:', e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNote();

      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        Keyboard.dismiss();
      });

      return () => {
        hideSubscription.remove();
      };
    }, [id])
  );

  const displayContent = note?.content || content || '';
  const isSaved = !!note || !!id;

  const handleUpdateUserNote = async (text: string) => {
    setEditUserNote(text);
    if (note?.id) {
      await updateNote(note.id, { user_note: text });
    }
  };



  const handleDelete = () => {
    if (!note?.id) return;
    Alert.alert('Delete Photo', 'Remove this note and photo from your study vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteNote(note.id);
            router.back();
          } catch (e) {
            Alert.alert('Delete Error', 'Failed to delete note.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleCopyText = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(displayContent);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
    >
      {/* ─── TOP HERO IMAGE (Fixed 35% Height - Fits Screen) ─── */}
      <View style={styles.heroContainer}>
        {note?.image_url ? (
          <Image
            source={{ uri: note.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder} />
        )}

        {/* Top Navigation Overlay Buttons */}
        <View style={styles.heroTopBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8 }}
            activeOpacity={0.8}
          >
            <CaretLeft size={28} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── SLIDE-UP DETAIL CARD (Fits viewport cleanly without page scroll) ─── */}
      <View style={styles.detailCard}>
        {/* Pull Handle */}
        <View style={styles.handleBar} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Header: Avatar/Thumbnail + Title + Subject Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarThumbnailWrapper}>
            {note?.image_url ? (
              <Image source={{ uri: note.image_url }} style={styles.avatarThumbnail} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: category?.color || '#0F172A' },
                ]}
              />
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {note?.title || 'Classroom Capture'}
            </Text>

            {category && (
              <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{category.name}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setFullscreenImage(true)}
            style={styles.fullscreenBtn}
            activeOpacity={0.7}
          >
            <ArrowsOut size={20} color="#64748B" weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* 2. Status & Quick Actions Row */}
        <View style={styles.statusAndActionsRow}>
          <View style={styles.statusMetaCol}>
            <Text style={styles.metaLabel}>Vault status</Text>
            <Text style={styles.metaValue}>Digitized &bull; {new Date(note?.created_at || Date.now()).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}</Text>
          </View>

          {/* Quick Actions (Simple, non-annoying circular buttons) */}
          <View style={styles.quickActionsGroup}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={handleCopyText}
              activeOpacity={0.7}
            >
              {copied ? (
                <Check size={18} color="#10B981" weight="bold" />
              ) : (
                <Copy size={18} color="#334155" weight="regular" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => {
                if (typeof navigator !== 'undefined' && (navigator as any).share) {
                  (navigator as any).share({ title: note?.title, text: displayContent });
                } else {
                  handleCopyText();
                }
              }}
              activeOpacity={0.7}
            >
              <ShareNetwork size={18} color="#334155" weight="regular" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 3. Personal Notes Section */}
        <View style={styles.contentBoxSection}>
          <Text style={styles.contentSectionHeading}>Personal notes</Text>
          <View style={styles.contentContainer}>
            <TextInput
              style={styles.contentText}
              multiline
              value={editUserNote}
              onChangeText={handleUpdateUserNote}
              placeholder="Add your personal notes..."
              placeholderTextColor="#94A3B8"
              underlineColorAndroid="transparent"
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* 4. AI Analysis Section */}
        <View style={styles.contentBoxSection}>
          <Text style={styles.contentSectionHeading}>AI Analysis</Text>
          <View style={styles.contentContainer}>
            <ScrollView
              style={styles.internalScroll}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.contentTextReadOnly}>
                {displayContent || 'No AI analysis available.'}
              </Text>
            </ScrollView>
          </View>
        </View>

        {/* 5. Bottom Compact Action Rows */}
        <View style={styles.actionList}>


          {isSaved && (
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleDelete}
              disabled={deleting}
              activeOpacity={0.65}
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <Trash size={16} color="#EF4444" weight="bold" />
                </View>
                <Text style={[styles.actionRowLabel, { color: '#EF4444' }]}>
                  Delete from Vault
                </Text>
              </View>
              <CaretRight size={15} color="#EF4444" weight="regular" />
            </TouchableOpacity>
          )}
          </View>
        </ScrollView>
      </View>

      {/* Fullscreen Image Modal */}
      <Modal visible={fullscreenImage} transparent={true} animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setFullscreenImage(false)}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: note?.image_url }}
            style={styles.fullscreenImg}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Hero Image - 35% of screen height
  heroContainer: {
    width: width,
    height: height * 0.35,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
  },
  heroTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 32,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  frostedBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  // Overlapping White Detail Card - fills the rest of viewport, no page scroll
  detailCard: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  avatarThumbnailWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  avatarThumbnail: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  subjectPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  subjectPillText: {
    fontSize: 11,
    fontFamily: 'Assistant',
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  fullscreenBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status & Actions Row
  statusAndActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  statusMetaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: 'AssistantBold',
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  quickActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Extracted Content Section
  contentBoxSection: {
    flex: 1,
    marginVertical: 4,
  },
  contentSectionHeading: {
    fontSize: 10,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    minHeight: 80,
  },
  internalScroll: {
    flex: 1,
  },
  contentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#1E293B',
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    margin: 0,
    includeFontPadding: false,
  },
  contentTextReadOnly: {
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#1E293B',
    lineHeight: 22,
  },
  // Bottom Action List
  actionList: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowLabel: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#0F172A',
  },
  // Modal Fullscreen Lightbox
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  fullscreenImg: {
    width: '100%',
    height: '100%',
  },
});

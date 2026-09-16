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
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
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
import MarkdownRenderer from '@/components/MarkdownRenderer';

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

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ─── TOP HERO IMAGE (Fixed 35% Height - Fits Screen) ─── */}
      <View style={styles.heroContainer}>
        {note?.image_url ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setFullscreenImage(true)}
            style={{ flex: 1 }}
          >
            <Image
              source={{ uri: note.image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
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
          
          <TouchableOpacity
            onPress={() => setFullscreenImage(true)}
            style={{ padding: 8 }}
            activeOpacity={0.8}
          >
            <ArrowsOut size={24} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── SLIDE-UP DETAIL CARD (Fits viewport cleanly without page scroll) ─── */}
      <View style={styles.detailCard}>
        {/* Pull Handle */}
        <View style={styles.handleBar} />

        <View style={{ flex: 1, paddingBottom: 10 }}>
          {/* 1. Header: Title + Description + Tags */}
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <Text style={styles.itemTitle}>{note?.title || 'Captured Document'}</Text>
              {note?.summary && (
                <Text style={styles.itemDescription}>{note.summary}</Text>
              )}
              {note?.tags && note.tags.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsContainer}>
                  {note.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag.replace(/^#/, '')}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

        <View style={styles.divider} />

        {/* 2. Personal Notes Section */}
        <View style={styles.contentBoxSectionSmall}>
          <Text style={styles.contentSectionHeading}>Personal notes</Text>
          <View style={styles.contentContainerSmall}>
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

        {/* 3. AI Analysis Section */}
        <View style={[styles.contentBoxSection, { flex: 1, marginTop: 12 }]}>
          <Text style={styles.contentSectionHeading}>AI Analysis</Text>
          <View style={[styles.contentContainerClean, { flex: 1 }]}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <MarkdownRenderer content={displayContent || 'No extracted text.'} />
              </ScrollView>
          </View>
        </View>

        {/* 4. Bottom Action Row */}
        <View style={styles.bottomActionRow}>
          <Text style={styles.bottomDateText}>
            {new Date(note?.created_at || Date.now()).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>

          <View style={styles.bottomActionIcons}>
            <TouchableOpacity onPress={handleCopyText} style={styles.bottomIconBtn} activeOpacity={0.7}>
              {copied ? <Check size={20} color="#10B981" weight="bold" /> : <Copy size={20} color="#64748B" />}
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                try {
                  const caption = `${note?.title || 'Note'}${note?.summary ? '\n\n' + note.summary : ''}`;

                  if (note?.image_url) {
                    if (Platform.OS === 'ios') {
                      // iOS: Share.share supports both url (local file) + message in one sheet
                      await Share.share({
                        message: caption,
                        url: note.image_url,
                      });
                    } else {
                      // Android: copy text to clipboard then open image share sheet
                      await Clipboard.setStringAsync(caption);
                      const canShare = await Sharing.isAvailableAsync();
                      if (canShare) {
                        await Sharing.shareAsync(note.image_url, {
                          dialogTitle: caption,
                          mimeType: 'image/jpeg',
                        });
                      }
                    }
                  } else {
                    await Share.share({ message: caption });
                  }
                } catch (error) {
                  console.error('Share error:', error);
                }
              }} 
              style={styles.bottomIconBtn}
              activeOpacity={0.7}
            >
              <ShareNetwork size={20} color="#64748B" />
            </TouchableOpacity>

            {isSaved && (
              <TouchableOpacity onPress={handleDelete} disabled={deleting} style={styles.bottomIconBtn} activeOpacity={0.7}>
                <Trash size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        </View>
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
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Hero Image - 32% of screen height
  heroContainer: {
    width: width,
    height: height * 0.32,
    position: 'relative',
    backgroundColor: '#000000',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 22,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: 12,
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
    marginTop: 2,
  },
  // Extracted Content Section
  contentBoxSectionSmall: {
    marginVertical: 2,
  },
  contentContainerSmall: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    height: 62, // Compact height for personal notes
  },
  contentBoxSection: {
    flex: 1,
    marginVertical: 2,
  },
  contentSectionHeading: {
    fontSize: 11,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contentContainerClean: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
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
  // Bottom Action Row
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 8,
  },
  bottomDateText: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
  },
  bottomActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bottomIconBtn: {
    padding: 4,
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

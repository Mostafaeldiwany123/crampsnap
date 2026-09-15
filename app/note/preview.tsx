import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  CaretLeft,
  ShareNetwork,
  Trash,
  FilePdf,
  Copy,
  Check,
  CalendarBlank,
  Sparkle,
  ArrowsOut,
  X,
} from 'phosphor-react-native';
import { deleteNote, getCategories, getNote } from '@/services/notes';
import { trackUsage } from '@/services/usage';
import { Category, Note } from '@/types';

const { width } = Dimensions.get('window');

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

  const loadNote = async () => {
    if (id) {
      try {
        setLoading(true);
        const foundNote = await getNote(id);
        if (foundNote) {
          setNote(foundNote);
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
    }, [id])
  );

  const displayContent = note?.content || content || '';
  const isSaved = !!note || !!id;

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${note?.title || 'Lecture Note'}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                padding: 40px;
                color: #0f172a;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.65;
              }
              h1 { font-size: 26px; margin-bottom: 8px; color: #0f172a; font-weight: 700; }
              .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
              img { max-width: 100%; border-radius: 12px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
              .body-box { background: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; white-space: pre-wrap; font-size: 15px; color: #1e293b; line-height: 1.7; }
            </style>
          </head>
          <body>
            <h1>${note?.title || 'College Lecture Note'}</h1>
            <div class="meta">Archived in Study Vault &bull; ${new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            ${note?.image_url ? `<img src="${note.image_url}" />` : ''}
            <div class="body-box">${displayContent}</div>
          </body>
        </html>
      `;

      const { uri } = await printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      await trackUsage('export_pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Export Error', 'Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = () => {
    if (!note?.id) return;
    Alert.alert('Delete Photo', 'Remove this note and photo from your vault?', [
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

  return (
    <View style={styles.container}>
      {/* ─── TOP ACTION BAR ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.circleBtn}
          activeOpacity={0.7}
        >
          <CaretLeft size={20} color="#111827" weight="bold" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {note?.title || 'Photo Details'}
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleExportPDF}
            style={styles.circleBtn}
            disabled={exporting}
            activeOpacity={0.7}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <ShareNetwork size={19} color="#111827" weight="regular" />
            )}
          </TouchableOpacity>

          {isSaved && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.circleBtn, styles.deleteBtn]}
              disabled={deleting}
              activeOpacity={0.7}
            >
              <Trash size={19} color="#EF4444" weight="regular" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── BODY CONTENT ─── */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PHOTO CARD */}
          {note?.image_url && (
            <View style={styles.photoCard}>
              <Image source={{ uri: note.image_url }} style={styles.photoImg} />

              <TouchableOpacity
                style={styles.expandBadge}
                onPress={() => setFullscreenImage(true)}
                activeOpacity={0.85}
              >
                <ArrowsOut size={14} color="#FFFFFF" weight="bold" />
                <Text style={styles.expandText}>Expand</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DETAILS & TITLE */}
          <View style={styles.titleSection}>
            <Text style={styles.noteTitle}>{note?.title || 'Lecture Capture'}</Text>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              {category && (
                <View style={[styles.pillBadge, { backgroundColor: '#F3F4F6' }]}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: category.color || '#10B981' },
                    ]}
                  />
                  <Text style={styles.pillText}>{category.name}</Text>
                </View>
              )}

              <View style={[styles.pillBadge, { backgroundColor: '#F8FAFC' }]}>
                <CalendarBlank size={13} color="#64748B" weight="regular" />
                <Text style={styles.dateText}>
                  {new Date(note?.created_at || Date.now()).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={[styles.pillBadge, { backgroundColor: '#ECFDF5' }]}>
                <Sparkle size={12} color="#059669" weight="fill" />
                <Text style={[styles.pillText, { color: '#059669' }]}>AI Extracted</Text>
              </View>
            </View>
          </View>

          {/* EXTRACTED NOTES CARD */}
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>Extracted Notes</Text>

              <TouchableOpacity
                style={[styles.copyPill, copied && styles.copyPillSuccess]}
                onPress={handleCopyText}
                activeOpacity={0.75}
              >
                {copied ? (
                  <Check size={14} color="#059669" weight="bold" />
                ) : (
                  <Copy size={14} color="#475569" weight="regular" />
                )}
                <Text style={[styles.copyPillText, copied && { color: '#059669' }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.contentText}>
                {displayContent || 'No extracted text found for this capture.'}
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionsFooter}>
            <TouchableOpacity
              style={styles.pdfExportBtn}
              onPress={handleExportPDF}
              disabled={exporting}
              activeOpacity={0.85}
            >
              <FilePdf size={18} color="#FFFFFF" weight="bold" />
              <Text style={styles.pdfExportBtnText}>
                {exporting ? 'Generating PDF...' : 'Export as PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX */}
      <Modal visible={fullscreenImage} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setFullscreenImage(false)}
          >
            <X size={22} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          {note?.image_url && (
            <Image
              source={{ uri: note.image_url }}
              style={styles.fullscreenImg}
              resizeMode="contain"
            />
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
  photoCard: {
    width: '100%',
    height: width * 0.65,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  expandBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  expandText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PTSansBold',
    fontWeight: '600',
  },
  titleSection: {
    marginBottom: 20,
  },
  noteTitle: {
    fontSize: 22,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    lineHeight: 28,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pillText: {
    fontSize: 12,
    fontFamily: 'PTSansBold',
    color: '#334155',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'PTSans',
    color: '#64748B',
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  copyPillSuccess: {
    backgroundColor: '#ECFDF5',
  },
  copyPillText: {
    fontSize: 12,
    fontFamily: 'PTSansBold',
    color: '#475569',
  },
  textContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contentText: {
    fontSize: 15,
    fontFamily: 'PTSans',
    color: '#1E293B',
    lineHeight: 24,
  },
  actionsFooter: {
    marginTop: 8,
  },
  pdfExportBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pdfExportBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
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
    width: width,
    height: '85%',
  },
});

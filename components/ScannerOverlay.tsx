import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MarkdownRenderer from './MarkdownRenderer';
import { Check, X, ArrowsOut } from 'phosphor-react-native';
import { getNote, deleteNote } from '@/services/notes';
import { Note } from '@/types';

const { width, height } = Dimensions.get('window');

interface ScannerOverlayProps {
  photoUri: string;
  noteId: string;
  onCancel: (noteId: string) => void;
  onSave: (noteId: string, manualNote?: string) => void;
}

export default function ScannerOverlay({ photoUri, noteId, onCancel, onSave }: ScannerOverlayProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [manualNote, setManualNote] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [analyzedNote, setAnalyzedNote] = useState<Note | null>(null);
  const [imgAspect, setImgAspect] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Animation values
  const entryScale = useRef(new Animated.Value(0.7)).current;
  const overlayFade = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  
  const panelSlideAnim = useRef(new Animated.Value(height * 0.6)).current;
  const panelFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Image.getSize(photoUri, (w, h) => {
      setImgAspect(w / h);
      setImgLoaded(true);

      // 1. Expand (pops out to fill viewport instantly hiding background)
      Animated.spring(entryScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start(() => {
        // 2. Fade in dark tint and text smoothly
        Animated.timing(overlayFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

        // 3. Simple slow breathing animation on the image itself
        Animated.loop(
          Animated.sequence([
            Animated.timing(imageScale, { toValue: 1.05, duration: 2500, useNativeDriver: true }),
            Animated.timing(imageScale, { toValue: 1, duration: 2500, useNativeDriver: true }),
          ])
        ).start();
      });
    });
  }, [photoUri]);

  // Poll for note completion
  useEffect(() => {
    let interval: any;
    if (isScanning && noteId) {
      interval = setInterval(async () => {
        const n = await getNote(noteId);
        if (n && (n.status === 'completed' || n.status === 'failed')) {
          clearInterval(interval);
          setAnalyzedNote(n);
          setIsScanning(false);

          // Smooth slide-up transition of the detail panel
          Animated.parallel([
            Animated.timing(panelSlideAnim, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
            Animated.timing(panelFadeAnim, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isScanning, noteId]);


  useEffect(() => {
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      Keyboard.dismiss();
    });

    return () => hideSubscription.remove();
  }, []);

  // ─── 1. SCANNING STATE (100% Solid Black Backdrop + Sleek Shimmer) ───
  if (isScanning) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]}>
        {/* Entry expand animation for image ONLY */}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: entryScale }] }]}>
          {/* Slow breathing image */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: imageScale }] }]}>
            <Image 
              source={{ uri: photoUri }} 
              style={StyleSheet.absoluteFill} 
              resizeMode={imgAspect > 1 ? 'contain' : 'cover'} 
            />
          </Animated.View>
        </Animated.View>

        {/* Fading overlay and text on top (independent from image scale) */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayFade }]} pointerEvents="none">
          {/* Static subtle dark tint to keep text readable (No flashing) */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />

          {/* Clean Analyzing Text (No Container) */}
          <View style={styles.analyzingTextWrapper}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.analyzingText}>Analyzing...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ─── 2. COMPLETED VIEW ───
  // For landscape images, shrink the hero height to match aspect ratio exactly (no black bars)
  const heroHeight = imgAspect > 1
    ? Math.min(Math.round(width / imgAspect), Math.round(height * 0.38))
    : Math.round(height * 0.32);

  return (
    <KeyboardAvoidingView style={styles.completedContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.heroContainer, { height: heroHeight }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsFullscreen(true)}
          style={{ flex: 1 }}
        >
          <Image 
            source={{ uri: photoUri }} 
            style={styles.heroImage} 
            resizeMode="cover" 
          />
        </TouchableOpacity>

        <View style={styles.heroTopBar}>
          <TouchableOpacity
            onPress={() => setIsFullscreen(true)}
            style={styles.frostedBtn}
            activeOpacity={0.8}
          >
            <ArrowsOut size={22} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Slide-Up White Detail Card (Large panel with high AI Extraction area) */}
      <Animated.View
        style={[
          styles.detailCard,
          {
            transform: [{ translateY: panelSlideAnim }],
            opacity: panelFadeAnim,
          }
        ]}
      >
        <View style={styles.handleBar} />

        <View style={{ flex: 1, paddingBottom: 6 }}>
          {/* 1. Header: Title + Summary + Tags */}
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {analyzedNote?.title || 'Captured Document'}
              </Text>
              {analyzedNote?.summary ? (
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {analyzedNote.summary}
                </Text>
              ) : null}
              {analyzedNote?.tags && analyzedNote.tags.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tagsContainer}
                >
                  {analyzedNote.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagPill}>
                      <Text style={styles.tagPillText}>{tag.replace(/^#/, '')}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* 2. Personal Notes Section (Compact) */}
          <View style={styles.contentBoxSectionSmall}>
            <Text style={styles.contentSectionHeading}>Personal notes</Text>
            <View style={styles.contentContainerSmall}>
              <TextInput
                style={styles.contentText}
                multiline
                value={manualNote}
                onChangeText={setManualNote}
                placeholder="Add your personal notes..."
                placeholderTextColor="#94A3B8"
                underlineColorAndroid="transparent"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* 3. AI Extraction Section (Maximized Height & Scrollable) */}
          <View style={[styles.contentBoxSection, { flex: 1, marginTop: 8 }]}>
            <Text style={styles.contentSectionHeading}>AI Extraction</Text>
            <View style={[styles.contentContainerClean, { flex: 1 }]}>
              <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <MarkdownRenderer content={analyzedNote?.content || 'No text could be extracted.'} />
              </ScrollView>
            </View>
          </View>

          {/* 4. Bottom Action Row */}
          <View style={styles.bottomActionRow}>
            <Text style={styles.bottomDateText}>
              {new Date(analyzedNote?.created_at || Date.now()).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  deleteNote(noteId);
                  onCancel(noteId);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => onSave(noteId, manualNote)}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" weight="bold" />
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Fullscreen Image Modal */}
      <Modal visible={isFullscreen} transparent={true} animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.8}
          >
            <X size={20} color="#FFFFFF" weight="bold" />
          </TouchableOpacity>
          <Image
            source={{ uri: photoUri }}
            style={styles.fullscreenImg}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Scanning Screen
  scanningScreenContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  solidBackdrop: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#000000',
  },
  scanCard: {
    width: width * 0.88,
    height: Math.round(height * 0.5),
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  scanImage: {
    width: '100%',
    height: '100%',
  },
  analyzingTextWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  // Completed Screen Container (Exact match to preview.tsx)
  completedContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
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
  heroTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 32,
    right: 18,
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
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 21,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#475569',
    marginBottom: 6,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
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
  contentBoxSectionSmall: {
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
  contentContainerSmall: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    height: 56,
  },
  contentBoxSection: {
    flex: 1,
    marginVertical: 2,
  },
  contentContainerClean: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  contentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#1E293B',
    lineHeight: 18,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 2,
  },
  bottomDateText: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: 'AssistantBold',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
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

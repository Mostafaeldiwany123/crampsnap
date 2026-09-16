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
} from 'react-native';
import { Check, TextAa, Tag, BookOpen, X, ArrowsOut } from 'phosphor-react-native';

const { width, height } = Dimensions.get('window');

interface ScannerOverlayProps {
  photoUri: string;
  onCancel: () => void;
  onSave: (categoryId?: string, manualNote?: string) => void;
}

export default function ScannerOverlay({ photoUri, onCancel, onSave }: ScannerOverlayProps) {
  // 1. Image Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  
  // 2. Scanning Laser
  const laserAnim = useRef(new Animated.Value(0)).current;
  const scanOpacityAnim = useRef(new Animated.Value(1)).current;
  
  // 3. Backdrop Fade & Image Tint
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // 4. AI Panel Slide up
  const panelAnim = useRef(new Animated.Value(height * 0.6)).current;
  const panelOpacityAnim = useRef(new Animated.Value(0)).current;
  
  const [isScanning, setIsScanning] = useState(true);
  const [manualNote, setManualNote] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // 1. Initial Shrink for Scanning
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        friction: 6,
        tension: 40,
        useNativeDriver: false, 
      }),
      Animated.timing(borderAnim, {
        toValue: 32,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      })
    ]).start(() => {
      // 2. Start laser scanning (up and down twice)
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false, 
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          })
        ]),
        { iterations: 1 } // one full up/down pass
      ).start(() => {
        // 3. Scan complete! Fade out laser, Restore image to fullscreen, Show Panel
        setIsScanning(false);
        Animated.timing(scanOpacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();

        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1, // Back to full screen
            friction: 7,
            tension: 50,
            useNativeDriver: false,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0, 
            friction: 7,
            tension: 50,
            useNativeDriver: false,
          }),
          Animated.timing(borderAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(backdropOpacity, {
            toValue: 0, // fade out black backdrop
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.spring(panelAnim, {
            toValue: 0,
            friction: 7,
            tension: 50,
            useNativeDriver: false,
          }),
          Animated.timing(panelOpacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          })
        ]).start();
      });

      // Pulse animation for the tint
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    });

    // Keyboard listener to fix focus bug on Android
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      Keyboard.dismiss(); // Forces input to blur when keyboard closes
    });

    return () => hideSubscription.remove();
  }, []);

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(height * 0.38), height * 0.38],
  });

  return (
    <KeyboardAvoidingView 
      style={styles.overlayContainer}
      behavior="padding"
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />

      {/* ─── SHRUNK IMAGE + LASER ─── */}
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim }
            ],
            borderRadius: borderAnim,
          }
        ]}
      >
        <Image source={{ uri: photoUri }} style={styles.capturedImage} />
        
        {isScanning && (
          <Animated.View style={[styles.scanTint, { opacity: pulseAnim }]} pointerEvents="none" />
        )}

        {isScanning && (
          <Animated.View
            style={[
              styles.laserLine,
              { 
                transform: [{ translateY: laserTranslateY }],
                opacity: scanOpacityAnim 
              }
            ]}
          >
            {/* Pure white clean scanning effect */}
            <View style={styles.laserGlow} />
          </Animated.View>
        )}
      </Animated.View>

      {/* ─── AI EXTRACTION PANEL (Slides up over fullscreen image) ─── */}
      {!isScanning && (
        <Animated.View
          style={[
            styles.panel,
            { 
              transform: [{ translateY: panelAnim }],
              opacity: panelOpacityAnim 
            }
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          <View style={styles.panelHeader}>
            <Text style={styles.metaLabel}>Extraction complete</Text>
          </View>
          
          <ScrollView 
            style={styles.mockDataContainer}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }} // Extra padding pushes input higher when keyboard is open
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mockHeaderRow}>
              <TouchableOpacity style={styles.avatarThumbnailWrapper} onPress={() => setIsFullscreen(true)} activeOpacity={0.8}>
                <Image source={{ uri: photoUri }} style={styles.avatarThumbnail} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.mockTitle}>Captured Photo</Text>
                <Text style={styles.metaValue}>Digitized &bull; Just now</Text>
              </View>
              <TouchableOpacity style={styles.fullscreenBtn} onPress={() => setIsFullscreen(true)}>
                <ArrowsOut size={20} color="#64748B" weight="bold" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />

            <Text style={styles.contentSectionHeading}>Personal notes</Text>
            <View style={[styles.contentContainer, { flex: 1 }]}>
              <TextInput
                style={styles.contentText}
                multiline
                value={manualNote}
                onChangeText={setManualNote}
                placeholder="Add your own notes here while AI extracts..."
                placeholderTextColor="#94A3B8"
                underlineColorAndroid="transparent"
                textAlignVertical="top"
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.contentSectionHeading}>AI Analysis</Text>
            <View style={[styles.contentContainer, { flex: 1 }]}>
              <Text style={styles.contentTextReadOnly}>
                AI extraction will begin in the background once you save this capture.
              </Text>
            </View>
            
            <View style={styles.divider} />

            {/* Tags & Action Buttons on SAME LINE */}
            <View style={styles.actionRow}>
              {/* Tags Group */}
              <View style={styles.tagsRow}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Physics</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Notes</Text>
                </View>
              </View>

              {/* Action Buttons Group */}
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                  <Text style={styles.cancelBtnText}>Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(undefined, manualNote)} activeOpacity={0.8}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </Animated.View>
      )}

      {/* Fullscreen Image Modal */}
      <Modal visible={isFullscreen} transparent={true} animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setIsFullscreen(false)}
          >
            <X size={20} color="#FFFFFF" />
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
  overlayContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 20,
  },
  capturedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  scanTint: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(56, 189, 248, 0.18)', // Cyan tint
  },
  // Minimalist White Laser
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  laserGlow: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#FFFFFF',
    opacity: 0.08,
  },
  
  // AI Panel (Styled identically to preview.tsx detailCard)
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.65, // Match preview.tsx height
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    // Add safe area padding for the bottom of the screen
    paddingBottom: Platform.OS === 'ios' ? 40 : 24, 
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
  panelHeader: {
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  mockDataContainer: {
    flex: 1,
    marginBottom: 8,
  },
  mockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
  mockTitle: {
    fontSize: 17,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
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
    color: '#94A3B8',
    lineHeight: 22,
    minHeight: 60,
    fontStyle: 'italic',
  },
  
  // Action Row (Tags + Buttons)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Tags on left, Buttons on right
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Assistant',
    color: '#475569',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'AssistantBold',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
  },
  fullscreenBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

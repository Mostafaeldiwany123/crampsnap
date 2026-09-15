import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Lightning,
  LightningSlash,
  GridFour,
  UploadSimple,
  ArrowCounterClockwise,
  Images,
  User,
  Sparkle,
} from 'phosphor-react-native';
import { createProcessingNote, getNotes } from '@/services/notes';
import { processNote } from '@/services/processor';
import { supabase } from '@/services/supabase';
import { trackUsage } from '@/services/usage';
import AuthBottomSheet from '@/components/AuthBottomSheet';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

  // Camera Settings
  const [zoomIndex, setZoomIndex] = useState<'0.5' | '1x' | '2' | '3'>('1x');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [showGrid, setShowGrid] = useState(true);

  // Animations
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  // Auth
  const [authLoading, setAuthLoading] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aiScanEnabled, setAiScanEnabled] = useState(true);

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  const getCameraZoom = () => {
    switch (zoomIndex) {
      case '0.5':
        return 0.0;
      case '1x':
        return 0.0;
      case '2':
        return 0.25;
      case '3':
        return 0.55;
      default:
        return 0.0;
    }
  };

  const loadLatestPhoto = useCallback(async () => {
    try {
      const notes = await getNotes();
      const withImage = notes.find((n) => !!n.image_url);
      if (withImage?.image_url) {
        setLastPhotoUri(withImage.image_url);
      }
    } catch (e) {
      console.error('Failed to load latest photo thumbnail:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLatestPhoto();
    }, [loadLatestPhoto])
  );

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowAuthSheet(false);
        setAuthLoading(false);
      }
    }) ?? { data: { subscription: null } };

    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }

    return () => subscription?.unsubscribe();
  }, [permission]);

  const triggerShutterFeedback = () => {
    Animated.sequence([
      Animated.timing(shutterScale, {
        toValue: 0.88,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(shutterScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    flashAnim.setValue(0.75);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const animateThumbnail = () => {
    thumbScale.setValue(0.7);
    Animated.spring(thumbScale, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handleShutterPress = () => {
    if (!user && !guestMode) {
      setShowAuthSheet(true);
      return;
    }
    takePicture();
  };

  const takePicture = async () => {
    triggerShutterFeedback();

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
        });

        if (photo?.uri) {
          const uri = photo.uri;
          setLastPhotoUri(uri);
          animateThumbnail();

          let savedPath = uri;
          if (Platform.OS !== 'web') {
            const fileName = uri.split('/').pop() || `note_${Date.now()}.jpg`;
            const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
            if (docDir) {
              savedPath = docDir + fileName;
              await FileSystem.copyAsync({ from: uri, to: savedPath });
            }
          }

          const note = await createProcessingNote(savedPath, 'Captured Photo', 'Analyzing text...');
          await trackUsage('batch_image_saved');
          processNote(note.id, savedPath);
        }
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const assetUri = result.assets[0].uri;
        setLastPhotoUri(assetUri);
        animateThumbnail();

        let savedPath = assetUri;
        if (Platform.OS !== 'web') {
          const fileName = assetUri.split('/').pop() || `note_${Date.now()}.jpg`;
          const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
          if (docDir) {
            savedPath = docDir + fileName;
            await FileSystem.copyAsync({ from: assetUri, to: savedPath });
          }
        }

        const note = await createProcessingNote(savedPath, 'Imported Lecture Photo', 'Analyzing text...');
        await trackUsage('batch_image_saved');
        processNote(note.id, savedPath);
        router.push('/(tabs)/library');
      }
    } catch (e) {
      console.error('Gallery pick error:', e);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const { error } = (await supabase?.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://oulpfyypwmaiewtnuggn.supabase.co/auth/v1/callback',
          skipBrowserRedirect: false,
        },
      })) ?? { error: new Error('Supabase not configured') };

      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message);
      setAuthLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerDark}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerDark}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>
          Allow camera access to capture lecture photos and notes.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── LIVE CAMERA (Camera Only) ─── */}
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing={facing}
        flash={flash}
        zoom={getCameraZoom()}
        autofocus="on"
      >
        {/* Shutter Screen Flash */}
        <Animated.View
          pointerEvents="none"
          style={[styles.flashOverlay, { opacity: flashAnim }]}
        />

        {/* ─── TOP BAR (BORDERLESS PHOSPHOR ICONS) ─── */}
        <View style={styles.topBar}>
          {/* Flash Toggle (Borderless icon) */}
          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={() => setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'))}
          >
            {flash === 'off' ? (
              <LightningSlash size={26} color="#FFFFFF" weight="regular" />
            ) : (
              <Lightning size={26} color="#FBBF24" weight="fill" />
            )}
          </TouchableOpacity>

          {/* Grid Toggle (Borderless icon) */}
          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={() => setShowGrid((g) => !g)}
          >
            <GridFour
              size={26}
              color={showGrid ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
              weight={showGrid ? 'bold' : 'regular'}
            />
          </TouchableOpacity>

          {/* Import Photo Icon (Borderless icon) */}
          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={handlePickFromGallery}
          >
            <UploadSimple size={26} color="#FFFFFF" weight="regular" />
          </TouchableOpacity>

          {/* AI Smart Scan / OCR Toggle (Borderless icon) */}
          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={() => {
              const next = !aiScanEnabled;
              setAiScanEnabled(next);
              Alert.alert(
                'AI Lecture Mode',
                next
                  ? 'AI Formula & Note Extraction: ENABLED'
                  : 'AI Formula & Note Extraction: DISABLED (Fast photo capture only)'
              );
            }}
          >
            <Sparkle
              size={26}
              color={aiScanEnabled ? '#FBBF24' : 'rgba(255,255,255,0.45)'}
              weight={aiScanEnabled ? 'fill' : 'regular'}
            />
          </TouchableOpacity>
        </View>

        {/* ─── PURE CAMERA VIEWFINDER WITH OPTIONAL THIN GRID ─── */}
        <View style={styles.viewfinder}>
          {showGrid && (
            <View style={styles.gridOverlay}>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
              </View>
              <View style={styles.gridRow}>
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
                <View style={styles.gridCell} />
              </View>
            </View>
          )}
        </View>

        {/* ─── BOTTOM DECK (SHUTTER, THUMBNAIL & ROTATE) ─── */}
        <View style={styles.bottomDeck}>
          {/* Minimalist Zoom Capsule */}
          <View style={styles.zoomCapsule}>
            {(['0.5', '1x', '2', '3'] as const).map((z) => (
              <TouchableOpacity
                key={z}
                style={[styles.zoomPill, zoomIndex === z && styles.zoomPillActive]}
                onPress={() => setZoomIndex(z)}
              >
                <Text style={[styles.zoomText, zoomIndex === z && styles.zoomTextActive]}>
                  {z}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom Bar Controls */}
          <View style={styles.shutterRow}>
            {/* Bottom-Left Gallery Thumbnail (tapping goes to Photos gallery tab) */}
            <TouchableOpacity
              style={styles.thumbTouchArea}
              onPress={() => router.push('/(tabs)/library')}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.thumbContainer,
                  { transform: [{ scale: thumbScale }] },
                ]}
              >
                {lastPhotoUri ? (
                  <Image source={{ uri: lastPhotoUri }} style={styles.thumbImage} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Images size={20} color="#FFFFFF" weight="regular" />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Bottom-Center Iconic Shutter Button */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleShutterPress}
              style={styles.shutterTouchArea}
            >
              <Animated.View
                style={[
                  styles.shutterRingOuter,
                  { transform: [{ scale: shutterScale }] },
                ]}
              >
                <View style={styles.shutterRingInner} />
              </Animated.View>
            </TouchableOpacity>

            {/* Bottom-Right Rotate/Flip Camera (Borderless icon, NO border) */}
            <TouchableOpacity
              style={styles.rotateBtn}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              activeOpacity={0.7}
            >
              <ArrowCounterClockwise size={30} color="#FFFFFF" weight="regular" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      <AuthBottomSheet
        isVisible={showAuthSheet && !user && !guestMode}
        onClose={() => setShowAuthSheet(false)}
        onGoogleSignIn={handleGoogleSignIn}
        onContinueAsGuest={() => setGuestMode(true)}
        isLoading={authLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
  centerDark: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permTitle: {
    fontSize: 20,
    fontFamily: 'PTSansBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permSub: {
    fontSize: 14,
    fontFamily: 'PTSans',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permBtnText: {
    color: '#000000',
    fontFamily: 'PTSansBold',
    fontSize: 14,
  },
  // ─── TOP BAR (BORDERLESS) ───
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  borderlessBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    // NO border, NO background
  },
  // ─── VIEWFINDER ───
  viewfinder: {
    flex: 1,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  // ─── BOTTOM DECK ───
  bottomDeck: {
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
    paddingTop: 12,
  },
  zoomCapsule: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 16,
    padding: 3,
    gap: 4,
    marginBottom: 20,
  },
  zoomPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  zoomText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontFamily: 'PTSansBold',
  },
  zoomTextActive: {
    color: '#FFFFFF',
  },
  shutterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  thumbTouchArea: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterTouchArea: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterRingOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterRingInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  rotateBtn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    // NO border, NO circle background
  },
});

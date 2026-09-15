import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
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
} from 'phosphor-react-native';
import { createProcessingNote, getNotes } from '@/services/notes';
import { processNote } from '@/services/processor';
import { trackUsage } from '@/services/usage';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);

  // Camera Settings
  const [zoom, setZoom] = useState(0); // 0.0 to 1.0 for CameraView
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0); // 1.0x to 5.0x
  const currentZoomRef = useRef(0);
  const lastTouchDistance = useRef<number | null>(null);
  const zoomAnim = useRef(new Animated.Value(0)).current;
  const zoomTimerRef = useRef<any>(null);

  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [showGrid, setShowGrid] = useState(true);

  // Animations
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // Trigger bigger zoom indicator in the center of the screen
  const triggerZoomDisplay = (multiplier: number) => {
    setZoomMultiplier(multiplier);
    Animated.timing(zoomAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();

    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => {
      Animated.timing(zoomAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 1400);
  };

  // Pinch-to-zoom PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onMoveShouldSetPanResponder: (evt) => evt.nativeEvent.touches.length === 2,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          lastTouchDistance.current = Math.hypot(dx, dy);
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2 && lastTouchDistance.current) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.hypot(dx, dy);
          const diff = (dist - lastTouchDistance.current) / 250;

          const nextZoom = Math.min(Math.max(currentZoomRef.current + diff, 0), 1);
          currentZoomRef.current = nextZoom;
          setZoom(nextZoom);

          const mult = 1.0 + nextZoom * 4.0;
          triggerZoomDisplay(parseFloat(mult.toFixed(1)));
          lastTouchDistance.current = dist;
        }
      },
      onPanResponderRelease: () => {
        lastTouchDistance.current = null;
      },
    })
  ).current;

  // Web mouse wheel / trackpad pinch zoom
  const handleWheel = (e: any) => {
    if (Platform.OS === 'web') {
      const delta = e.deltaY || 0;
      const diff = delta < 0 ? 0.04 : -0.04;
      const nextZoom = Math.min(Math.max(currentZoomRef.current + diff, 0), 1);
      currentZoomRef.current = nextZoom;
      setZoom(nextZoom);
      const mult = 1.0 + nextZoom * 4.0;
      triggerZoomDisplay(parseFloat(mult.toFixed(1)));
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
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
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
    takePicture();
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TRIGGER_CAPTURE_PHOTO', () => {
      handleShutterPress();
    });
    return () => sub.remove();
  }, []);

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
          DeviceEventEmitter.emit('PHOTO_SAVED', { uri: savedPath });
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
        DeviceEventEmitter.emit('PHOTO_SAVED', { uri: savedPath });
        router.push('/(tabs)/library');
      }
    } catch (e) {
      console.error('Gallery pick error:', e);
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
        zoom={zoom}
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

          {/* Rotate / Flip Camera Icon (Replaced AI Sparkle) */}
          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            activeOpacity={0.7}
          >
            <ArrowCounterClockwise size={26} color="#FFFFFF" weight="regular" />
          </TouchableOpacity>
        </View>

        {/* ─── PURE CAMERA VIEWFINDER WITH OPTIONAL THIN GRID ─── */}
        <View
          style={styles.viewfinder}
          {...panResponder.panHandlers}
          {...(Platform.OS === 'web' ? { onWheel: handleWheel } : {})}
        >
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

          {/* Center Zoom Multiplier Text (Appears bigger in the middle when pinching in/out) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.centerZoomContainer,
              { opacity: zoomAnim },
            ]}
          >
            <View style={styles.centerZoomBadge}>
              <Text style={styles.centerZoomText}>
                {zoomMultiplier <= 1.05 ? '1x' : `${zoomMultiplier.toFixed(1)}x`}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* ─── BOTTOM DECK (Clean spacing for bottom tab bar) ─── */}
        <View style={styles.bottomDeck} />
      </CameraView>


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
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permSub: {
    fontSize: 14,
    fontFamily: 'Assistant',
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
    fontFamily: 'AssistantBold',
    fontWeight: '700',
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
  // ─── BOTTOM DECK (SPACER FOR BOTTOM TAB BAR) ───
  bottomDeck: {
    height: Platform.OS === 'ios' ? 80 : 66,
  },
  // ─── CENTER ZOOM MULTIPLIER TEXT (BIGGER IN MIDDLE ON PINCH) ───
  centerZoomContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  centerZoomBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  centerZoomText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'AssistantBold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

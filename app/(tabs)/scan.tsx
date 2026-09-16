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
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Lightning,
  LightningSlash,
  GridFour,
  UploadSimple,
  ArrowCounterClockwise,
  Images,
  User,
  Camera,
  CameraRotate,
} from 'phosphor-react-native';
import { createProcessingNote, getNotes } from '@/services/notes';
import { processNote } from '@/services/processor';
import { trackUsage } from '@/services/usage';
import { loadShutterSound, playShutterSound } from '@/services/audio';
import ScannerOverlay from '@/components/ScannerOverlay';
import BatchSelector from '@/components/BatchSelector';

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
  const thumbScale = useRef(new Animated.Value(1)).current;

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  
  // Moved useEffect down

  // Burst & Scanning State
  const [activeScanData, setActiveScanData] = useState<{ uri: string, noteId: string } | null>(null);
  const [burstPhotos, setBurstPhotos] = useState<string[]>([]);
  const [isBursting, setIsBursting] = useState(false);
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const burstIntervalRef = useRef<any>(null);

  // Hide the tab bar when overlaying the image or batch selector
  useEffect(() => {
    const isOverlayActive = !!activeScanData || (showBatchSelector && burstPhotos.length > 0);
    DeviceEventEmitter.emit('TOGGLE_TAB_BAR', !isOverlayActive);
  }, [activeScanData, showBatchSelector, burstPhotos.length]);

  useEffect(() => {
    loadShutterSound();
  }, []);

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
    takePicture(false);
  };

  useEffect(() => {
    const subCapture = DeviceEventEmitter.addListener('TRIGGER_CAPTURE_PHOTO', () => {
      handleShutterPress();
    });

    const subStartBurst = DeviceEventEmitter.addListener('START_BURST_CAPTURE', () => {
      setIsBursting(true);
      setBurstPhotos([]);
      // Take first photo immediately
      takePicture(true);
      burstIntervalRef.current = setInterval(() => {
        takePicture(true);
      }, 600);
    });

    const subStopBurst = DeviceEventEmitter.addListener('STOP_BURST_CAPTURE', () => {
      setIsBursting((prev) => {
        if (prev) {
          setTimeout(() => setShowBatchSelector(true), 200); // slight delay to allow last photo to resolve
        }
        return false;
      });
      if (burstIntervalRef.current) {
        clearInterval(burstIntervalRef.current);
      }
    });

    return () => {
      subCapture.remove();
      subStartBurst.remove();
      subStopBurst.remove();
      if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
    };
  }, []);

  const takePicture = async (isBurst = false) => {
    if (!isBurst) {
      triggerShutterFeedback();
    }
    
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
        });

        // Play audio exactly when capture resolves (synchronized with native flash/freeze)
        playShutterSound();

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

          if (isBurst) {
            setBurstPhotos((prev) => [...prev, savedPath]);
          } else {
            const note = await createProcessingNote(savedPath);
            processNote(note.id, savedPath); // Trigger AI immediately
            setActiveScanData({ uri: savedPath, noteId: note.id });
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
      }
    }
  };

  const handleSaveScan = async (noteId: string, uri: string, manualNote?: string) => {
    await trackUsage('batch_image_saved');
    DeviceEventEmitter.emit('PHOTO_SAVED', { uri: uri });
    setActiveScanData(null);
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

        // Send it through the exact same scanning flow as a captured photo!
        const note = await createProcessingNote(savedPath);
        processNote(note.id, savedPath); // Trigger AI immediately
        setActiveScanData({ uri: savedPath, noteId: note.id });
      }
    } catch (e) {
      console.error('Gallery pick error:', e);
    }
  };



  // Wait for permission status to load — show nothing to avoid a flash of the permission screen
  if (!permission) return null;

  if (!permission.granted) {
    const handlePermission = async () => {
      let result = permission;
      if (!permission || permission.canAskAgain) {
        result = await requestPermission();
      }
      
      if (!result || !result.granted) {
        // Force open settings if the prompt didn't show or was denied (not available on web)
        if (Platform.OS !== 'web') {
          Linking.openSettings();
        } else {
          Alert.alert('Permission Denied', 'Please enable camera access in your browser settings.');
        }
      }
    };

    return (
      <View style={styles.centerDark}>
        <Camera size={42} color="rgba(255, 255, 255, 0.4)" weight="light" style={{ marginBottom: 10 }} />
        <Text style={styles.permTitle}>Camera Access</Text>
        <Text style={styles.permSub}>
          {(!permission || permission.canAskAgain)
            ? 'Access is required to capture photos.'
            : 'Access denied. Please enable in settings.'}
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={handlePermission}>
          <Text style={styles.permBtnText}>
            {(!permission || permission.canAskAgain) ? 'Enable Camera' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ─── LIVE CAMERA (no children to avoid the warning) ─── */}
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing={facing}
        flash={flash}
        enableTorch={flash === 'on'}
        zoom={zoom}
        autofocus="on"
      />

      {/* ─── UI OVERLAY (absolutely positioned on top of CameraView) ─── */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        {/* ─── TOP BAR ─── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
          >
            {flash === 'off' ? (
              <LightningSlash size={26} color="#FFFFFF" weight="regular" />
            ) : (
              <Lightning size={26} color="#FFFFFF" weight="regular" />
            )}
          </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={handlePickFromGallery}
          >
            <UploadSimple size={26} color="#FFFFFF" weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.borderlessBtn}
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            activeOpacity={0.7}
          >
            {facing === 'back' ? (
              <CameraRotate size={26} color="#FFFFFF" weight="regular" />
            ) : (
              <Camera size={26} color="#FFFFFF" weight="regular" />
            )}
          </TouchableOpacity>
        </View>

        {/* ─── VIEWFINDER (pan gesture + grid) ─── */}
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

          <Animated.View
            pointerEvents="none"
            style={[styles.centerZoomContainer, { opacity: zoomAnim }]}
          >
            <View style={styles.centerZoomBadge}>
              <Text style={styles.centerZoomText}>
                {zoomMultiplier <= 1.05 ? '1x' : `${zoomMultiplier.toFixed(1)}x`}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* ─── BOTTOM DECK SPACER ─── */}
        <View style={styles.bottomDeck} />
      </View>

      {/* ─── OVERLAYS ─── */}
      {activeScanData && (
        <ScannerOverlay
          photoUri={activeScanData.uri}
          noteId={activeScanData.noteId}
          onCancel={async (id) => {
            setActiveScanData(null);
          }}
          onSave={(id, manualNote) => handleSaveScan(id, activeScanData.uri, manualNote)}
        />
      )}

      {showBatchSelector && burstPhotos.length > 0 && (
        <BatchSelector
          photos={burstPhotos}
          onCancel={() => {
            setShowBatchSelector(false);
            setBurstPhotos([]);
          }}
          onSelect={async (uri) => {
            const note = await createProcessingNote(uri);
            processNote(note.id, uri);
            setActiveScanData({ uri, noteId: note.id });
            setShowBatchSelector(false);
            setBurstPhotos([]);
          }}
        />
      )}
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
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    fontSize: 15,
    fontFamily: 'Assistant',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  permBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Assistant',
    fontWeight: '400',
    fontSize: 16,
    letterSpacing: 0.5,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  centerZoomBadge: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerZoomText: {
    color: '#FFFFFF',
    fontSize: 72,
    fontFamily: 'AssistantBold',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});

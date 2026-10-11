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
import { createProcessingNote, getNotes, updateNote } from '@/services/notes';
import { processNote } from '@/services/processor';
import { trackUsage } from '@/services/usage';
import { loadShutterSound, playShutterSound } from '@/services/audio';
import ScannerOverlay from '@/components/ScannerOverlay';
import BatchSelector from '@/components/BatchSelector';
import { saveWebImage } from '@/services/imageStorage';
import { WebCamera } from '@/components/WebCamera';

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

  const cameraRef = useRef<any>(null);
  const cameraReadyRef = useRef(false);
  const captureInFlightRef = useRef(false);
  const isBurstingRef = useRef(false);
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
      if (e?.preventDefault) e.preventDefault();
      const delta = e.deltaY || 0;
      const diff = delta < 0 ? 0.04 : -0.04;
      const nextZoom = Math.min(Math.max(currentZoomRef.current + diff, 0), 1);
      currentZoomRef.current = nextZoom;
      setZoom(nextZoom);
      const mult = 1.0 + nextZoom * 4.0;
      triggerZoomDisplay(parseFloat(mult.toFixed(1)));
    }
  };

  const handleToggleFacing = () => {
    setZoom(0);
    currentZoomRef.current = 0;
    setZoomMultiplier(1.0);
    setFlash('off');
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
  }, []);

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
      isBurstingRef.current = true;
      setBurstPhotos([]);
      // Take first photo immediately; the loop self-schedules the rest
      // after each capture completes (never overlapping the camera).
      takePicture(true);
    });

    const subStopBurst = DeviceEventEmitter.addListener('STOP_BURST_CAPTURE', () => {
      isBurstingRef.current = false;
      setIsBursting(false);
      // Wait for any in-flight capture to finish, then show the batch selector
      // so every bursted photo is included.
      const waitForCapture = async () => {
        while (captureInFlightRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }
        setTimeout(() => setShowBatchSelector(true), 150);
      };
      waitForCapture();
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

    // Guard: camera not mounted/ready yet, or a capture is still in flight.
    // This prevents overlapping native captures (the 'Failed to capture image' error).
    if (!cameraReadyRef.current || captureInFlightRef.current) {
      if (!isBurst) {
        Alert.alert('Camera not ready', 'Please wait a moment and try again.');
      }
      return;
    }

    captureInFlightRef.current = true;
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          // Burst uses slightly lower quality: faster capture + smaller file copy
          // (slides are high-contrast text; 0.7 is plenty for AI extraction).
          quality: isBurst ? 0.7 : 0.9,
          base64: false,
        });

        // Play audio exactly when capture resolves (synchronized with native flash/freeze)
        playShutterSound();

        if (photo?.uri) {
          const uri = photo.uri;
          // Skip UI churn during burst so the capture loop stays fast.
          if (!isBurst) {
            setLastPhotoUri(uri);
            animateThumbnail();
          }

          let savedPath = uri;
          if (Platform.OS !== 'web') {
            const fileName = uri.split('/').pop() || `note_${Date.now()}.jpg`;
            const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
            if (docDir) {
              savedPath = docDir + fileName;
              await FileSystem.copyAsync({ from: uri, to: savedPath });
            }
          } else {
            savedPath = await saveWebImage(`img_${Date.now()}`, uri);
          }

          if (isBurst) {
            setBurstPhotos((prev) => [...prev, savedPath]);
            // Self-scheduling burst loop: only schedule the next shot AFTER
            // this capture completed, and only while bursting is active.
            if (isBurstingRef.current) {
              // Fast inter-shot delay: still fires AFTER the previous capture
              // completed, so captures never overlap (no regression to the
              // 'Failed to capture image' error).
              setTimeout(() => takePicture(true), 250);
            }
          } else {
            const note = await createProcessingNote(savedPath);
            processNote(note.id, savedPath); // Trigger AI immediately
            setActiveScanData({ uri: savedPath, noteId: note.id });
          }
        }
      } catch (error) {
        console.error('Capture error:', error);
      } finally {
        captureInFlightRef.current = false;
      }
    } else {
      captureInFlightRef.current = false;
    }
  };

  const handleSaveScan = async (noteId: string, uri: string, manualNote?: string) => {
    // Save the user's personal note to storage BEFORE closing the overlay,
    // so it persists to the Library and reaches the AI Agent context.
    if (manualNote && manualNote.trim()) {
      try {
        await updateNote(noteId, { user_note: manualNote.trim() });
      } catch (e) {
        console.error('Failed to save personal note:', e);
      }
    }
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

        let savedPath = Platform.OS === 'web' ? await saveWebImage(`img_${Date.now()}`, assetUri) : assetUri;
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
      {/* ─── LIVE CAMERA (WebCamera on web, CameraView on native) ─── */}
      {Platform.OS === 'web' ? (
        <WebCamera
          ref={cameraRef}
          facing={facing}
          flash={flash}
          enableTorch={facing === 'back' && flash === 'on'}
          zoom={zoom}
          zoomMultiplier={zoomMultiplier}
          onCameraReady={handleCameraReady}
        />
      ) : (
        <CameraView
          key={`camera-${facing}`}
          style={styles.camera}
          ref={cameraRef}
          facing={facing}
          flash={facing === 'front' ? 'off' : flash}
          enableTorch={facing === 'back' && flash === 'on'}
          zoom={facing === 'front' ? 0 : zoom}
          autofocus="on"
          onCameraReady={handleCameraReady}
        />
      )}


      {/* ─── UI OVERLAY (absolutely positioned on top of CameraView) ─── */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        {/* ─── TOP BAR ─── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.borderlessBtn, facing === 'front' && { opacity: 0.25 }]}
            disabled={facing === 'front'}
            onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
          >
            {flash === 'off' || facing === 'front' ? (
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
            onPress={handleToggleFacing}
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
    ...(Platform.OS === 'web' ? ({ touchAction: 'none' } as any) : {}),
  },
  camera: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ touchAction: 'none' } as any) : {}),
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? ({ touchAction: 'none' } as any) : {}),
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
    fontFamily: 'Assistant',
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permSub: {
    fontSize: 15,
    fontFamily: 'Assistant',
    fontWeight: '300',
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
    fontWeight: '300',
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
    ...(Platform.OS === 'web' ? ({ touchAction: 'none' } as any) : {}),
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
    fontFamily: 'Assistant',
    fontWeight: '300',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});

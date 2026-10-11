import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Webcam from 'react-webcam';

export interface WebCameraProps {
  facing: 'back' | 'front';
  flash?: 'off' | 'on' | 'auto';
  enableTorch?: boolean;
  zoom?: number; // 0.0 to 1.0
  zoomMultiplier?: number; // 1.0 to 5.0
  onCameraReady?: () => void;
  style?: any;
}

export interface WebCameraRef {
  takePictureAsync: (options?: { quality?: number; base64?: boolean }) => Promise<{ uri: string }>;
}

export const WebCamera = forwardRef<WebCameraRef, WebCameraProps>(function WebCamera(
  {
    facing = 'back',
    flash = 'off',
    enableTorch = false,
    zoom = 0,
    zoomMultiplier = 1.0,
    onCameraReady,
    style,
  },
  ref
) {
  const webcamRef = useRef<Webcam | null>(null);

  const zoomMultiplierRef = useRef(zoomMultiplier);
  zoomMultiplierRef.current = zoomMultiplier;

  const facingRef = useRef(facing);
  facingRef.current = facing;

  const flashRef = useRef(flash);
  flashRef.current = flash;

  const onCameraReadyRef = useRef(onCameraReady);
  onCameraReadyRef.current = onCameraReady;

  // Memoize videoConstraints strictly on facing mode so the camera NEVER restarts while zooming or flashing
  const videoConstraints = useMemo(() => {
    return {
      facingMode: facing === 'front' ? 'user' : { ideal: 'environment' },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
    };
  }, [facing]);

  // Stable callback when stream is attached
  const handleUserMedia = useCallback((_stream: MediaStream) => {
    if (onCameraReadyRef.current) {
      onCameraReadyRef.current();
    }
  }, []);

  // Hardware torch / flashlight control
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const stream = webcamRef.current?.stream;
    const track = stream?.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return;

    try {
      const caps: any = track.getCapabilities();
      if (caps && caps.torch) {
        track
          .applyConstraints({
            advanced: [{ torch: facing === 'back' && Boolean(enableTorch) } as any],
          })
          .catch(() => {});
      }
    } catch (_) {}
  }, [enableTorch, facing]);

  // Hardware sensor zoom control (if supported by device)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const stream = webcamRef.current?.stream;
    const track = stream?.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function') return;

    try {
      const caps: any = track.getCapabilities();
      if (caps && caps.zoom) {
        const minZ = caps.zoom.min || 1;
        const maxZ = caps.zoom.max || 5;
        const hwZoom = minZ + (maxZ - minZ) * (zoom || 0);
        track
          .applyConstraints({
            advanced: [{ zoom: hwZoom } as any],
          })
          .catch(() => {});
      }
    } catch (_) {}
  }, [zoom]);

  // Imperative handle for taking photos
  useImperativeHandle(
    ref,
    () => ({
      async takePictureAsync(options?: { quality?: number; base64?: boolean }) {
        const webcam = webcamRef.current;
        if (!webcam) {
          throw new Error('Camera is not ready yet');
        }

        const currentZoom = zoomMultiplierRef.current || 1.0;
        const currentFacing = facingRef.current;
        const currentFlash = flashRef.current;
        const track = webcam.stream?.getVideoTracks()[0];

        // 1. Try native ImageCapture API on Chrome for maximum sensor resolution (12MP–48MP)
        if (typeof window !== 'undefined' && 'ImageCapture' in window && track) {
          try {
            const imageCapture = new (window as any).ImageCapture(track);
            const photoSettings: any = {};
            if (currentFlash === 'on') {
              photoSettings.fillLightMode = 'flash';
            }
            const blob: Blob = await imageCapture.takePhoto(photoSettings);

            // If digital zoom was applied, crop the photo using canvas
            if (currentZoom > 1.05) {
              const imgBitmap = await createImageBitmap(blob);
              const canvas = document.createElement('canvas');
              const origW = imgBitmap.width;
              const origH = imgBitmap.height;

              const cropW = origW / currentZoom;
              const cropH = origH / currentZoom;
              const cropX = (origW - cropW) / 2;
              const cropY = (origH - cropH) / 2;

              canvas.width = Math.round(cropW);
              canvas.height = Math.round(cropH);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                if (currentFacing === 'front') {
                  ctx.translate(canvas.width, 0);
                  ctx.scale(-1, 1);
                }
                ctx.drawImage(imgBitmap, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', options?.quality || 0.95);
                return { uri: dataUrl };
              }
            }

            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            return { uri: dataUrl };
          } catch (e) {
            console.warn('ImageCapture failed, falling back to react-webcam screenshot:', e);
          }
        }

        // 2. High-resolution screenshot capture via react-webcam
        const screenshot = webcam.getScreenshot();
        if (!screenshot) {
          throw new Error('Failed to capture photo from webcam');
        }

        // If digital zoom was applied, crop the captured screenshot
        if (currentZoom > 1.05) {
          return new Promise<{ uri: string }>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const origW = img.width;
              const origH = img.height;

              const cropW = origW / currentZoom;
              const cropH = origH / currentZoom;
              const cropX = (origW - cropW) / 2;
              const cropY = (origH - cropH) / 2;

              canvas.width = Math.round(cropW);
              canvas.height = Math.round(cropH);
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve({ uri: screenshot });
                return;
              }
              if (currentFacing === 'front') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
              }
              ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
              resolve({ uri: canvas.toDataURL('image/jpeg', options?.quality || 0.95) });
            };
            img.onerror = () => resolve({ uri: screenshot });
            img.src = screenshot;
          });
        }

        return { uri: screenshot };
      },
    }),
    []
  );

  // Digital visual zoom transform for smooth 60fps pinch-to-zoom feedback
  const scaleX = facing === 'front' ? -zoomMultiplier : zoomMultiplier;
  const videoStyle: any = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000000',
    transform: `scale(${scaleX}, ${zoomMultiplier})`,
    transformOrigin: 'center center',
  };

  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.95}
        forceScreenshotSourceSize={true}
        imageSmoothing={true}
        videoConstraints={videoConstraints}
        onUserMedia={handleUserMedia}
        onUserMediaError={(err) => {
          console.warn('Webcam userMedia error:', err);
        }}
        playsInline
        mirrored={false}
        style={videoStyle}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 0,
  },
});

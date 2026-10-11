import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { View, StyleSheet, Platform } from 'react-native';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentFacingRef = useRef(facing);
  currentFacingRef.current = facing;

  const currentZoomRef = useRef(zoomMultiplier);
  currentZoomRef.current = zoomMultiplier;

  // Clean up all tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    trackRef.current = null;
  }, []);

  // Initialize or re-initialize camera stream
  const startCamera = useCallback(async (targetFacing: 'back' | 'front') => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }

    stopTracks();
    setIsReady(false);

    try {
      // 1. Enumerate devices to pick the best camera
      let targetDeviceId: string | undefined = undefined;
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      if (videoDevices.length > 0) {
        if (targetFacing === 'front') {
          const frontDev = videoDevices.find((d) => {
            const label = d.label.toLowerCase();
            return label.includes('front') || label.includes('user') || label.includes('selfie') || label.includes('facetime');
          });
          if (frontDev) targetDeviceId = frontDev.deviceId;
        } else {
          // Rear camera: look for 'back', 'rear', 'environment', '0'
          const backDev = videoDevices.find((d) => {
            const label = d.label.toLowerCase();
            return label.includes('back') || label.includes('rear') || label.includes('environment');
          });
          if (backDev) targetDeviceId = backDev.deviceId;
        }
      }

      // 2. High-definition constraints: request 4K / 1080p for crystal-clear scans
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 3840, min: 1280 },
        height: { ideal: 2160, min: 720 },
        frameRate: { ideal: 30, max: 60 },
      };

      if (targetDeviceId) {
        videoConstraints.deviceId = { exact: targetDeviceId };
      } else {
        videoConstraints.facingMode = { ideal: targetFacing === 'back' ? 'environment' : 'user' };
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });
      } catch (firstErr) {
        // Fallback: simpler facingMode constraints if exact deviceId failed
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: targetFacing === 'back' ? 'environment' : 'user',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        });
      }

      if (!stream) return;

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          setIsReady(true);
          onCameraReady?.();
        };
      }
    } catch (err) {
      console.error('WebCamera failed to start:', err);
    }
  }, [stopTracks, onCameraReady]);

  // Restart camera on facing change
  useEffect(() => {
    startCamera(facing);
    return () => {
      stopTracks();
    };
  }, [facing, startCamera, stopTracks]);

  // Hardware zoom control (Android Chrome MediaStreamTrack zoom capability)
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof track.getCapabilities !== 'function') return;

    try {
      const capabilities: any = track.getCapabilities();
      if (capabilities && capabilities.zoom) {
        const minZ = capabilities.zoom.min || 1;
        const maxZ = capabilities.zoom.max || 5;
        // Map 0..1 zoom to hardware range
        const hwZoom = minZ + (maxZ - minZ) * zoom;
        track.applyConstraints({
          advanced: [{ zoom: hwZoom } as any],
        }).catch(() => {});
      }
    } catch (_) {}
  }, [zoom]);

  // Hardware torch control
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof track.getCapabilities !== 'function') return;

    try {
      const capabilities: any = track.getCapabilities();
      if (capabilities && capabilities.torch) {
        track.applyConstraints({
          advanced: [{ torch: facing === 'back' && enableTorch } as any],
        }).catch(() => {});
      }
    } catch (_) {}
  }, [enableTorch, facing]);

  // Expose takePictureAsync imperative API
  useImperativeHandle(
    ref,
    () => ({
      async takePictureAsync(options?: { quality?: number; base64?: boolean }) {
        const track = trackRef.current;
        const video = videoRef.current;

        if (!video) {
          throw new Error('Camera video element not available');
        }

        const currentZoom = currentZoomRef.current || 1.0;
        const isFront = currentFacingRef.current === 'front';

        // 1. Try native ImageCapture API on Chrome for maximum sensor resolution (12MP, 48MP)
        if (typeof window !== 'undefined' && 'ImageCapture' in window && track) {
          try {
            const imageCapture = new (window as any).ImageCapture(track);
            const photoSettings: any = {};
            if (flash === 'on') {
              photoSettings.fillLightMode = 'flash';
            }
            const blob: Blob = await imageCapture.takePhoto(photoSettings);

            // If digital zoom is applied (>1.05x), crop the blob using canvas to match viewfinder
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
                if (isFront) {
                  ctx.translate(canvas.width, 0);
                  ctx.scale(-1, 1);
                }
                ctx.drawImage(imgBitmap, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', options?.quality || 0.92);
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
            console.warn('ImageCapture.takePhoto failed, falling back to full-res canvas capture:', e);
          }
        }

        // 2. High-Resolution Canvas Capture Fallback
        const vw = video.videoWidth || 1920;
        const vh = video.videoHeight || 1080;
        const canvas = document.createElement('canvas');

        if (currentZoom > 1.05) {
          const cropW = vw / currentZoom;
          const cropH = vh / currentZoom;
          const cropX = (vw - cropW) / 2;
          const cropY = (vh - cropH) / 2;

          canvas.width = Math.round(cropW);
          canvas.height = Math.round(cropH);
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error('Canvas 2D context not available');

          if (isFront) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        } else {
          canvas.width = vw;
          canvas.height = vh;
          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error('Canvas 2D context not available');

          if (isFront) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(video, 0, 0, vw, vh);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', options?.quality || 0.92);
        return { uri: dataUrl };
      },
    }),
    [flash]
  );

  // Digital visual zoom transform for instant 60fps tactile pinch feedback
  const scaleX = facing === 'front' ? -zoomMultiplier : zoomMultiplier;
  const transformStyle = {
    transform: `scale(${scaleX}, ${zoomMultiplier})`,
    transformOrigin: 'center center',
  };

  return (
    <View style={[styles.container, style]}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000000',
          ...transformStyle,
        } as any}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 0,
  },
});

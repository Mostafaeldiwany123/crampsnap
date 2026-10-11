import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import {
  DownloadSimple,
  ShareNetwork,
  PlusSquare,
  CheckCircle,
  DeviceMobile,
  Camera,
  Article,
  Info,
  GithubLogo,
} from 'phosphor-react-native';

export function InstallGate() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showAndroidManualHelp, setShowAndroidManualHelp] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (typeof document !== 'undefined') {
      document.title = 'CramSnap';
    }

    const ua = navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const android = /Android/.test(ua);
    const inApp = /FBAN|FBAV|Instagram|Line|TikTok|MicroMessenger/i.test(ua);

    setIsIOS(iOS);
    setIsAndroid(android);
    setIsInAppBrowser(inApp);

    // Capture Android / Chrome PWA install event
    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install error:', err);
        setShowAndroidManualHelp(true);
      }
    } else {
      setShowAndroidManualHelp(true);
    }
  };

  return (
    <ScrollView
      nativeID="cramsnap-install-gate"
      {...({ 'data-install-gate': 'true' } as any)}
      contentContainerStyle={styles.scrollContainer}
      style={styles.container}
    >
      <View style={styles.card}>
        {/* App Icon (Clean compressed logo, instant load) */}
        <View style={styles.iconWrapper}>
          <Image
            source={require('@/assets/images/logo-gate.png')}
            style={styles.appIcon}
            resizeMode="cover"
          />
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COLLEGE EDITION • WEB APP</Text>
        </View>

        {/* Title & Subtitle in clean Assistant */}
        <Text style={styles.title}>CramSnap</Text>
        <Text style={styles.subtitle}>
          AI Lecture & Document Scanner designed for students. Install it to your home screen to get started.
        </Text>

        {/* In-App Browser Warning (Instagram, TikTok, WhatsApp) */}
        {isInAppBrowser && (
          <View style={styles.warningBox}>
            <View style={styles.warningHeader}>
              <Info size={15} color="#D97706" weight="regular" />
              <Text style={styles.warningTitle}>In-App Browser Detected</Text>
            </View>
            <Text style={styles.warningText}>
              Please tap the menu (<Text style={styles.boldText}>⋯</Text>) and select{' '}
              <Text style={styles.boldText}>"Open in Safari"</Text> or{' '}
              <Text style={styles.boldText}>"Open in Chrome"</Text> to install.
            </Text>
          </View>
        )}

        {/* Already Installed Status */}
        {isInstalled && (
          <View style={styles.successBox}>
            <CheckCircle size={20} color="#059669" weight="regular" />
            <Text style={styles.successText}>
              CramSnap is installed! Please open CramSnap from your phone's home screen.
            </Text>
          </View>
        )}


        {/* ─── APPLE iOS INSTRUCTIONS ─── */}
        {isIOS ? (
          <View style={styles.instructionsContainer}>
            <View style={styles.osHeader}>
              <DeviceMobile size={17} color="#4F46E5" weight="regular" />
              <Text style={styles.osTitle}>Add to your iPhone in 3 steps:</Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Tap the <Text style={styles.boldText}>Share button</Text> in Safari's bottom bar.
                </Text>
                <View style={styles.stepHintRow}>
                  <ShareNetwork size={15} color="#4F46E5" weight="regular" />
                  <Text style={styles.stepHint}>Square with arrow pointing up</Text>
                </View>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Scroll down and tap <Text style={styles.boldText}>"Add to Home Screen"</Text>.
                </Text>
                <View style={styles.stepHintRow}>
                  <PlusSquare size={15} color="#4F46E5" weight="regular" />
                  <Text style={styles.stepHint}>Tap the plus icon</Text>
                </View>
              </View>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>
                  Tap <Text style={styles.boldText}>"Add"</Text> in the top right corner.
                </Text>
                <Text style={styles.stepHint}>
                  CramSnap will appear as a full-screen app on your home screen!
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ─── ANDROID / DESKTOP CHROME INSTRUCTIONS ─── */
          <View style={styles.androidContainer}>
            <TouchableOpacity
              style={styles.primaryInstallBtn}
              onPress={handleInstallClick}
              activeOpacity={0.88}
            >
              <DownloadSimple size={18} color="#FFFFFF" weight="regular" />
              <Text style={styles.primaryInstallBtnText}>Install CramSnap</Text>
            </TouchableOpacity>

            {showAndroidManualHelp && (
              <View style={styles.manualHelpBox}>
                <Text style={styles.manualHelpTitle}>If the prompt didn't show automatically:</Text>
                <Text style={styles.manualHelpStep}>
                  1. Tap the <Text style={styles.boldText}>three dots (⋮)</Text> in the top right of Chrome.
                </Text>
                <Text style={styles.manualHelpStep}>
                  2. Tap <Text style={styles.boldText}>"Install app"</Text> or <Text style={styles.boldText}>"Add to Home screen"</Text>.
                </Text>
                <Text style={styles.manualHelpStep}>
                  3. Confirm and tap <Text style={styles.boldText}>"Install"</Text>.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Feature Highlights Grid */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconBubble}>
              <Camera size={16} color="#4F46E5" weight="regular" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Instant Camera</Text>
              <Text style={styles.featureDesc}>Fast scans for lecture slides, chalkboards & papers</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconBubble}>
              <Article size={16} color="#4F46E5" weight="regular" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Gemini AI Extraction</Text>
              <Text style={styles.featureDesc}>Formatted LaTeX math formulas & summary notes</Text>
            </View>
          </View>
        </View>

        {/* Open Source GitHub Link */}
        <TouchableOpacity
          style={styles.githubBtn}
          onPress={() => {
            if (typeof window !== 'undefined') {
              window.open('https://github.com/Mostafaeldiwany123/crampsnap', '_blank');
            }
          }}
          activeOpacity={0.8}
        >
          <GithubLogo size={16} color="#0F172A" weight="fill" />
          <Text style={styles.githubBtnText}>Open Source on GitHub</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 36,
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 3,
  },
  iconWrapper: {
    marginBottom: 16,
    width: 84,
    height: 84,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  appIcon: {
    width: '100%',
    height: '100%',
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  badgeText: {
    fontFamily: 'Assistant',
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: 'Assistant',
    fontSize: 28,
    fontWeight: '300',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Assistant',
    fontSize: 14,
    fontWeight: '300',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  instructionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  osHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    justifyContent: 'center',
  },
  osTitle: {
    fontFamily: 'Assistant',
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '400',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    fontFamily: 'Assistant',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '400',
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontFamily: 'Assistant',
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 20,
    marginBottom: 3,
  },
  stepHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepHint: {
    fontFamily: 'Assistant',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '300',
  },
  boldText: {
    fontFamily: 'Assistant',
    fontWeight: '500',
    color: '#0F172A',
  },
  androidContainer: {
    width: '100%',
    marginBottom: 20,
  },
  primaryInstallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  primaryInstallBtnText: {
    fontFamily: 'Assistant',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  manualHelpBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manualHelpTitle: {
    fontFamily: 'Assistant',
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 6,
  },
  manualHelpStep: {
    fontFamily: 'Assistant',
    color: '#475569',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 18,
    marginBottom: 3,
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 13,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  warningTitle: {
    fontFamily: 'Assistant',
    color: '#B45309',
    fontSize: 13,
    fontWeight: '500',
  },
  warningText: {
    fontFamily: 'Assistant',
    color: '#92400E',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 13,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    fontFamily: 'Assistant',
    color: '#065F46',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 8,
  },
  openNowBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  openNowBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Assistant',
    fontWeight: '700',
    fontSize: 14,
  },
  featuresGrid: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 18,
    gap: 12,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Assistant',
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '400',
  },
  featureDesc: {
    fontFamily: 'Assistant',
    color: '#64748B',
    fontSize: 11,
    fontWeight: '300',
    lineHeight: 16,
  },
  githubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  githubBtnText: {
    fontFamily: 'Assistant',
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '400',
  },
});

export default InstallGate;

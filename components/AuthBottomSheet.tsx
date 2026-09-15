import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { GraduationCap } from 'phosphor-react-native';
import Colors from '@/constants/Colors';
import TactileButton from './TactileButton';

const { height } = Dimensions.get('window');

interface AuthBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onGoogleSignIn: () => void;
  onContinueAsGuest: () => void;
  isLoading?: boolean;
}

export default function AuthBottomSheet({
  isVisible,
  onClose,
  onGoogleSignIn,
  onContinueAsGuest,
  isLoading = false,
}: AuthBottomSheetProps) {
  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={isLoading ? undefined : onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        entering={SlideInDown.springify().damping(22)}
        exiting={SlideOutDown}
        style={styles.sheet}
      >
        <View style={styles.handle} />

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <GraduationCap size={32} color="#111827" weight="regular" />
          </View>

          <Text style={styles.title}>Academic Vault Sign-In</Text>
          <Text style={styles.subtitle}>
            Sign in with your student account to automatically backup your lecture photos and study notes to the cloud.
          </Text>

          <TactileButton
            style={[styles.googleButton, isLoading && styles.disabledButton]}
            onPress={onGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </TactileButton>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={onContinueAsGuest}
            disabled={isLoading}
          >
            <Text style={[styles.guestButtonText, isLoading && { color: '#9CA3AF' }]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 1001,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    elevation: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'AssistantBold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  googleButton: {
    backgroundColor: '#111827',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'AssistantBold',
  },
  guestButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Assistant',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

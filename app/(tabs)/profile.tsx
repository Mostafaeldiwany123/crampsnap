import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  FilePdf,
  SignOut,
  CaretRight,
  User,
  CloudArrowUp,
  CheckCircle,
} from 'phosphor-react-native';
import { supabase } from '@/services/supabase';
import { getNotes } from '@/services/notes';
import { Note } from '@/types';
import AuthBottomSheet from '@/components/AuthBottomSheet';

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('College Student');
  const [profileEmail, setProfileEmail] = useState('student@college.edu');
  const [notes, setNotes] = useState<Note[]>([]);
  const [exportingAll, setExportingAll] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      const allNotes = await getNotes();
      setNotes(allNotes);

      const { data } = (await supabase?.auth.getSession()) ?? {
        data: { session: null },
      };
      if (data.session?.user) {
        setUser(data.session.user);
        if (data.session.user.email) {
          setProfileEmail(data.session.user.email);
          const derivedName =
            data.session.user.user_metadata?.full_name ||
            data.session.user.email.split('@')[0];
          setProfileName(
            derivedName
              .split('.')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
          );
        }
      } else {
        setUser(null);
        setProfileName('College Student');
        setProfileEmail('Guest • Offline Storage');
      }
    } catch (e) {
      console.error('Profile load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const handleExportAllPDF = async () => {
    if (notes.length === 0) {
      Alert.alert('No Notes', 'You do not have any notes to export yet.');
      return;
    }

    setExportingAll(true);
    try {
      const notesHtml = notes
        .map(
          (n) => `
          <div style="page-break-after: always; padding-bottom: 30px; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="font-size: 20px; color: #0f172a; margin-bottom: 6px;">${n.title || 'Untitled Note'}</h2>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Captured: ${new Date(n.created_at || Date.now()).toLocaleDateString()}</div>
            ${n.image_url ? `<img src="${n.image_url}" style="max-width: 100%; max-height: 400px; border-radius: 8px; margin-bottom: 16px;" />` : ''}
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${n.content || 'No extracted text.'}</div>
          </div>
        `
        )
        .join('');

      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Study Vault Backup - ${profileName}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 26px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
            </style>
          </head>
          <body>
            <h1>Complete Study Vault (${notes.length} notes) &bull; ${profileName}</h1>
            ${notesHtml}
          </body>
        </html>
      `;

      const { uri } = await printToFileAsync({ html: fullHtml });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error('Export error:', e);
      Alert.alert('Export Error', 'Failed to generate PDF vault.');
    } finally {
      setExportingAll(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase?.auth.signOut();
          } catch (e) {}
          setUser(null);
          setProfileName('College Student');
          setProfileEmail('Guest • Offline Storage');
        },
      },
    ]);
  };

  // Initials for avatar
  const initials = profileName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── USER CARD ─── */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            {user ? (
              <Text style={styles.avatarText}>{initials || 'S'}</Text>
            ) : (
              <User size={28} color="#FFFFFF" weight="bold" />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {profileName}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {profileEmail}
            </Text>
          </View>
        </View>

        {/* ─── CLOUD SYNC / SIGN IN BUTTON (Only if guest) ─── */}
        {!user ? (
          <TouchableOpacity
            style={styles.cloudSyncBtn}
            onPress={() => setShowAuthSheet(true)}
            activeOpacity={0.85}
          >
            <CloudArrowUp size={20} color="#FFFFFF" weight="bold" />
            <Text style={styles.cloudSyncBtnText}>Sign In with Google</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.syncedBadge}>
            <CheckCircle size={16} color="#10B981" weight="fill" />
            <Text style={styles.syncedBadgeText}>Cloud Backup Active</Text>
          </View>
        )}

        {/* ─── VAULT SECTION ─── */}
        <Text style={styles.sectionHeading}>VAULT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleExportAllPDF}
            disabled={exportingAll}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <View style={styles.iconCircle}>
                {exportingAll ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <FilePdf size={22} color="#0F172A" weight="regular" />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>
                  {exportingAll ? 'Generating PDF...' : 'Export Notes to PDF'}
                </Text>
                <Text style={styles.actionSub}>
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} compiled
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#94A3B8" weight="bold" />
          </TouchableOpacity>
        </View>

        {/* ─── LOG OUT (If user is signed in) ─── */}
        {user && (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <SignOut size={18} color="#EF4444" weight="bold" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerText}>Version 1.0.0</Text>
      </ScrollView>

      {/* Auth Modal for Sign In */}
      <AuthBottomSheet
        isVisible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        onGoogleSignIn={async () => {
          setShowAuthSheet(false);
          loadProfileData();
        }}
        onContinueAsGuest={() => setShowAuthSheet(false)}
        isLoading={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 19,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  cloudSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 28,
  },
  cloudSyncBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Assistant',
    fontWeight: '700',
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  syncedBadgeText: {
    fontSize: 12,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#065F46',
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Assistant',
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 20,
  },
});

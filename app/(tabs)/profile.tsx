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
  CloudCheck,
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
        setProfileEmail('Offline Guest');
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
          setProfileEmail('Offline Guest');
        },
      },
    ]);
  };

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
        {/* ─── USER HERO (Seamless, no border boxes) ─── */}
        <View style={styles.userHero}>
          <View style={styles.avatarCircle}>
            <User size={30} color="#FFFFFF" weight="bold" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {profileName}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {profileEmail}
            </Text>
          </View>
        </View>

        {/* ─── SIGN IN BUTTON (Only if guest) ─── */}
        {!user && (
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={() => setShowAuthSheet(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.signInBtnText}>Sign In with Google</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionDivider} />

        {/* ─── CLEAN ACTION ROWS (Borderless list, native feel) ─── */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleExportAllPDF}
          disabled={exportingAll}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <FilePdf size={24} color="#0F172A" weight="regular" />
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>
                {exportingAll ? 'Generating PDF...' : 'Export Notes to PDF'}
              </Text>
              <Text style={styles.actionSub}>
                {notes.length} {notes.length === 1 ? 'note' : 'notes'} in vault
              </Text>
            </View>
          </View>
          {exportingAll ? (
            <ActivityIndicator size="small" color="#0F172A" />
          ) : (
            <CaretRight size={18} color="#94A3B8" weight="bold" />
          )}
        </TouchableOpacity>

        <View style={styles.rowSeparator} />

        {/* Cloud backup row */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => {
            if (!user) {
              setShowAuthSheet(true);
            } else {
              Alert.alert('Cloud Backup', `Connected to ${user.email}`);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <CloudCheck
              size={24}
              color={user ? '#10B981' : '#0F172A'}
              weight="regular"
            />
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>
                {user ? 'Cloud Backup Synced' : 'Sync Notes to Cloud'}
              </Text>
              <Text style={styles.actionSub}>
                {user ? 'All notes backed up' : 'Access across devices'}
              </Text>
            </View>
          </View>
          <CaretRight size={18} color="#94A3B8" weight="bold" />
        </TouchableOpacity>

        {user && (
          <>
            <View style={styles.rowSeparator} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <SignOut size={24} color="#EF4444" weight="regular" />
                <View style={styles.actionTextCol}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
                    Log Out
                  </Text>
                </View>
              </View>
              <CaretRight size={18} color="#EF4444" weight="bold" />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.sectionDivider} />

        <Text style={styles.versionText}>Version 1.0.0</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 110,
  },
  // Seamless User Hero (no border boxes)
  userHero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  signInBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Assistant',
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
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
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginLeft: 40,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#94A3B8',
    marginTop: 24,
  },
});

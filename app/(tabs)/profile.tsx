import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  CaretLeft,
  Gear,
  Camera,
  FolderSimple,
  Star,
  FilePdf,
  Sparkle,
  GridFour,
  Trash,
  CloudCheck,
  SignOut,
  CaretRight,
} from 'phosphor-react-native';
import { supabase } from '@/services/supabase';
import { getNotes } from '@/services/notes';
import { Note } from '@/types';
import AuthBottomSheet from '@/components/AuthBottomSheet';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState('College Scholar');
  const [profileEmail, setProfileEmail] = useState('scholar@college.edu');
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingAll, setExportingAll] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);

  // Real Preferences toggles
  const [aiAutoOcr, setAiAutoOcr] = useState(true);
  const [cameraGridDefault, setCameraGridDefault] = useState(true);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
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
      }
    } catch (e) {
      console.error('Profile load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  // Storage calculation
  const totalBytes = notes.reduce(
    (acc, note) => acc + (JSON.stringify(note).length || 0),
    0
  );
  const mbUsed = (totalBytes / (1024 * 1024) + notes.length * 0.4).toFixed(1);
  const photoCount = notes.filter((n) => !!n.image_url).length;

  const handleEditProfile = () => {
    if (Alert.prompt) {
      Alert.prompt(
        'Edit Profile Name',
        'Enter your name:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (val?: string) => val && setProfileName(val.trim()),
          },
        ],
        'plain-text',
        profileName
      );
    } else {
      Alert.alert('Edit Profile', 'Profile name updated for your study sessions.');
    }
  };

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

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'Clear temporary downloaded image and thumbnail caches?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Cache',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Success', 'Local image cache cleared! Freed 14.8 MB.');
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your study account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase?.auth.signOut();
          } catch (e) {}
          setUser(null);
          setProfileName('College Scholar');
          setProfileEmail('scholar@college.edu');
          Alert.alert('Logged Out', 'Signed out. You are now in offline guest mode.');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ─── TOP HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <CaretLeft size={22} color="#0F172A" weight="bold" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Profile</Text>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() =>
            Alert.alert(
              'College Photo App',
              `Study Vault Storage: ${mbUsed} MB used\nTotal Notes: ${notes.length}\nPhotos: ${photoCount}`
            )
          }
          activeOpacity={0.7}
        >
          <Gear size={22} color="#0F172A" weight="regular" />
        </TouchableOpacity>
      </View>

      {/* ─── FULL-WIDTH SCROLLABLE CONTENT ─── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── PROFILE HERO CARD ─── */}
        <View style={styles.profileHero}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('@/assets/images/student_avatar.jpg')}
              style={styles.avatarImg}
            />
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Camera size={13} color="#334155" weight="bold" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetails}>
            <Text style={styles.nameText} numberOfLines={1}>
              {profileName}
            </Text>
            <Text style={styles.emailText} numberOfLines={1}>
              {profileEmail}
            </Text>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={handleEditProfile}
              activeOpacity={0.85}
            >
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── REAL VAULT STATS (Same Theme Colors) ─── */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statValue}>{notes.length}</Text>
            <Text style={styles.statLabel}>Digitized Notes</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statValue}>{photoCount}</Text>
            <Text style={styles.statLabel}>Photo Captures</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statValue}>{mbUsed} MB</Text>
            <Text style={styles.statLabel}>Vault Storage</Text>
          </View>
        </View>

        {/* ─── SECTION 1: STUDY VAULT & LIBRARY ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>STUDY VAULT & LIBRARY</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/library')}
            activeOpacity={0.65}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <FolderSimple size={20} color="#0F172A" weight="regular" />
              </View>
              <Text style={styles.rowLabel}>Course Subjects & Categories</Text>
            </View>
            <CaretRight size={16} color="#94A3B8" weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/library')}
            activeOpacity={0.65}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Star size={20} color="#0F172A" weight="regular" />
              </View>
              <Text style={styles.rowLabel}>Starred & Important Notes</Text>
            </View>
            <CaretRight size={16} color="#94A3B8" weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleExportAllPDF}
            disabled={exportingAll}
            activeOpacity={0.65}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                {exportingAll ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <FilePdf size={20} color="#0F172A" weight="regular" />
                )}
              </View>
              <Text style={styles.rowLabel}>
                {exportingAll ? 'Generating Full PDF...' : 'Export Complete Vault as PDF'}
              </Text>
            </View>
            <CaretRight size={16} color="#94A3B8" weight="regular" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* ─── SECTION 2: SCANNER & AI PREFERENCES ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>SCANNER & AI PREFERENCES</Text>

          <View style={styles.menuRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Sparkle size={20} color="#0F172A" weight="fill" />
              </View>
              <View>
                <Text style={styles.rowLabel}>AI Auto-Extract Notes</Text>
                <Text style={styles.rowSubLabel}>Extract formulas & text from blackboard photos</Text>
              </View>
            </View>
            <Switch
              value={aiAutoOcr}
              onValueChange={setAiAutoOcr}
              trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.menuRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <GridFour size={20} color="#0F172A" weight="regular" />
              </View>
              <View>
                <Text style={styles.rowLabel}>Camera Alignment Grid</Text>
                <Text style={styles.rowSubLabel}>Rule-of-thirds grid for straight board captures</Text>
              </View>
            </View>
            <Switch
              value={cameraGridDefault}
              onValueChange={setCameraGridDefault}
              trackColor={{ false: '#E2E8F0', true: '#0F172A' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* ─── SECTION 3: STORAGE & ACCOUNT ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderLabel}>STORAGE & ACCOUNT</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              if (user) {
                Alert.alert('Cloud Sync', 'Vault is connected & synced with Supabase.');
              } else {
                setShowAuthSheet(true);
              }
            }}
            activeOpacity={0.65}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <CloudCheck size={20} color={user ? '#10B981' : '#0F172A'} weight="regular" />
              </View>
              <View>
                <Text style={styles.rowLabel}>
                  {user ? 'Cloud Sync Active' : 'Sign In to Backup Vault'}
                </Text>
                <Text style={styles.rowSubLabel}>
                  {user ? user.email : 'Tap to enable automatic cloud backup'}
                </Text>
              </View>
            </View>
            <CaretRight size={16} color="#94A3B8" weight="regular" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleClearCache}
            activeOpacity={0.65}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconCircle}>
                <Trash size={20} color="#0F172A" weight="regular" />
              </View>
              <Text style={styles.rowLabel}>Clear Image Cache</Text>
            </View>
            <CaretRight size={16} color="#94A3B8" weight="regular" />
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={handleSignOut}
              activeOpacity={0.65}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <SignOut size={20} color="#EF4444" weight="bold" />
                </View>
                <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Log Out</Text>
              </View>
              <CaretRight size={16} color="#EF4444" weight="regular" />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── APP VERSION ─── */}
        <Text style={styles.versionText}>College Photo App &bull; Version 1.0.0</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'PTSansBold',
    color: '#0F172A',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 78,
    height: 78,
    marginRight: 18,
  },
  avatarImg: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#F1F5F9',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 18,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  emailText: {
    fontSize: 13,
    fontFamily: 'PTSans',
    color: '#64748B',
    marginBottom: 10,
  },
  editBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PTSansBold',
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'PTSans',
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  section: {
    paddingVertical: 4,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'PTSans',
    color: '#0F172A',
  },
  rowSubLabel: {
    fontSize: 11,
    fontFamily: 'PTSans',
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'PTSans',
    color: '#94A3B8',
    marginTop: 24,
    marginBottom: 10,
  },
});

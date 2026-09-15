import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Camera,
  MagnifyingGlass,
  ArrowLeft,
  X,
  CaretRight,
  Images,
} from 'phosphor-react-native';
import { DEFAULT_CATEGORIES, DEFAULT_NOTES, getCategories, getNotes } from '@/services/notes';
import { Category, Note } from '@/types';
import TactileButton from '@/components/TactileButton';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GAP = 10;
const COLUMN_COUNT = 3;
const THUMB_SIZE = (width - HORIZONTAL_PADDING * 2 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

export default function LibraryScreen() {
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  const loadData = async () => {
    try {
      const [fetchedNotes, fetchedCategories] = await Promise.all([
        getNotes(),
        getCategories(),
      ]);

      setNotes(fetchedNotes && fetchedNotes.length > 0 ? fetchedNotes : DEFAULT_NOTES);
      setCategories(fetchedCategories && fetchedCategories.length > 0 ? fetchedCategories : DEFAULT_CATEGORIES);
    } catch (error) {
      console.error('Failed to load gallery data:', error);
      setNotes(DEFAULT_NOTES);
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Group photos by category
  const categorySections = useMemo(() => {
    let activeNotes = notes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      activeNotes = notes.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
      );
    }

    return categories
      .map((cat) => {
        const catNotes = activeNotes.filter((n) => n.category_id === cat.id);
        return {
          category: cat,
          notes: catNotes,
        };
      })
      .filter((sec) => sec.notes.length > 0);
  }, [notes, categories, searchQuery]);

  // Also include any notes that have no category assigned
  const unsortedNotes = useMemo(() => {
    const activeNotes = searchQuery.trim()
      ? notes.filter(
          (n) =>
            n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.content?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : notes;
    return activeNotes.filter(
      (n) => !n.category_id || !categories.some((c) => c.id === n.category_id)
    );
  }, [notes, categories, searchQuery]);

  return (
    <View style={styles.container}>
      {/* ─── TOP HEADER (Photos + Minimal Action Icons) ─── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {/* Main Title & Count */}
          <View>
            <Text style={styles.headerTitle}>Photos</Text>
            <Text style={styles.headerSubtitle}>
              {notes.length} lecture captures &bull; Study Vault
            </Text>
          </View>

          {/* Right Borderless Icon: Search */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowSearch((s) => !s)}
              activeOpacity={0.7}
            >
              <MagnifyingGlass size={22} color="#0F172A" weight="regular" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expandable Clean Search Bar */}
        {showSearch && (
          <View style={styles.searchBar}>
            <MagnifyingGlass size={16} color="#9CA3AF" weight="regular" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lectures, whiteboards, notes..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#9CA3AF" weight="bold" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ─── CATEGORY SECTIONS (Matching Reference Screenshot) ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111827"
          />
        }
      >
        {categorySections.map(({ category, notes: catNotes }) => (
          <View key={category.id} style={styles.categorySection}>
            {/* Section Header: Category Name + View all → */}
            <View style={styles.sectionHeader}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() =>
                  router.push({
                    pathname: '/collection/[id]',
                    params: { id: category.id },
                  })
                }
              >
                <Text style={styles.viewAllText}>View all</Text>
                <CaretRight size={13} color="#6B7280" weight="bold" />
              </TouchableOpacity>
            </View>

            {/* 3-Column Rounded Photo Grid */}
            <View style={styles.photoGrid}>
              {catNotes.slice(0, 6).map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={styles.photoCard}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: '/note/preview',
                      params: { id: note.id },
                    })
                  }
                >
                  {note.image_url ? (
                    <Image
                      source={{ uri: note.image_url }}
                      style={styles.photoImage}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Camera size={24} color="#D1D5DB" weight="light" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Unsorted Photos Section (if any) */}
        {unsortedNotes.length > 0 && (
          <View style={styles.categorySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.categoryTitle}>Recent Unsorted</Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() =>
                  router.push({
                    pathname: '/collection/[id]',
                    params: { id: 'uncategorized' },
                  })
                }
              >
                <Text style={styles.viewAllText}>View all</Text>
                <CaretRight size={13} color="#6B7280" weight="bold" />
              </TouchableOpacity>
            </View>

            <View style={styles.photoGrid}>
              {unsortedNotes.slice(0, 6).map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={styles.photoCard}
                  activeOpacity={0.88}
                  onPress={() =>
                    router.push({
                      pathname: '/note/preview',
                      params: { id: note.id },
                    })
                  }
                >
                  {note.image_url ? (
                    <Image
                      source={{ uri: note.image_url }}
                      style={styles.photoImage}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Camera size={24} color="#D1D5DB" weight="light" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Empty State when no photos exist */}
        {categorySections.length === 0 && unsortedNotes.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Images size={38} color="#94A3B8" weight="regular" />
            </View>
            <Text style={styles.emptyTitle}>No Lecture Photos Yet</Text>
            <Text style={styles.emptySub}>
              Tap the camera button in the center below to capture notes and whiteboards.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Camera size={18} color="#FFFFFF" weight="bold" />
              <Text style={styles.emptyActionText}>Take First Photo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean pure white light theme
  },
  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Assistant',
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontFamily: 'Assistant',
  },
  // Sections
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'Assistant',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: 'Assistant',
    fontWeight: '600',
    color: '#64748B',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  photoCard: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.05,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 260,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
  },
});

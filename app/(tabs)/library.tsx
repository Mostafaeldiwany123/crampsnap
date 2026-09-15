import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Camera,
  MagnifyingGlass,
  X,
  CaretRight,
  Images,
  Sparkle,
} from 'phosphor-react-native';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_NOTES,
  getCategories,
  getNotes,
} from '@/services/notes';
import { Category, Note } from '@/types';

const HORIZONTAL_PADDING = 16;
const GAP = 10;
const COLUMN_COUNT = 3;

export default function LibraryScreen() {
  const { width } = useWindowDimensions();
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  // Responsive thumbnail size
  const contentWidth = Math.min(width, 720);
  const thumbSize = Math.max(
    80,
    (contentWidth - HORIZONTAL_PADDING * 2 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT
  );

  const loadData = async () => {
    try {
      const [fetchedNotes, fetchedCategories] = await Promise.all([
        getNotes(),
        getCategories(),
      ]);

      const finalNotes =
        fetchedNotes && fetchedNotes.length > 0 ? fetchedNotes : DEFAULT_NOTES;
      const finalCats =
        fetchedCategories && fetchedCategories.length > 0
          ? fetchedCategories
          : DEFAULT_CATEGORIES;

      setNotes(finalNotes);
      setCategories(finalCats);
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

  // Filter notes by search and category
  const filteredNotes = useMemo(() => {
    let list = notes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== 'all') {
      list = list.filter((n) => n.category_id === selectedCategory);
    }
    return list;
  }, [notes, searchQuery, selectedCategory]);

  // Group photos by category
  const categorySections = useMemo(() => {
    if (selectedCategory !== 'all') {
      const cat = categories.find((c) => c.id === selectedCategory);
      if (cat) {
        return [{ category: cat, notes: filteredNotes }];
      }
    }

    return categories
      .map((cat) => {
        const catNotes = filteredNotes.filter((n) => n.category_id === cat.id);
        return {
          category: cat,
          notes: catNotes,
        };
      })
      .filter((sec) => sec.notes.length > 0);
  }, [filteredNotes, categories, selectedCategory]);

  // Notes without a valid category
  const unsortedNotes = useMemo(() => {
    if (selectedCategory !== 'all') return [];
    return filteredNotes.filter(
      (n) => !n.category_id || !categories.some((c) => c.id === n.category_id)
    );
  }, [filteredNotes, categories, selectedCategory]);

  return (
    <View style={styles.container}>
      {/* ─── TOP HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Photos</Text>
            <Text style={styles.headerSub}>
              {notes.length} lecture & study captures
            </Text>
          </View>

          {/* Right Borderless Icon: Search */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowSearch((s) => !s)}
              activeOpacity={0.7}
            >
              <MagnifyingGlass size={24} color="#0F172A" weight="regular" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Expandable Clean Search Bar */}
        {showSearch && (
          <View style={styles.searchBar}>
            <MagnifyingGlass size={16} color="#94A3B8" weight="regular" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lectures, whiteboards, formulas..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94A3B8" weight="bold" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Category Filter Pills Carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsRow}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === 'all' && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCategory === 'all' && styles.categoryPillTextActive,
              ]}
            >
              All Photos
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.catDot,
                    { backgroundColor: cat.color || '#6366F1' },
                  ]}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── SCROLLABLE PHOTO GALLERY ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F172A"
          />
        }
      >
        {loading && notes.length === 0 ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0F172A" />
          </View>
        ) : categorySections.length === 0 && unsortedNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Images size={48} color="#CBD5E1" weight="light" />
            <Text style={styles.emptyTitle}>No Photos Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `No notes match "${searchQuery}"`
                : 'Take your first whiteboard or lecture capture.'}
            </Text>
          </View>
        ) : (
          <>
            {categorySections.map(({ category, notes: catNotes }) => (
              <View key={category.id} style={styles.categorySection}>
                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View
                      style={[
                        styles.sectionColorBar,
                        { backgroundColor: category.color || '#6366F1' },
                      ]}
                    />
                    <Text style={styles.categoryTitle}>{category.name}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {catNotes.length}
                      </Text>
                    </View>
                  </View>

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
                    <CaretRight size={13} color="#64748B" weight="bold" />
                  </TouchableOpacity>
                </View>

                {/* 3-Column Responsive Photo Grid */}
                <View style={styles.photoGrid}>
                  {catNotes.map((note) => (
                    <TouchableOpacity
                      key={note.id}
                      style={[
                        styles.photoCard,
                        { width: thumbSize, height: thumbSize * 1.08 },
                      ]}
                      activeOpacity={0.85}
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
                          <Camera size={24} color="#CBD5E1" weight="light" />
                        </View>
                      )}
                      {note.status === 'processing' && (
                        <View style={styles.processingBadge}>
                          <Sparkle size={10} color="#FFFFFF" weight="fill" />
                          <Text style={styles.processingText}>AI</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Unsorted Photos Section */}
            {unsortedNotes.length > 0 && (
              <View style={styles.categorySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.categoryTitle}>Recent Unsorted</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {unsortedNotes.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.photoGrid}>
                  {unsortedNotes.map((note) => (
                    <TouchableOpacity
                      key={note.id}
                      style={[
                        styles.photoCard,
                        { width: thumbSize, height: thumbSize * 1.08 },
                      ]}
                      activeOpacity={0.85}
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
                          <Camera size={24} color="#CBD5E1" weight="light" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'PTSans',
    color: '#64748B',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontFamily: 'PTSans',
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  categoryPillActive: {
    backgroundColor: '#0F172A',
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryPillText: {
    fontSize: 12,
    fontFamily: 'PTSansBold',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 120,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionColorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'PTSansBold',
    color: '#64748B',
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
    fontFamily: 'PTSans',
    color: '#64748B',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  photoCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
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
    backgroundColor: '#F1F5F9',
  },
  processingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'PTSansBold',
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'PTSansBold',
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'PTSans',
    color: '#64748B',
    textAlign: 'center',
  },
});

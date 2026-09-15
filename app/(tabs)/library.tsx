import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Animated,
  Keyboard,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Camera,
  MagnifyingGlass,
  ArrowLeft,
  X,
  CaretRight,
  Images,
  Trash,
  Check,
} from 'phosphor-react-native';
import { DEFAULT_CATEGORIES, DEFAULT_NOTES, getCategories, getNotes, deleteNotes } from '@/services/notes';
import { Category, Note } from '@/types';
import TactileButton from '@/components/TactileButton';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GAP = 10;
const COLUMN_COUNT = 3;
const THUMB_SIZE = Math.floor((width - HORIZONTAL_PADDING * 2 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT);

export default function LibraryScreen() {
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  const openSearch = () => {
    setShowSearch(true);
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Focus immediately
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setShowSearch(false);
      setSearchQuery('');
    });
  };

  const searchWidth = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const titleOpacity = searchAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

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

  const handleLongPressPhoto = (id: string) => {
    setIsSelectionMode(true);
    setSelectedNoteIds(new Set([id]));
  };

  const handlePressPhoto = (id: string) => {
    if (isSelectionMode) {
      const newSelection = new Set(selectedNoteIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
        if (newSelection.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSelection.add(id);
      }
      setSelectedNoteIds(newSelection);
    } else {
      router.push({
        pathname: '/note/preview',
        params: { id },
      });
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedNoteIds.size} ${selectedNoteIds.size === 1 ? 'photo' : 'photos'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteNotes(Array.from(selectedNoteIds));
            setIsSelectionMode(false);
            setSelectedNoteIds(new Set());
            loadData();
          }
        }
      ]
    );
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
        {isSelectionMode ? (
          <View style={[styles.headerRow, { justifyContent: 'space-between' }]}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedNoteIds(new Set());
              }}
            >
              <X size={24} color="#0F172A" weight="bold" />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>{selectedNoteIds.size} Selected</Text>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleDeleteSelected}
            >
              <Trash size={24} color="#EF4444" weight="bold" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <Animated.View style={{ opacity: titleOpacity, flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
            <View>
              <Text style={styles.headerTitle}>Photos</Text>
              <Text style={styles.headerSubtitle}>
                {notes.length} {notes.length === 1 ? 'photo' : 'photos'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={openSearch}
                activeOpacity={0.7}
              >
                <MagnifyingGlass size={22} color="#0F172A" weight="regular" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Absolute positioned search bar expands from right to left */}
          <Animated.View
            style={[
              styles.searchBar,
              {
                width: searchWidth,
                overflow: 'hidden',
                marginTop: 0,
                position: 'absolute',
                right: 0,
                backgroundColor: '#FFFFFF', // cover the icons underneath
                zIndex: 10,
              }
            ]}
          >
            <View style={{ paddingLeft: 4 }}>
              <MagnifyingGlass size={16} color="#9CA3AF" weight="regular" />
            </View>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
              placeholder="Search lectures, whiteboards, notes..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity onPress={() => closeSearch()} style={{ paddingRight: 4, height: 42, justifyContent: 'center' }}>
              <X size={16} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>
          </Animated.View>
        </View>
        )}
      </View>

      {/* ─── CATEGORY SECTIONS (Matching Reference Screenshot) ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          categorySections.length === 0 && unsortedNotes.length === 0 && { flexGrow: 1, justifyContent: 'center' }
        ]}
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
              {catNotes.slice(0, 6).map((note) => {
                const isSelected = selectedNoteIds.has(note.id);
                return (
                  <TouchableOpacity
                    key={note.id}
                    style={styles.photoCard}
                    activeOpacity={0.88}
                    onLongPress={() => handleLongPressPhoto(note.id)}
                    onPress={() => handlePressPhoto(note.id)}
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
                    {isSelectionMode && (
                      <View style={[styles.selectionOverlay, isSelected && styles.selectionOverlayActive]}>
                        {isSelected && <Check size={16} color="#FFFFFF" weight="bold" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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
              {unsortedNotes.slice(0, 6).map((note) => {
                const isSelected = selectedNoteIds.has(note.id);
                return (
                  <TouchableOpacity
                    key={note.id}
                    style={styles.photoCard}
                    activeOpacity={0.88}
                    onLongPress={() => handleLongPressPhoto(note.id)}
                    onPress={() => handlePressPhoto(note.id)}
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
                    {isSelectionMode && (
                      <View style={[styles.selectionOverlay, isSelected && styles.selectionOverlayActive]}>
                        {isSelected && <Check size={16} color="#FFFFFF" weight="bold" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Empty State when no photos exist */}
        {categorySections.length === 0 && unsortedNotes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Images size={48} color="#CBD5E1" weight="light" />
            <Text style={styles.emptyTitle}>No photos yet</Text>
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
    paddingTop: Platform.OS === 'ios' ? 84 : 64, // Pushed down further
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative', // so absolute children anchor to this
    height: 48,
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
  selectionTitle: {
    fontSize: 18,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 4,
    height: 42,
    gap: 8,
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
  selectionOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionOverlayActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80, // Push down
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Assistant',
    fontWeight: '300',
    color: '#94A3B8',
    marginTop: 16,
    letterSpacing: 0.5,
  },
});

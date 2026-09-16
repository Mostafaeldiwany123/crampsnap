import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Images, X, Trash, Check } from 'phosphor-react-native';
import Colors from '@/constants/Colors';
import { getCategories, getNotes, deleteNotes } from '@/services/notes';
import { Category, Note } from '@/types';
import TactileButton from '@/components/TactileButton';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GAP = 10;
const COLUMN_COUNT = 3;
const THUMB_SIZE = (width - HORIZONTAL_PADDING * 2 - GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const [allNotes, allCategories] = await Promise.all([
        getNotes(),
        getCategories(),
      ]);

      let targetCategory: Category | undefined;
      let filteredNotes: Note[] = [];

      if (id === 'uncategorized') {
        targetCategory = {
          id: 'uncategorized',
          name: 'Unsorted Photos',
          color: '#64748B',
          created_at: new Date().toISOString(),
          description: 'Uncategorized study materials',
        };
        filteredNotes = allNotes.filter((n) => !n.category_id);
      } else {
        targetCategory = allCategories.find((c) => c.id === id);
        filteredNotes = allNotes.filter((n) => n.category_id === id);
      }

      filteredNotes.sort((a, b) => b.created_at.localeCompare(a.created_at));

      setCategory(targetCategory || null);
      setNotes(filteredNotes);
    } catch (error) {
      console.error('Error loading collection details:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
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
      router.push({ pathname: '/note/preview', params: { id } });
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

  const renderNoteItem = ({ item }: { item: Note }) => {
    const isSelected = selectedNoteIds.has(item.id);
    return (
      <TouchableOpacity
        style={styles.photoCard}
        onLongPress={() => handleLongPressPhoto(item.id)}
        onPress={() => handlePressPhoto(item.id)}
        activeOpacity={0.88}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.photoImage} />
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
  };

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedNoteIds(new Set()); }} style={styles.backBtn}>
              <X size={22} color="#111827" weight="bold" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{selectedNoteIds.size} Selected</Text>
            </View>

            <TouchableOpacity style={styles.cameraBtn} onPress={handleDeleteSelected}>
              <Trash size={22} color="#EF4444" weight="bold" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color="#111827" weight="bold" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{category?.name || 'Collection'}</Text>
              <Text style={styles.headerSub}>
                {notes.length} {notes.length === 1 ? 'photo' : 'photos'}
              </Text>
            </View>

            <TouchableOpacity style={styles.cameraBtn} onPress={() => router.push('/(tabs)/scan')}>
              <Camera size={22} color="#111827" weight="regular" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ─── PHOTOS GRID ─── */}
      <FlatList
        data={notes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={{ gap: GAP }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#111827"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Images size={42} color="#CBD5E1" weight="light" />
            <Text style={styles.emptyText}>No photos yet</Text>
          </View>
        }
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
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'AssistantBold',
    color: '#111827',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'Assistant',
    color: '#6B7280',
    marginTop: 2,
  },
  cameraBtn: {
    padding: 6,
  },
  listContent: {
    padding: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 40,
  },
  photoCard: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.05,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: GAP,
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
    paddingTop: 120,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Assistant',
    fontWeight: '300',
    color: '#94A3B8',
    marginTop: 16,
    letterSpacing: 0.5,
  },
});

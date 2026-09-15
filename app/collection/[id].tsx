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
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Images } from 'phosphor-react-native';
import Colors from '@/constants/Colors';
import { getCategories, getNotes } from '@/services/notes';
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

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => {
        router.push({ pathname: '/note/preview', params: { id: item.id } });
      }}
      activeOpacity={0.88}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.photoImage} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Camera size={24} color="#D1D5DB" weight="light" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" weight="bold" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{category?.name || 'Collection'}</Text>
          <Text style={styles.headerSub}>
            {notes.length} {notes.length === 1 ? 'photo' : 'photos'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <Camera size={22} color="#111827" weight="regular" />
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'AssistantBold',
    color: '#111827',
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

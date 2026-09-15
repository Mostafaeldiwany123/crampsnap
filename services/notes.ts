import { Category, Note } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const NOTES_KEY = 'college_notes_app_notes_v3';
const CATEGORIES_KEY = 'college_notes_app_categories_v3';

// Clean, zero fake data
export const DEFAULT_CATEGORIES: Category[] = [];
export const DEFAULT_NOTES: Note[] = [];

export const saveNote = async (
  note: Omit<Note, 'id' | 'created_at'> & { id?: string }
): Promise<Note> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    const notes: Note[] = raw ? JSON.parse(raw) : [];

    const newNote: Note = {
      ...note,
      id: note.id || uuid.v4().toString(),
      created_at: new Date().toISOString(),
      status: note.status || 'completed',
    };

    if (note.id) {
      const index = notes.findIndex((n) => n.id === note.id);
      if (index !== -1) notes[index] = newNote;
      else notes.unshift(newNote);
    } else {
      notes.unshift(newNote);
    }

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return newNote;
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed: Note[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
};

export const getNote = async (id: string): Promise<Note | null> => {
  try {
    const notes = await getNotes();
    return notes.find((n) => n.id === id) || null;
  } catch (error) {
    console.error('Error getting note by id:', error);
    return null;
  }
};

export const deleteNote = async (id: string) => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    let notes: Note[] = raw ? JSON.parse(raw) : [];
    notes = notes.filter((n) => n.id !== id);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
};

export const createProcessingNote = async (
  imageUri: string,
  initialTitle?: string,
  initialContent?: string
): Promise<Note> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    const notes: Note[] = raw ? JSON.parse(raw) : [];

    const newNote: Note = {
      id: uuid.v4().toString(),
      title: initialTitle || 'Class Lecture Note',
      content: initialContent || 'Processing lecture note...',
      created_at: new Date().toISOString(),
      status: 'processing',
      image_url: imageUri,
    };

    notes.unshift(newNote);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return newNote;
  } catch (error) {
    console.error('Error creating processing note:', error);
    throw error;
  }
};

export const updateNote = async (
  id: string,
  updates: Partial<Note>
): Promise<Note | null> => {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    let notes: Note[] = raw ? JSON.parse(raw) : [];
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) return null;

    notes[index] = { ...notes[index], ...updates };
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return notes[index];
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    const parsed: Category[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const saveCategory = async (
  category: Omit<Category, 'id' | 'created_at'> & { id?: string }
): Promise<Category> => {
  try {
    const existing = await getCategories();

    if (!category.id) {
      const duplicate = existing.find(
        (c) => c.name.toLowerCase() === category.name.toLowerCase()
      );
      if (duplicate) return duplicate;
    }

    const newCategory: Category = {
      ...category,
      id: category.id || uuid.v4().toString(),
      color: category.color || '#3B82F6',
      created_at: new Date().toISOString(),
    };

    if (category.id) {
      const index = existing.findIndex((c) => c.id === category.id);
      if (index !== -1) existing[index] = newCategory;
      else existing.push(newCategory);
    } else {
      existing.push(newCategory);
    }

    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(existing));
    return newCategory;
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const existing = await getCategories();
    const updated = existing.filter((c) => c.id !== id);
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Calculate real storage used locally
export const getStorageUsage = async (): Promise<{ bytes: number; formatted: string }> => {
  try {
    const notesRaw = (await AsyncStorage.getItem(NOTES_KEY)) || '';
    const catsRaw = (await AsyncStorage.getItem(CATEGORIES_KEY)) || '';
    const bytes = new Blob([notesRaw + catsRaw]).size;

    if (bytes < 1024) {
      return { bytes, formatted: `${bytes} B` };
    } else if (bytes < 1024 * 1024) {
      return { bytes, formatted: `${(bytes / 1024).toFixed(1)} KB` };
    } else {
      return { bytes, formatted: `${(bytes / (1024 * 1024)).toFixed(2)} MB` };
    }
  } catch (e) {
    return { bytes: 0, formatted: '0 KB' };
  }
};

// Clear all local data completely
export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(NOTES_KEY);
    await AsyncStorage.removeItem(CATEGORIES_KEY);
  } catch (error) {
    console.error('Error clearing all data:', error);
  }
};

import { Platform } from 'react-native';

const DB_NAME = 'cramsnap_storage';
const STORE_NAME = 'images';
const DB_VERSION = 1;

/**
 * Opens or initializes the IndexedDB database for persistent web photo storage.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

/**
 * Saves an image to IndexedDB on Web so photos persist across browser/PWA sessions.
 * Returns a persistent Data URL or the original URI.
 */
export async function saveWebImage(key: string, uri: string): Promise<string> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return uri;
  }

  try {
    // If it's a blob: or local uri, convert to data URL for bulletproof storage
    let dataUrl = uri;
    if (uri.startsWith('blob:') || uri.startsWith('http')) {
      const response = await fetch(uri);
      const blob = await response.blob();
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(dataUrl, key);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = (e: any) => reject(e.target.error);
    });

    return dataUrl;
  } catch (error) {
    console.warn('Failed to save image to IndexedDB:', error);
    return uri;
  }
}

/**
 * Retrieves a stored image from IndexedDB by key.
 */
export async function getWebImage(key: string): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  try {
    const db = await openDB();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(key);

      getRequest.onsuccess = (e: any) => resolve(e.target.result || null);
      getRequest.onerror = (e: any) => reject(e.target.error);
    });
  } catch (error) {
    console.warn('Failed to get image from IndexedDB:', error);
    return null;
  }
}

/**
 * Deletes an image from IndexedDB.
 */
export async function deleteWebImage(key: string): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const deleteRequest = store.delete(key);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = (e: any) => reject(e.target.error);
    });
  } catch (error) {
    console.warn('Failed to delete image from IndexedDB:', error);
  }
}

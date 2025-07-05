'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, type Firestore, deleteDoc, doc } from 'firebase/firestore';
import type { Verse, VerseReference } from './bible';
import type { BibleTranslation } from '@/contexts/SettingsContext';

export interface Bookmark extends VerseReference {
  id: string;
  userId: string;
  translation: BibleTranslation;
  createdAt: string; // ISO string format
}

function checkDb() {
    if (!db) {
        throw new Error("Firebase is not configured. Please check your .env.local file and restart the server.");
    }
    return db as Firestore;
}

/**
 * Adds a verse to the user's bookmarks in Firestore.
 * @param userId The ID of the user.
 * @param verse The verse reference to bookmark.
 * @returns A promise that resolves when the bookmark is added.
 */
export async function addBookmark(userId: string, verse: VerseReference, translation: BibleTranslation): Promise<string> {
  const firestore = checkDb();
  
  // Check if bookmark already exists
  const q = query(collection(firestore, 'bookmarks'), 
    where('userId', '==', userId),
    where('book', '==', verse.book),
    where('chapter', '==', verse.chapter),
    where('verse', '==', verse.verse),
    where('translation', '==', translation)
  );

  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error("This verse is already bookmarked.");
  }

  try {
    const docRef = await addDoc(collection(firestore, 'bookmarks'), {
      userId,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      translation,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error: any) {
    console.error("Error adding bookmark: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Failed to add bookmark: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add bookmark. Original error: ${error.code || error.message}`);
  }
}

/**
 * Fetches all bookmarks for a specific user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of Bookmark objects.
 */
export async function getBookmarksForUser(userId: string): Promise<Bookmark[]> {
  const firestore = checkDb();
  const q = query(collection(firestore, 'bookmarks'), where('userId', '==', userId));
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return [];
    }

    const bookmarks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        book: data.book,
        chapter: data.chapter,
        verse: data.verse,
        translation: data.translation,
        createdAt: data.createdAt.toDate().toISOString(),
      } as Bookmark;
    });

    return bookmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error: any) {
    console.error("Error fetching bookmarks: ", error);
    throw new Error(`Failed to fetch bookmarks. Original error: ${error.code || error.message}`);
  }
}

/**
 * Deletes a bookmark from Firestore.
 * @param bookmarkId The ID of the bookmark document to delete.
 * @returns A promise that resolves when the bookmark is deleted.
 */
export async function removeBookmark(bookmarkId: string): Promise<void> {
    const firestore = checkDb();
    const bookmarkRef = doc(firestore, 'bookmarks', bookmarkId);
    try {
        await deleteDoc(bookmarkRef);
    } catch (error: any) {
        console.error("Error removing bookmark: ", error);
        throw new Error(`Failed to remove bookmark. Original error: ${error.code || error.message}`);
    }
}

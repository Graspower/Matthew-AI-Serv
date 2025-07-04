
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, Firestore } from 'firebase/firestore';

export interface InspirationVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

function checkDb() {
    if (!db) {
        throw new Error("Firebase is not configured. Please check your .env.local file and restart the server.");
    }
    return db as Firestore;
}


/**
 * Fetches the list of inspirational verses from the 'inspirations' collection in Firestore.
 * @returns A promise that resolves to an array of InspirationVerse objects.
 */
export async function getInspirationalVerses(): Promise<InspirationVerse[]> {
  try {
    const firestore = checkDb();
    const inspirationsCol = collection(firestore, 'inspirations');
    const snapshot = await getDocs(inspirationsCol);

    if (snapshot.empty) {
      console.warn('No documents found in "inspirations" collection.');
      return [];
    }

    const verses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        book: data.book || '',
        chapter: data.chapter || 0,
        verse: data.verse || 0,
        text: data.text || '',
      } as InspirationVerse;
    });
    return verses;
  } catch (error: any) {
    console.error("Error fetching inspirational verses: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Permission Denied: Your security rules are not set up to allow reading from the 'inspirations' collection. Please check your Firestore rules.");
    }
    throw new Error(`Failed to fetch inspirational verses. Original error: ${error.code || error.message}`);
  }
}

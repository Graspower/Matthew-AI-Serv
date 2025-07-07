
'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, Firestore, query, limit } from 'firebase/firestore';

export interface DailyInspiration {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  explanation: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
}

function checkDb() {
    if (!db) {
        throw new Error("Firebase is not configured. Please check your .env.local file and restart the server.");
    }
    return db as Firestore;
}


/**
 * Fetches the list of inspirational verses from the 'inspirations' collection in Firestore.
 * @returns A promise that resolves to an array of DailyInspiration objects.
 */
export async function getInspirationalVerses(): Promise<DailyInspiration[]> {
  try {
    const firestore = checkDb();
    const inspirationsCol = collection(firestore, 'inspirations');
    // Fetch up to 3 documents. For more specific verses, you might order by a timestamp.
    const snapshot = await getDocs(query(inspirationsCol, limit(3)));

    if (snapshot.empty) {
      console.warn('No documents found in "inspirations" collection.');
      return [];
    }
    
    const timeOfDayMap: ('Morning' | 'Afternoon' | 'Evening')[] = ['Morning', 'Afternoon', 'Evening'];

    const verses = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      
      return {
        id: doc.id,
        book: data.book || '',
        chapter: data.chapter || 0,
        verse: data.verse || 0,
        text: data.text || '',
        explanation: data.adoration || '', // Map 'adoration' field from Firestore
        timeOfDay: timeOfDayMap[index] || 'Evening', // Assign based on fetch order
      } as DailyInspiration;
    }).filter((v): v is DailyInspiration => v !== null);

    return verses;
  } catch (error: any) {
    console.error("Error fetching inspirational verses: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Permission Denied: Your security rules are not set up to allow reading from the 'inspirations' collection. Please check your Firestore rules.");
    }
    throw new Error(`Failed to fetch inspirational verses. Original error: ${error.code || error.message}`);
  }
}


'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, Firestore, query } from 'firebase/firestore';

export interface DailyInspiration {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  explanation: string; // This is the 'adoration' field from firestore
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
}

function checkDb() {
    if (!db) {
        throw new Error("Firebase is not configured. Please check your .env.local file and restart the server.");
    }
    return db as Firestore;
}


/**
 * Fetches 3 random inspirational verses from the 'inspirations' collection in Firestore.
 * @returns A promise that resolves to an array of DailyInspiration objects.
 */
export async function getInspirationalVerses(): Promise<DailyInspiration[]> {
  try {
    const firestore = checkDb();
    const inspirationsCol = collection(firestore, 'inspirations');
    const snapshot = await getDocs(query(inspirationsCol));

    if (snapshot.empty) {
      console.warn('No documents found in "inspirations" collection.');
      return [];
    }

    const allVerses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        book: data.book || '',
        chapter: data.chapter || 0,
        verse: data.verse || 0,
        text: data.text || '',
        explanation: data.adoration || '',
      };
    });

    // Shuffle the array and take the first 3
    const shuffled = allVerses.sort(() => 0.5 - Math.random());
    const selectedVerses = shuffled.slice(0, 3);
    
    if (selectedVerses.length < 3) {
      console.warn(`Only found ${selectedVerses.length} documents in "inspirations" collection. Expected 3.`);
    }

    const timeOfDayMap: ('Morning' | 'Afternoon' | 'Evening')[] = ['Morning', 'Afternoon', 'Evening'];

    const versesWithTimeOfDay: DailyInspiration[] = selectedVerses.map((verse, index) => {
        const dailyVerse: DailyInspiration = {
            id: verse.id,
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text,
            explanation: verse.explanation,
            timeOfDay: timeOfDayMap[index] || 'Evening',
        };
        return dailyVerse;
    });

    return versesWithTimeOfDay;

  } catch (error: any) {
    console.error("Error fetching inspirational verses: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Permission Denied: Your security rules are not set up to allow reading from the 'inspirations' collection. Please check your Firestore rules.");
    }
    throw new Error(`Failed to fetch inspirational verses. Original error: ${error.code || error.message}`);
  }
}


'use server';

import type { BibleTranslation } from '@/contexts/SettingsContext';
import { db } from '@/lib/firebase';
import { getDoc, doc, collection, getDocs, limit } from "firebase/firestore";

export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  languageContext?: string;
  translationContext?: BibleTranslation;
}

export interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
}

export interface BibleBook {
  id: string; 
  name: string;
  chapterCount: number;
}

export interface BibleChapter {
  id: number;
  name: string;
}

// --- Firestore Data Structures ---
// Each book is a document in a collection named after the translation (e.g., 'KJV')
// The document contains a map of chapters, which contains a map of verses.
// { "1": { "1": "Verse text...", "2": "..." }, "2": { "1": "..." } }
type FirestoreBookData = Record<string, Record<string, string>>;

// --- Caching ---
type BookCache = Map<BibleTranslation, Map<string, FirestoreBookData>>;
const bookCache: BookCache = new Map();

async function getBookData(translation: BibleTranslation, bookName: string): Promise<FirestoreBookData | null> {
    // Check cache first
    if (bookCache.has(translation) && bookCache.get(translation)!.has(bookName)) {
        return bookCache.get(translation)!.get(bookName)!;
    }

    try {
        const bookRef = doc(db, translation, bookName);
        const docSnap = await getDoc(bookRef);

        if (!docSnap.exists()) {
            console.warn(`[Firestore] Document for ${bookName} in ${translation} collection not found.`);
            return null;
        }

        const data = docSnap.data() as FirestoreBookData;
        
        // Populate cache
        if (!bookCache.has(translation)) {
            bookCache.set(translation, new Map());
        }
        bookCache.get(translation)!.set(bookName, data);

        return data;
    } catch (error: any) {
        console.error(`[Firestore] Error fetching book ${bookName} from ${translation}:`, error);
        throw new Error(`Could not fetch data for ${bookName} (${translation}). Check Firestore rules and data structure. Original error: ${error.message}`);
    }
}

export async function getBooks(translation: BibleTranslation): Promise<BibleBook[]> {
  try {
    const translationRef = collection(db, translation);
    const querySnapshot = await getDocs(translationRef);

    if (querySnapshot.empty) {
        console.warn(`No books found for ${translation} collection in Firestore. It may be empty or you lack permissions.`);
        return [];
    }

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.id, 
      chapterCount: Object.keys(doc.data()).length,
    }));
  } catch (error: any) {
     console.error(`[Firestore] Error fetching book list for ${translation}:`, error);
     throw new Error(`Could not fetch book list for ${translation}. Check Firestore rules. Original error: ${error.message}`);
  }
}


export async function getChaptersForBook(translation: BibleTranslation, bookId: string): Promise<BibleChapter[]> {
    const bookData = await getBookData(translation, bookId);
    if (!bookData) {
        throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
    }

    return Object.keys(bookData).map(chapterNumber => ({
        id: parseInt(chapterNumber, 10),
        name: `Chapter ${chapterNumber}`,
    })).sort((a,b) => a.id - b.id);
}


export async function getChapterText(translation: BibleTranslation, bookId: string, chapterNumber: number, highlightVerse?: number | null): Promise<string> {
    const bookData = await getBookData(translation, bookId);
    if (!bookData) {
        throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
    }

    const chapterData = bookData[String(chapterNumber)];
    if (!chapterData) {
        throw new Error(`Chapter ${chapterNumber} not found in ${bookId} (${translation} translation).`);
    }

    let formattedText = `<h3 class="text-lg font-semibold mb-2">${bookId} - Chapter ${chapterNumber} (${translation})</h3>\n`;
    formattedText += Object.entries(chapterData).map(([verseNum, verseText]) => {
        const verseNumber = parseInt(verseNum, 10);
        return `<p class="mb-1 transition-colors duration-300 ${verseNumber === highlightVerse ? 'bg-accent/30 rounded-md p-2' : 'p-2'}" ${verseNumber === highlightVerse ? 'id="highlighted-verse"' : ''}>` +
               `<strong class="mr-1">${verseNumber}</strong>${verseText.replace(/^\s*¶\s*/, '')}</p>`;
    }).join('\n');

    return formattedText;
}


export async function getVerse(translation: BibleTranslation, bookName: string, chapterNumber: number, verseNumber: number): Promise<Verse | null> {
    const bookData = await getBookData(translation, bookName);
    if (!bookData) {
        return null;
    }

    const chapterData = bookData[String(chapterNumber)];
    if (!chapterData) {
        console.warn(`Chapter ${chapterNumber} not found in ${bookName} (${translation} data).`);
        return null;
    }

    const verseText = chapterData[String(verseNumber)];
    if (!verseText) {
        console.warn(`Verse ${verseNumber} not found in ${bookName} ${chapterNumber} (${translation} data).`);
        return null;
    }

    return {
        book: bookName,
        chapter: chapterNumber,
        verse: verseNumber,
        text: verseText,
        translationContext: translation, 
    };
}


'use server';

import fs from 'fs/promises';
import path from 'path';
import type { BibleTranslation } from '@/contexts/SettingsContext';

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

// --- Data Structures for Local JSON ---
// Assumes a structure like: { "bookName": { "chapterNum": { "verseNum": "text" } } }
type BibleJson = Record<string, Record<string, Record<string, string>>>;

// --- In-Memory Caching ---
// Cache Bible data in memory to avoid refetching on every navigation.
const bibleCache: Map<BibleTranslation, BibleJson> = new Map();

async function getTranslationData(translation: BibleTranslation): Promise<BibleJson> {
    if (bibleCache.has(translation)) {
        return bibleCache.get(translation)!;
    }

    try {
        // Construct the full path to the JSON file in the public directory
        const filePath = path.join(process.cwd(), 'public', 'bibles', `${translation}.json`);
        
        // Read the file from the filesystem since this is a server component
        const fileContent = await fs.readFile(filePath, 'utf-8');
        
        // Parse the JSON data
        const data: BibleJson = JSON.parse(fileContent);

        // Store in cache and return
        bibleCache.set(translation, data);
        return data;
    } catch (error: any) {
        console.error(`Error loading or parsing Bible data for ${translation}:`, error);
        // Provide a more helpful error message
        if (error.code === 'ENOENT') {
             throw new Error(`Could not load data for ${translation}. The file was not found at /public/bibles/${translation}.json. Please ensure the file exists and the filename is correct.`);
        }
        throw new Error(`Could not load data for ${translation}. Make sure the file is valid JSON. Original error: ${error.message}`);
    }
}

/**
 * Finds a book in the Bible data using a case-insensitive search.
 * @param translationData The loaded Bible data for a specific translation.
 * @param bookName The name of the book to find.
 * @returns An object containing the correctly cased key and the book's data, or null if not found.
 */
function findBook(translationData: BibleJson, bookName: string): { key: string, data: Record<string, Record<string, string>> } | null {
    // Try a direct match first for performance.
    if (translationData[bookName]) {
        return { key: bookName, data: translationData[bookName] };
    }
    // Fallback to case-insensitive search.
    const lowerCaseBookName = bookName.toLowerCase();
    const foundKey = Object.keys(translationData).find(key => key.toLowerCase() === lowerCaseBookName);
    if (foundKey) {
        return { key: foundKey, data: translationData[foundKey] };
    }
    return null;
}

export async function getBooks(translation: BibleTranslation): Promise<BibleBook[]> {
  try {
    const translationData = await getTranslationData(translation);
    return Object.keys(translationData).map(bookName => ({
      id: bookName,
      name: bookName,
      chapterCount: Object.keys(translationData[bookName]).length,
    }));
  } catch (error: any) {
     console.error(`Error getting books for ${translation}:`, error);
     throw error;
  }
}

export async function getChaptersForBook(translation: BibleTranslation, bookId: string): Promise<BibleChapter[]> {
    const translationData = await getTranslationData(translation);
    const bookInfo = findBook(translationData, bookId);
    if (!bookInfo) {
        throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
    }

    return Object.keys(bookInfo.data).map(chapterNumber => ({
        id: parseInt(chapterNumber, 10),
        name: `Chapter ${chapterNumber}`,
    })).sort((a,b) => a.id - b.id);
}

export async function getChapterText(translation: BibleTranslation, bookId: string, chapterNumber: number, highlightVerse?: number | null): Promise<string> {
    const translationData = await getTranslationData(translation);
    const bookInfo = findBook(translationData, bookId);
    if (!bookInfo) {
        throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
    }

    const chapterData = bookInfo.data[String(chapterNumber)];
    if (!chapterData) {
        throw new Error(`Chapter ${chapterNumber} not found in ${bookId} (${translation} translation).`);
    }

    let formattedText = `<h3 class="text-lg font-semibold mb-2">${bookInfo.key} - Chapter ${chapterNumber} (${translation})</h3>\n`;
    formattedText += Object.entries(chapterData).map(([verseNum, verseText]) => {
        const verseNumber = parseInt(verseNum, 10);
        return `<p class="mb-1 transition-colors duration-300 ${verseNumber === highlightVerse ? 'bg-accent/30 rounded-md p-2' : 'p-2'}" ${verseNumber === highlightVerse ? 'id="highlighted-verse"' : ''}>` +
               `<strong class="mr-1">${verseNumber}</strong>${verseText.replace(/^\s*¶\s*/, '')}</p>`;
    }).join('\n');

    return formattedText;
}

export async function getVerse(translation: BibleTranslation, bookName: string, chapterNumber: number, verseNumber: number): Promise<Verse | null> {
    const translationData = await getTranslationData(translation);
    const bookInfo = findBook(translationData, bookName);
    if (!bookInfo) {
        console.warn(`Book not found in bible data: ${bookName} (${translation})`);
        return null;
    }

    const chapterData = bookInfo.data[String(chapterNumber)];
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
        book: bookInfo.key,
        chapter: chapterNumber,
        verse: verseNumber,
        text: verseText,
        translationContext: translation, 
    };
}

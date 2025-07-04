
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

// The standardized nested object structure used by the app's functions.
// e.g., { "Genesis": { "1": { "1": "text" } } }
type BibleJson = Record<string, Record<string, Record<string, string>>>;

// Cache for transformed Bible data to avoid re-reading and re-transforming files.
const bibleCache: Map<BibleTranslation, BibleJson> = new Map();

/**
 * Transforms the KJV-style array of verse objects into the standard nested object structure.
 * @param verses An array of verse objects, e.g., { book_name, chapter, verse, text }.
 * @returns A BibleJson object.
 */
function transformKjvArrayToNestedObject(verses: any[]): BibleJson {
    const nestedObject: BibleJson = {};
    for (const item of verses) {
        const { book_name, chapter, verse, text } = item;
        if (!book_name || !chapter || !verse || typeof text === 'undefined') continue;

        if (!nestedObject[book_name]) {
            nestedObject[book_name] = {};
        }
        if (!nestedObject[book_name][String(chapter)]) {
            nestedObject[book_name][String(chapter)] = {};
        }
        nestedObject[book_name][String(chapter)][String(verse)] = text;
    }
    return nestedObject;
}

/**
 * Loads and standardizes data for a given Bible translation.
 * It handles both array-based and object-based JSON structures.
 * @param translation The Bible translation to load (e.g., 'KJV').
 * @returns A promise that resolves to the standardized BibleJson object.
 */
async function getTranslationData(translation: BibleTranslation): Promise<BibleJson> {
    if (bibleCache.has(translation)) {
        return bibleCache.get(translation)!;
    }

    const lowerCaseTranslation = translation.toLowerCase();
    const fileName = `${lowerCaseTranslation}-bible.json`;
    // Corrected path: Read from `src/data/bibles` to ensure bundling in production.
    const filePath = path.join(process.cwd(), 'src', 'data', 'bibles', fileName);

    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        let bibleData: BibleJson;

        // Check if the data is in the KJV array format (e.g., { "verses": [...] })
        if (data && data.verses && Array.isArray(data.verses)) {
            bibleData = transformKjvArrayToNestedObject(data.verses);
        } else if (Array.isArray(data)) { // Or a raw array
            bibleData = transformKjvArrayToNestedObject(data);
        }
        else {
            // Assume it's already in the standard nested object format for other versions
            bibleData = data as BibleJson;
        }

        bibleCache.set(translation, bibleData);
        return bibleData;

    } catch (error: any) {
        console.error(`Error loading or parsing Bible data for ${translation} from ${fileName}:`, error);
        if (error.code === 'ENOENT') {
             throw new Error(`Could not load data for ${translation}. The file was not found at ${filePath}. Please ensure the file exists and the filename is correct.`);
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
        throw new Error(`Chapter ${chapterNumber} not found in ${bookInfo.key} (${translation} translation).`);
    }

    let formattedText = `<h3 class="text-lg font-semibold mb-2">${bookInfo.key} - Chapter ${chapterNumber} (${translation})</h3>\n`;
    formattedText += Object.entries(chapterData).map(([verseNum, verseText]) => {
        const verseNumber = parseInt(verseNum, 10);
        // Remove the pilcrow (paragraph) symbol from KJV text
        const cleanedText = verseText.replace(/^\s*\u00b6\s*/, '');
        return `<p class="mb-1 transition-colors duration-300 ${verseNumber === highlightVerse ? 'bg-accent/30 rounded-md p-2' : 'p-2'}" ${verseNumber === highlightVerse ? 'id="highlighted-verse"' : ''}>` +
               `<strong class="mr-1">${verseNumber}</strong>${cleanedText}</p>`;
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
        console.warn(`Chapter ${chapterNumber} not found in ${bookInfo.key} (${translation} data).`);
        return null;
    }

    const verseText = chapterData[String(verseNumber)];
    if (!verseText) {
        console.warn(`Verse ${verseNumber} not found in ${bookInfo.key} ${chapterNumber} (${translation} data).`);
        return null;
    }

    return {
        book: bookInfo.key,
        chapter: chapterNumber,
        verse: verseNumber,
        text: verseText.replace(/^\s*\u00b6\s*/, ''), // Also clean the text here
        translationContext: translation, 
    };
}

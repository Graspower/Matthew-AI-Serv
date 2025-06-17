
import type { BibleTranslation } from '@/contexts/SettingsContext';

/**
 * Represents a Bible verse for display and AI processing.
 */
export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  languageContext?: string;
  translationContext?: BibleTranslation; // Track which translation this text is from
}

/**
 * Represents a Bible verse reference (without text).
 */
export interface VerseReference {
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Represents a Bible book for the Bible Reader.
 */
export interface BibleBook {
  id: string; // Full book name, e.g., "Genesis"
  name: string; // e.g., "Genesis"
  chapterCount: number;
}

/**
 * Represents a chapter identifier for the Bible Reader.
 */
export interface BibleChapter {
  id: number; // chapter number
  name: string; // e.g. "Chapter 1"
}

// --- Raw Data Structures ---
// KJV specific raw verse structure
interface KJVRawVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

// Generic structure for ESV, NIV, NRSV from user description
// { BookName: { ChapterNumStr: { VerseNumStr: VerseTextStr } } }
type GenericRawBibleData = Record<string, Record<string, Record<string, string>>>;


// --- Internal Processed Data Structures (common for all translations after parsing) ---
interface ProcessedVerseData {
  verse: number;
  text: string;
}

interface ProcessedChapterData {
  chapter: number;
  verses: ProcessedVerseData[];
}

interface ProcessedBookData {
  bookName: string;
  chapters: ProcessedChapterData[];
}

// --- Caching ---
type ProcessedBibleCache = Map<BibleTranslation, Map<string, ProcessedBookData>>;
const processedBibleCache: ProcessedBibleCache = new Map();
type BibleDataPromiseCache = Map<BibleTranslation, Promise<Map<string, ProcessedBookData>>>;
const bibleDataPromiseCache: BibleDataPromiseCache = new Map();


const translationFileMap: Record<BibleTranslation, string> = {
  KJV: '/kjv-bible.json',
  ESV: '/esv-bible.json',
  NIV: '/niv-bible.json',
  NRSV: '/nrsv-bible.json',
};

/**
 * Parses KJV-specific raw verse data (array of verses) into the common ProcessedBookData structure.
 */
function parseKJVData(rawVerses: KJVRawVerse[]): Map<string, ProcessedBookData> {
  const booksMap = new Map<string, ProcessedBookData>();
  for (const rawVerse of rawVerses) {
    if (!booksMap.has(rawVerse.book_name)) {
      booksMap.set(rawVerse.book_name, {
        bookName: rawVerse.book_name,
        chapters: [],
      });
    }
    const bookData = booksMap.get(rawVerse.book_name)!;
    let chapterData = bookData.chapters.find(c => c.chapter === rawVerse.chapter);
    if (!chapterData) {
      chapterData = {
        chapter: rawVerse.chapter,
        verses: [],
      };
      bookData.chapters.push(chapterData);
    }
    chapterData.verses.push({
      verse: rawVerse.verse,
      text: rawVerse.text,
    });
  }
  // Sort chapters and verses
  for (const book of booksMap.values()) {
    book.chapters.sort((a, b) => a.chapter - b.chapter);
    for (const chap of book.chapters) {
      chap.verses.sort((a, b) => a.verse - b.verse);
    }
  }
  return booksMap;
}

/**
 * Parses generic Bible data (nested object: Book -> Chapter -> Verse -> Text)
 * into the common ProcessedBookData structure.
 * Used for ESV, NIV, NRSV based on the provided format.
 */
function parseGenericBibleData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  const booksMap = new Map<string, ProcessedBookData>();

  for (const bookName in jsonData) {
    if (Object.prototype.hasOwnProperty.call(jsonData, bookName)) {
      const rawBookData = jsonData[bookName];
      const processedChapters: ProcessedChapterData[] = [];

      for (const chapterNumberStr in rawBookData) {
        if (Object.prototype.hasOwnProperty.call(rawBookData, chapterNumberStr)) {
          const rawChapterData = rawBookData[chapterNumberStr];
          const chapterNumber = parseInt(chapterNumberStr, 10);
          if (isNaN(chapterNumber)) {
            console.warn(`Skipping invalid chapter number: ${chapterNumberStr} in book ${bookName}`);
            continue;
          }

          const processedVerses: ProcessedVerseData[] = [];
          for (const verseNumberStr in rawChapterData) {
            if (Object.prototype.hasOwnProperty.call(rawChapterData, verseNumberStr)) {
              const verseText = rawChapterData[verseNumberStr];
              const verseNumber = parseInt(verseNumberStr, 10);
              if (isNaN(verseNumber)) {
                console.warn(`Skipping invalid verse number: ${verseNumberStr} in book ${bookName}, chapter ${chapterNumber}`);
                continue;
              }
              processedVerses.push({
                verse: verseNumber,
                text: verseText,
              });
            }
          }
          // Sort verses
          processedVerses.sort((a, b) => a.verse - b.verse);
          processedChapters.push({
            chapter: chapterNumber,
            verses: processedVerses,
          });
        }
      }
      // Sort chapters
      processedChapters.sort((a, b) => a.chapter - b.chapter);
      booksMap.set(bookName, {
        bookName: bookName,
        chapters: processedChapters,
      });
    }
  }
  return booksMap;
}

/**
 * Parser for ESV data. Calls the generic parser.
 */
function parseESVData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  console.log("Parsing ESV data...");
  return parseGenericBibleData(jsonData);
}

/**
 * Parser for NIV data. Calls the generic parser.
 */
function parseNIVData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  console.log("Parsing NIV data...");
  return parseGenericBibleData(jsonData);
}

/**
 * Parser for NRSV data. Calls the generic parser.
 */
function parseNRSVData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  console.log("Parsing NRSV data...");
  return parseGenericBibleData(jsonData);
}


/**
 * Loads and parses Bible data for a specific translation.
 * Caches the processed data.
 * @param translation The BibleTranslation to load.
 * @returns A promise that resolves to the Map of ProcessedBookData for the given translation.
 */
async function loadAndProcessBibleData(translation: BibleTranslation): Promise<Map<string, ProcessedBookData>> {
  if (processedBibleCache.has(translation)) {
    return processedBibleCache.get(translation)!;
  }
  if (bibleDataPromiseCache.has(translation)) {
    return bibleDataPromiseCache.get(translation)!;
  }

  const filePath = translationFileMap[translation];
  if (!filePath) {
    throw new Error(`No file path defined for translation: ${translation}`);
  }

  const promise = fetch(filePath)
    .then(response => {
      if (!response.ok) {
        let detailedErrorMessage = `Failed to fetch ${filePath} (Status: ${response.status}).`;
        if (response.statusText) {
          detailedErrorMessage += ` Message: ${response.statusText}.`;
        } else {
          detailedErrorMessage += ` (No status text from server).`;
        }
        detailedErrorMessage += ` Please ensure the file exists in the 'public' folder and is accessible.`;
        console.error(detailedErrorMessage); // Log it for server-side debugging too
        throw new Error(detailedErrorMessage);
      }
      return response.json();
    })
    .then((jsonData: any) => {
      let processedData: Map<string, ProcessedBookData>;
      
      if (translation === 'KJV') {
        let rawVersesKJV: KJVRawVerse[];
         if (Array.isArray(jsonData)) { // Handles direct array of verses
            rawVersesKJV = jsonData as KJVRawVerse[];
        } else if (jsonData && typeof jsonData === 'object' && jsonData !== null && 'verses' in jsonData && Array.isArray((jsonData as { verses: unknown }).verses)) { // Handles object with a 'verses' array property
            rawVersesKJV = (jsonData as { verses: KJVRawVerse[] }).verses;
        } else {
            console.error(`KJV JSON data (${filePath}) is not in the expected format. Expected an array of verses or an object with a 'verses' property. Received:`, jsonData);
            throw new Error(`KJV JSON data (${filePath}) has an unexpected root structure.`);
        }
        if (rawVersesKJV.length > 0) { // Basic validation of KJV verse structure
            const firstVerse = rawVersesKJV[0];
            if ( typeof firstVerse?.book_name !== 'string' || typeof firstVerse?.chapter !== 'number' || typeof firstVerse?.verse !== 'number' || typeof firstVerse?.text !== 'string') {
                console.error(`KJV JSON data (${filePath}) - first verse object has an unexpected structure. First verse:`, firstVerse);
                throw new Error(`KJV JSON data (${filePath}) has an unexpected verse structure.`);
            }
        }
        processedData = parseKJVData(rawVersesKJV);
      } else if (translation === 'ESV') {
        processedData = parseESVData(jsonData as GenericRawBibleData);
      } else if (translation === 'NIV') {
        processedData = parseNIVData(jsonData as GenericRawBibleData);
      } else if (translation === 'NRSV') {
        processedData = parseNRSVData(jsonData as GenericRawBibleData);
      } else {
        console.error(`Unsupported translation for parsing: ${translation}`);
        throw new Error(`Unsupported translation for parsing: ${translation}`);
      }
      
      if (processedData.size === 0) {
          console.warn(`Parsing for ${translation} from ${filePath} resulted in an empty dataset. Check the JSON file structure and the parsing logic for ${translation}.`);
      }

      processedBibleCache.set(translation, processedData);
      bibleDataPromiseCache.delete(translation); // Remove from promise cache once resolved
      return processedData;
    })
    .catch(error => {
      console.error(`Error loading or processing ${translation} Bible data from ${filePath}:`, error);
      bibleDataPromiseCache.delete(translation);
      processedBibleCache.delete(translation); // Ensure cache is cleared on error
      // Propagate a more specific error or a generic one
      throw new Error(`Could not load or parse Bible data for ${translation}. ${error.message}`);
    });

  bibleDataPromiseCache.set(translation, promise);
  return promise;
}


/**
 * Asynchronously retrieves a list of Bible books for a given translation.
 * @param translation The BibleTranslation to get books for.
 * @returns A promise that resolves to an array of BibleBook objects.
 */
export async function getBooks(translation: BibleTranslation): Promise<BibleBook[]> {
  const dataMap = await loadAndProcessBibleData(translation);
  if (dataMap.size === 0) {
      console.warn(`No books found for ${translation}. The data file might be empty or parsing failed to produce data.`);
      return []; // Return empty array if no data was processed
  }
  return Array.from(dataMap.values()).map((book) => ({
    id: book.bookName,
    name: book.bookName,
    chapterCount: book.chapters.length,
  }));
}

/**
 * Asynchronously retrieves the chapters for a given book and translation.
 * @param translation The BibleTranslation.
 * @param bookId The ID of the book (full book name, e.g., "Genesis").
 * @returns A promise that resolves to an array of BibleChapter objects.
 */
export async function getChaptersForBook(translation: BibleTranslation, bookId: string): Promise<BibleChapter[]> {
  const dataMap = await loadAndProcessBibleData(translation);
  const book = dataMap.get(bookId);
  if (!book) {
    if (dataMap.size === 0) { // Check if the entire dataset for the translation was empty
        console.warn(`Book "${bookId}" not found for ${translation}, and the dataset for this translation appears empty or unparsed.`);
        return [];
    }
    throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
  }
  return book.chapters.map(ch => ({
    id: ch.chapter,
    name: `Chapter ${ch.chapter}`,
  }));
}

/**
 * Asynchronously retrieves the formatted text for a specific Bible chapter and translation.
 * @param translation The BibleTranslation.
 * @param bookId The ID of the book (full book name).
 * @param chapterNumber The chapter number.
 * @returns A promise that resolves to a string containing the chapter text (HTML formatted).
 */
export async function getChapterText(translation: BibleTranslation, bookId: string, chapterNumber: number): Promise<string> {
  const dataMap = await loadAndProcessBibleData(translation);
  const book = dataMap.get(bookId);

  if (!book) {
    if (dataMap.size === 0) {
        return `<p>Chapter data for ${bookId} ${chapterNumber} (${translation}) is currently unavailable. The data file might be empty or parsing for ${translation} failed to produce data.</p>`;
    }
    throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
  }

  const chapterData = book.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
     if (book.chapters.length === 0 && dataMap.size > 0) { // Book exists but has no chapters after parsing
        return `<p>No chapters found for ${bookId} (${translation}) after parsing. Check data integrity for this book.</p>`;
    }
    throw new Error(`Chapter ${chapterNumber} not found in ${book.bookName} (${translation} translation).`);
  }
  if (chapterData.verses.length === 0) {
     return `<p class="text-center py-4">No verses found for ${bookId} ${chapterNumber} (${translation}). This might indicate an empty chapter in the data file or a parsing issue.</p>`;
  }

  let formattedText = `<h3 class="text-lg font-semibold mb-2">${book.bookName} - Chapter ${chapterNumber} (${translation})</h3>\n`;
  formattedText += chapterData.verses.map(v => `<p class="mb-1"><strong class="mr-1">${v.verse}</strong>${v.text.replace(/^\s*¶\s*/, '')}</p>`).join('\n');
  return formattedText;
}

/**
 * Asynchronously retrieves a specific Bible verse for a given translation from the processed data.
 * @param translation The BibleTranslation.
 * @param bookName The name of the book (e.g., "Genesis").
 * @param chapterNumber The chapter number.
 * @param verseNumber The verse number.
 * @returns A promise that resolves to a Verse object or null if not found.
 */
export async function getVerse(translation: BibleTranslation, bookName: string, chapterNumber: number, verseNumber: number): Promise<Verse | null> {
  const dataMap = await loadAndProcessBibleData(translation);
  const bookData = dataMap.get(bookName);
  if (!bookData) {
    console.warn(`Book not found in ${translation} data: ${bookName}. The data file might be missing this book or parsing failed for this book.`);
    return null;
  }

  const chapterData = bookData.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
    console.warn(`Chapter ${chapterNumber} not found in ${bookName} (${translation} data).`);
    return null;
  }

  const verseData = chapterData.verses.find(v => v.verse === verseNumber);
  if (!verseData) {
    console.warn(`Verse ${verseNumber} not found in ${bookName} ${chapterNumber} (${translation} data).`);
    return null;
  }

  return {
    book: bookName,
    chapter: chapterNumber,
    verse: verseNumber,
    text: verseData.text,
    translationContext: translation, // Ensure this is set
  };
}

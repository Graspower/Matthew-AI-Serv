
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
function parseGenericBibleData(jsonData: GenericRawBibleData, translation: BibleTranslation): Map<string, ProcessedBookData> {
  const booksMap = new Map<string, ProcessedBookData>();
  console.log(`Starting to parse generic data for ${translation}`);

  for (const bookName in jsonData) {
    if (Object.prototype.hasOwnProperty.call(jsonData, bookName)) {
      const rawBookData = jsonData[bookName];
      const processedChapters: ProcessedChapterData[] = [];

      if (typeof rawBookData !== 'object' || rawBookData === null) {
        console.warn(`[${translation}] Skipping book "${bookName}" as its data is not an object.`);
        continue;
      }

      for (const chapterNumberStr in rawBookData) {
        if (Object.prototype.hasOwnProperty.call(rawBookData, chapterNumberStr)) {
          const rawChapterData = rawBookData[chapterNumberStr];
          const chapterNumber = parseInt(chapterNumberStr, 10);
          if (isNaN(chapterNumber)) {
            console.warn(`[${translation}] Skipping invalid chapter number: ${chapterNumberStr} in book ${bookName}`);
            continue;
          }

          if (typeof rawChapterData !== 'object' || rawChapterData === null) {
             console.warn(`[${translation}] Skipping chapter ${chapterNumberStr} in book "${bookName}" as its data is not an object.`);
             continue;
          }

          const processedVerses: ProcessedVerseData[] = [];
          for (const verseNumberStr in rawChapterData) {
            if (Object.prototype.hasOwnProperty.call(rawChapterData, verseNumberStr)) {
              const verseText = rawChapterData[verseNumberStr];
              const verseNumber = parseInt(verseNumberStr, 10);
              if (isNaN(verseNumber)) {
                console.warn(`[${translation}] Skipping invalid verse number: ${verseNumberStr} in book ${bookName}, chapter ${chapterNumber}`);
                continue;
              }
              if (typeof verseText !== 'string') {
                console.warn(`[${translation}] Skipping verse ${verseNumberStr} in book ${bookName}, chapter ${chapterNumber} as its text is not a string.`);
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
  if (booksMap.size === 0) {
    console.warn(`[${translation}] parseGenericBibleData resulted in an empty map. Original JSON data might have been empty or had an unexpected top-level structure.`);
  } else {
    console.log(`[${translation}] Successfully parsed ${booksMap.size} books using generic parser.`);
  }
  return booksMap;
}

/**
 * Parser for ESV data. Calls the generic parser.
 */
function parseESVData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  console.log("Attempting to parse ESV data using generic parser...");
  return parseGenericBibleData(jsonData, 'ESV');
}

/**
 * Parser for NIV data. Calls the generic parser.
 */
function parseNIVData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  console.log("Attempting to parse NIV data using generic parser...");
  return parseGenericBibleData(jsonData, 'NIV');
}

/**
 * Parser for NRSV data. Calls the generic parser.
 */
function parseNRSVData(jsonData: GenericRawBibleData): Map<string, ProcessedBookData> {
  console.log("Attempting to parse NRSV data using generic parser...");
  return parseGenericBibleData(jsonData, 'NRSV');
}


/**
 * Loads and parses Bible data for a specific translation.
 * Caches the processed data.
 * @param translation The BibleTranslation to load.
 * @returns A promise that resolves to the Map of ProcessedBookData for the given translation.
 */
async function loadAndProcessBibleData(translation: BibleTranslation): Promise<Map<string, ProcessedBookData>> {
  if (processedBibleCache.has(translation)) {
    const cachedData = processedBibleCache.get(translation)!;
    if (cachedData.size > 0) { // Only return from cache if it's not empty, forcing a re-fetch/parse if previous attempt was empty
        console.log(`Returning cached data for ${translation}.`);
        return cachedData;
    } else {
        console.log(`Cached data for ${translation} was empty, attempting to re-fetch and parse.`);
    }
  }
  if (bibleDataPromiseCache.has(translation)) {
    console.log(`Waiting for existing promise to resolve for ${translation}.`);
    return bibleDataPromiseCache.get(translation)!;
  }

  const filePath = translationFileMap[translation];
  if (!filePath) {
    throw new Error(`No file path defined for translation: ${translation}`);
  }
  console.log(`Fetching and processing ${translation} Bible data from ${filePath}...`);

  const promise = fetch(filePath)
    .then(response => {
      if (!response.ok) {
        let detailedErrorMessage = `ERROR FETCHING BIBLE DATA: Failed to fetch '${filePath}' (HTTP Status: ${response.status}).`;
        if (response.statusText) {
          detailedErrorMessage += ` Server message: '${response.statusText}'.`;
        } else {
          detailedErrorMessage += ` (No specific status text from server).`;
        }
        detailedErrorMessage += `\n\nTROUBLESHOOTING:\n1. Verify that the file '${filePath.substring(1)}' (e.g., '${filePath.substring(1).split('/').pop()}') is located directly inside the 'public' folder of your project.\n2. Check for exact filename match (case-sensitive, correct extension .json).\n3. Ensure your development server has picked up the file (a restart might be needed if recently added).\n`;
        console.error(detailedErrorMessage);
        throw new Error(detailedErrorMessage);
      }
      return response.json();
    })
    .then((jsonData: any) => {
      let processedData: Map<string, ProcessedBookData>;
      
      if (translation === 'KJV') {
        let rawVersesKJV: KJVRawVerse[];
         if (Array.isArray(jsonData)) {
            rawVersesKJV = jsonData as KJVRawVerse[];
        } else if (jsonData && typeof jsonData === 'object' && jsonData !== null && 'verses' in jsonData && Array.isArray((jsonData as { verses: unknown }).verses)) { 
            rawVersesKJV = (jsonData as { verses: KJVRawVerse[] }).verses;
        } else {
            console.error(`[KJV] JSON data (${filePath}) is not in the expected format. Expected an array of verses or an object with a 'verses' property. Received:`, jsonData);
            throw new Error(`[KJV] JSON data (${filePath}) has an unexpected root structure.`);
        }
        if (rawVersesKJV.length > 0) { 
            const firstVerse = rawVersesKJV[0];
            if ( typeof firstVerse?.book_name !== 'string' || typeof firstVerse?.chapter !== 'number' || typeof firstVerse?.verse !== 'number' || typeof firstVerse?.text !== 'string') {
                console.error(`[KJV] JSON data (${filePath}) - first verse object has an unexpected structure. First verse:`, firstVerse);
                throw new Error(`[KJV] JSON data (${filePath}) has an unexpected verse structure.`);
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
      } else {
          console.log(`Successfully processed ${translation} data from ${filePath}. ${processedData.size} books loaded.`);
      }

      processedBibleCache.set(translation, processedData);
      bibleDataPromiseCache.delete(translation);
      return processedData;
    })
    .catch(error => {
      console.error(`Critical error loading or processing ${translation} Bible data from ${filePath}:`, error.message);
      bibleDataPromiseCache.delete(translation);
      processedBibleCache.delete(translation); 
      throw new Error(`Could not load or parse Bible data for ${translation}. Original error: ${error.message}`);
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
      console.warn(`No books found for ${translation}. The data file might be empty, parsing failed, or the file was not found.`);
      return [];
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
    if (dataMap.size === 0) { 
        console.warn(`Book "${bookId}" not found for ${translation}, and the dataset for this translation appears empty or unparsed.`);
        return [];
    }
    throw new Error(`Book not found: ${bookId} in ${translation} translation. Available books: ${Array.from(dataMap.keys()).join(', ')}`);
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
 * @param highlightVerse The verse number to highlight.
 * @returns A promise that resolves to a string containing the chapter text (HTML formatted).
 */
export async function getChapterText(translation: BibleTranslation, bookId: string, chapterNumber: number, highlightVerse?: number | null): Promise<string> {
  const dataMap = await loadAndProcessBibleData(translation);
  const book = dataMap.get(bookId);

  if (!book) {
    if (dataMap.size === 0) {
        return `<p>Chapter data for ${bookId} ${chapterNumber} (${translation}) is currently unavailable. The data file might be empty, not found, or parsing for ${translation} failed to produce data.</p>`;
    }
    throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
  }

  const chapterData = book.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
     if (book.chapters.length === 0 && dataMap.size > 0) {
        return `<p>No chapters found for ${bookId} (${translation}) after parsing. Check data integrity for this book.</p>`;
    }
    throw new Error(`Chapter ${chapterNumber} not found in ${book.bookName} (${translation} translation).`);
  }
  if (chapterData.verses.length === 0) {
     return `<p class="text-center py-4">No verses found for ${bookId} ${chapterNumber} (${translation}). This might indicate an empty chapter in the data file or a parsing issue.</p>`;
  }

  let formattedText = `<h3 class="text-lg font-semibold mb-2">${book.bookName} - Chapter ${chapterNumber} (${translation})</h3>\n`;
  formattedText += chapterData.verses.map(v => 
    `<p class="mb-1 transition-colors duration-300 ${v.verse === highlightVerse ? 'bg-accent/30 rounded-md p-2' : 'p-2'}" ${v.verse === highlightVerse ? 'id="highlighted-verse"' : ''}>` +
    `<strong class="mr-1">${v.verse}</strong>${v.text.replace(/^\s*¶\s*/, '')}</p>`
  ).join('\n');
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
    console.warn(`Book not found in ${translation} data: ${bookName}. The data file might be missing this book, not found, or parsing failed for this book.`);
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
    translationContext: translation, 
  };
}


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

// --- Generic Raw Data Structures (example for KJV, adapt for others) ---
interface RawVerseBase {
  book_name: string; // Common field used for KJV, adapt if different for others
  chapter: number;
  verse: number;
  text: string;
}

// --- Internal Processed Data Structures ---
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
 * Parses KJV-specific raw verse data into the common ProcessedBookData structure.
 */
function parseKJVData(rawVerses: RawVerseBase[]): Map<string, ProcessedBookData> {
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
 * Placeholder parser for ESV data.
 * YOU MUST IMPLEMENT THIS based on the structure of your esv-bible.json.
 * It should take the raw JSON data from esv-bible.json and transform it
 * into a Map<string, ProcessedBookData> similar to what parseKJVData does.
 */
function parseESVData(jsonData: any): Map<string, ProcessedBookData> {
  console.warn("ESV parsing not implemented. Using dummy data for ESV. Please implement parseESVData in src/services/bible.ts");
  // TODO: Implement actual ESV parsing logic here.
  // Example: Assuming ESV JSON is an array of objects like: { book: "Genesis", chapter: 1, verse: 1, text: "..." }
  // const rawVerses: RawVerseBase[] = jsonData.map((item: any) => ({
  //   book_name: item.book,
  //   chapter: item.chapter,
  //   verse: item.verse,
  //   text: item.text,
  // }));
  // return parseKJVData(rawVerses); // Or a more direct conversion to ProcessedBookData
  return new Map<string, ProcessedBookData>(); // Return empty map as placeholder
}

/**
 * Placeholder parser for NIV data.
 * YOU MUST IMPLEMENT THIS based on the structure of your niv-bible.json.
 */
function parseNIVData(jsonData: any): Map<string, ProcessedBookData> {
  console.warn("NIV parsing not implemented. Using dummy data for NIV. Please implement parseNIVData in src/services/bible.ts");
  // TODO: Implement actual NIV parsing logic here.
  return new Map<string, ProcessedBookData>();
}

/**
 * Placeholder parser for NRSV data.
 * YOU MUST IMPLEMENT THIS based on the structure of your nrsv-bible.json.
 */
function parseNRSVData(jsonData: any): Map<string, ProcessedBookData> {
  console.warn("NRSV parsing not implemented. Using dummy data for NRSV. Please implement parseNRSVData in src/services/bible.ts");
  // TODO: Implement actual NRSV parsing logic here.
  return new Map<string, ProcessedBookData>();
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
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}. Ensure the file exists in the 'public' folder.`);
      }
      return response.json();
    })
    .then((jsonData: any) => {
      let processedData: Map<string, ProcessedBookData>;
      // Validate top-level structure for KJV, others will need their own validation in their parsers
      if (translation === 'KJV') {
        let rawVersesKJV: RawVerseBase[];
         if (Array.isArray(jsonData)) {
            rawVersesKJV = jsonData as RawVerseBase[];
        } else if (jsonData && typeof jsonData === 'object' && jsonData !== null && 'verses' in jsonData && Array.isArray((jsonData as { verses: unknown }).verses)) {
            rawVersesKJV = (jsonData as { verses: RawVerseBase[] }).verses;
        } else {
            console.error(`KJV JSON data (${filePath}) is not in the expected format. Expected an array of verses or an object with a 'verses' property. Received:`, jsonData);
            throw new Error(`KJV JSON data (${filePath}) has an unexpected root structure.`);
        }
        if (rawVersesKJV.length > 0) {
            const firstVerse = rawVersesKJV[0];
            if ( typeof firstVerse?.book_name !== 'string' || typeof firstVerse?.chapter !== 'number' || typeof firstVerse?.verse !== 'number' || typeof firstVerse?.text !== 'string') {
                console.error(`KJV JSON data (${filePath}) - first verse object has an unexpected structure. First verse:`, firstVerse);
                throw new Error(`KJV JSON data (${filePath}) has an unexpected verse structure.`);
            }
        }
        processedData = parseKJVData(rawVersesKJV);
      } else if (translation === 'ESV') {
        processedData = parseESVData(jsonData); // YOU WILL NEED TO IMPLEMENT parseESVData
      } else if (translation === 'NIV') {
        processedData = parseNIVData(jsonData); // YOU WILL NEED TO IMPLEMENT parseNIVData
      } else if (translation === 'NRSV') {
        processedData = parseNRSVData(jsonData); // YOU WILL NEED TO IMPLEMENT parseNRSVData
      } else {
        throw new Error(`Unsupported translation for parsing: ${translation}`);
      }
      
      processedBibleCache.set(translation, processedData);
      return processedData;
    })
    .catch(error => {
      console.error(`Error loading or processing ${translation} Bible data from ${filePath}:`, error);
      bibleDataPromiseCache.delete(translation);
      processedBibleCache.delete(translation);
      throw new Error(`Could not load Bible data for ${translation}. ${error.message}`);
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
  if (dataMap.size === 0 && (translation === 'ESV' || translation === 'NIV' || translation === 'NRSV')) {
      console.warn(`No books found for ${translation}. This might be because its parsing function (e.g., parse${translation}Data) is not yet implemented or returned empty data.`);
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
    // Provide a more graceful fallback if parsing for this translation is not yet complete
    if (dataMap.size === 0 && (translation === 'ESV' || translation === 'NIV' || translation === 'NRSV')) {
        console.warn(`Book "${bookId}" not found for ${translation}, and parsing for this translation might be incomplete.`);
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
    if (dataMap.size === 0 && (translation === 'ESV' || translation === 'NIV' || translation === 'NRSV')) {
        return `<p>Chapter data for ${bookId} ${chapterNumber} (${translation}) is currently unavailable. The parsing logic for ${translation} might need to be implemented in src/services/bible.ts.</p>`;
    }
    throw new Error(`Book not found: ${bookId} in ${translation} translation.`);
  }

  const chapterData = book.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
     if (dataMap.size === 0 && (translation === 'ESV' || translation === 'NIV' || translation === 'NRSV')) {
        return `<p>Chapter data for ${bookId} ${chapterNumber} (${translation}) is currently unavailable. The parsing logic for ${translation} might need to be implemented in src/services/bible.ts.</p>`;
    }
    throw new Error(`Chapter ${chapterNumber} not found in ${book.bookName} (${translation} translation).`);
  }
  if (chapterData.verses.length === 0 && (translation === 'ESV' || translation === 'NIV' || translation === 'NRSV')) {
     return `<p>No verses found for ${bookId} ${chapterNumber} (${translation}). This might indicate incomplete parsing for ${translation}.</p>`;
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
    console.warn(`Book not found in ${translation} data: ${bookName}. Parsing for ${translation} might be incomplete.`);
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

    

/**
 * Represents a Bible verse for AI search results.
 */
export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  // Optional fields to track context for UI updates, not from kjv-bible.json
  languageContext?: string; 
  translationContext?: string;
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

// --- KJV JSON Specific Interfaces ---

// Structure of each object in the flat kjv-bible.json array
interface KJVRawVerse {
  book_name: string;
  book: number; // Book number (e.g., 1 for Genesis), currently not used by reader logic
  chapter: number;
  verse: number;
  text: string;
}

// Internal processed structure for verses
interface KJVInternalVerse {
  verse: number;
  text: string;
}

// Internal processed structure for chapters
interface KJVInternalChapterData {
  chapter: number;
  verses: KJVInternalVerse[];
}

// Internal processed structure for books
interface KJVInternalBookData {
  bookName: string;
  chapters: KJVInternalChapterData[];
}
// --- End KJV JSON Specific Interfaces ---

let processedBibleData: Map<string, KJVInternalBookData> | null = null;
let bibleDataPromise: Promise<Map<string, KJVInternalBookData>> | null = null;

/**
 * Loads and parses the KJV Bible data from public/kjv-bible.json.
 * Expects either a flat array of KJVRawVerse objects, or an object with a "verses" key holding such an array.
 * Processes it into an internal nested Map structure and caches it.
 * @returns A promise that resolves to the Map of processed KJVInternalBookData.
 */
async function loadAndProcessKJVData(): Promise<Map<string, KJVInternalBookData>> {
  if (processedBibleData) {
    return processedBibleData;
  }
  if (bibleDataPromise) {
    return bibleDataPromise;
  }

  bibleDataPromise = fetch('/kjv-bible.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch kjv-bible.json: ${response.statusText}. Ensure the file exists in the 'public' folder at the project root.`);
      }
      return response.json();
    })
    .then((jsonData: unknown) => { 
      let rawVerses: KJVRawVerse[];

      if (Array.isArray(jsonData)) {
        rawVerses = jsonData as KJVRawVerse[];
      } else if (jsonData && typeof jsonData === 'object' && jsonData !== null && 'verses' in jsonData && Array.isArray((jsonData as { verses: unknown }).verses)) {
        rawVerses = (jsonData as { verses: KJVRawVerse[] }).verses;
      } else {
        console.error("KJV JSON data (public/kjv-bible.json) is not in the expected format. Expected an array of verses or an object with a 'verses' property containing an array of verses. Received:", jsonData);
        throw new Error("KJV JSON data (public/kjv-bible.json) has an unexpected root structure. Please ensure it's either a direct array of verse objects or an object with a 'verses' key holding this array.");
      }
      
      if (rawVerses.length === 0) {
        console.warn("KJV JSON data (public/kjv-bible.json) resulted in an empty list of verses. The 'verses' array in your JSON might be empty, or the file itself might represent an empty list.");
      } else {
          const firstVerse = rawVerses[0];
          if (
            typeof firstVerse?.book_name !== 'string' ||
            typeof firstVerse?.chapter !== 'number' ||
            typeof firstVerse?.verse !== 'number' ||
            typeof firstVerse?.text !== 'string'
          ) {
            console.error("KJV JSON data (public/kjv-bible.json) - first verse object has an unexpected structure. First verse object found:", firstVerse);
            throw new Error("KJV JSON data (public/kjv-bible.json) has an unexpected verse structure. Expected format for each verse: 'book_name' (string), 'chapter' (number), 'verse' (number), 'text' (string). Please verify the file format and check console for details on the first verse object found.");
          }
      }


      const booksMap = new Map<string, KJVInternalBookData>();

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

      for (const book of booksMap.values()) {
        book.chapters.sort((a, b) => a.chapter - b.chapter);
        for (const chap of book.chapters) {
          chap.verses.sort((a, b) => a.verse - b.verse);
        }
      }
      
      processedBibleData = booksMap;
      return booksMap;
    })
    .catch(error => {
      console.error("Error loading or processing KJV Bible data from public/kjv-bible.json:", error);
      bibleDataPromise = null; 
      processedBibleData = null;
      throw new Error(`Could not load Bible data. ${error.message}`);
    });
  return bibleDataPromise;
}


/**
 * Asynchronously retrieves a list of Bible books from the processed KJV JSON data.
 * @returns A promise that resolves to an array of BibleBook objects.
 */
export async function getBooks(): Promise<BibleBook[]> {
  const dataMap = await loadAndProcessKJVData();
  return Array.from(dataMap.values()).map((book) => ({
    id: book.bookName,
    name: book.bookName,
    chapterCount: book.chapters.length,
  }));
}

/**
 * Asynchronously retrieves the chapters for a given book from the processed KJV JSON data.
 * @param bookId The ID of the book (full book name, e.g., "Genesis").
 * @returns A promise that resolves to an array of BibleChapter objects.
 */
export async function getChaptersForBook(bookId: string): Promise<BibleChapter[]> {
  const dataMap = await loadAndProcessKJVData();
  const book = dataMap.get(bookId);
  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }
  return book.chapters.map(ch => ({
    id: ch.chapter,
    name: `Chapter ${ch.chapter}`,
  }));
}

/**
 * Asynchronously retrieves the formatted text for a specific Bible chapter from processed KJV JSON data.
 * @param bookId The ID of the book (full book name).
 * @param chapterNumber The chapter number.
 * @returns A promise that resolves to a string containing the chapter text (HTML formatted).
 */
export async function getChapterText(bookId: string, chapterNumber: number): Promise<string> {
  const dataMap = await loadAndProcessKJVData();
  const book = dataMap.get(bookId);

  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  const chapterData = book.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
    throw new Error(`Chapter ${chapterNumber} not found in ${book.bookName}`);
  }

  let formattedText = `<h3 class="text-lg font-semibold mb-2">${book.bookName} - Chapter ${chapterNumber}</h3>\n`;
  formattedText += chapterData.verses.map(v => `<p class="mb-1"><strong class="mr-1">${v.verse}</strong>${v.text.replace(/^\s*¶\s*/, '')}</p>`).join('\n');
  return formattedText;
}

/**
 * Asynchronously retrieves a specific Bible verse (KJV) from the processed data.
 * @param bookName The name of the book (e.g., "Genesis").
 * @param chapterNumber The chapter number.
 * @param verseNumber The verse number.
 * @returns A promise that resolves to a Verse object (including KJV text) or null if not found.
 */
export async function getVerse(bookName: string, chapterNumber: number, verseNumber: number): Promise<Verse | null> {
  const dataMap = await loadAndProcessKJVData();
  const bookData = dataMap.get(bookName);
  if (!bookData) {
    console.warn(`Book not found in KJV data: ${bookName}`);
    return null;
  }

  const chapterData = bookData.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
    console.warn(`Chapter ${chapterNumber} not found in ${bookName} (KJV data)`);
    return null;
  }

  const verseData = chapterData.verses.find(v => v.verse === verseNumber);
  if (!verseData) {
    console.warn(`Verse ${verseNumber} not found in ${bookName} ${chapterNumber} (KJV data)`);
    return null;
  }

  return {
    book: bookName,
    chapter: chapterNumber,
    verse: verseNumber,
    text: verseData.text,
    // These fields are not part of kjv-bible.json but can be added by consuming components
    // languageContext: undefined, 
    // translationContext: undefined,
  };
}


/**
 * Represents a Bible verse for AI search results.
 */
export interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/**
 * Represents a Bible book for the Bible Reader.
 */
export interface BibleBook {
  id: string; // Will use the full book name as ID, e.g., "Genesis"
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

// --- KJV JSON Specific Interfaces (internal to this module) ---
interface KJVVerse {
  verse: number;
  text: string;
}

interface KJVChapterData {
  chapter: number;
  verses: KJVVerse[];
}

interface KJVBookData {
  book: string; // Full book name, e.g., "Genesis"
  abbrev?: string; // Optional abbreviation
  chapters: KJVChapterData[];
}
// --- End KJV JSON Specific Interfaces ---

let loadedBibleData: KJVBookData[] | null = null;
let bibleDataPromise: Promise<KJVBookData[]> | null = null;

/**
 * Loads and parses the KJV Bible data from public/kjv-bible.json.
 * Caches the data in memory to avoid re-fetching.
 * @returns A promise that resolves to the array of KJVBookData.
 */
async function loadKJVData(): Promise<KJVBookData[]> {
  if (loadedBibleData) {
    return loadedBibleData;
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
    .then((data: KJVBookData[]) => {
      // Basic validation of the data structure by checking the first book, chapter, and verse.
      if (
        !Array.isArray(data) ||
        data.length === 0 ||
        typeof data[0]?.book !== 'string' ||
        !Array.isArray(data[0]?.chapters) ||
        data[0]?.chapters.length === 0 ||
        typeof data[0]?.chapters[0]?.chapter !== 'number' ||
        !Array.isArray(data[0]?.chapters[0]?.verses) ||
        data[0]?.chapters[0]?.verses.length === 0 ||
        typeof data[0]?.chapters[0]?.verses[0]?.verse !== 'number' ||
        typeof data[0]?.chapters[0]?.verses[0]?.text !== 'string'
      ) {
        console.error("KJV JSON data (public/kjv-bible.json) does not match expected structure. First book data:", data[0]);
        throw new Error("KJV JSON data (public/kjv-bible.json) has an unexpected structure. Expected format: Array of books, each with 'book' (string), 'chapters' (array of chapter objects). Each chapter object with 'chapter' (number), 'verses' (array of verse objects). Each verse object with 'verse' (number), 'text' (string). Please verify the file format and check console for details on the first book found.");
      }
      loadedBibleData = data;
      return data;
    })
    .catch(error => {
      console.error("Error loading or parsing KJV Bible data from public/kjv-bible.json:", error);
      bibleDataPromise = null; // Reset promise so it can be retried if needed
      loadedBibleData = null;
      throw new Error(`Could not load Bible data. ${error.message}`);
    });
  return bibleDataPromise;
}


/**
 * Asynchronously retrieves Bible verses based on a query (for AI search).
 * This function is used by the AI teaching feature and is separate from KJV data loading.
 * @param query The search query for Bible verses.
 * @returns A promise that resolves to an array of Verse objects.
 */
export async function searchVerses(query: string): Promise<Verse[]> {
  console.log(`Searching verses for query (AI): ${query}`);
  // This function remains for the AI teaching feature.
  // Actual implementation involves an AI call.
  return [];
}

/**
 * Asynchronously retrieves a list of Bible books from the KJV JSON.
 * @returns A promise that resolves to an array of BibleBook objects.
 */
export async function getBooks(): Promise<BibleBook[]> {
  const data = await loadKJVData();
  return data.map((book) => ({
    id: book.book, // Using the full book name as a unique ID
    name: book.book,
    chapterCount: book.chapters.length,
  }));
}

/**
 * Asynchronously retrieves the chapters for a given book from the KJV JSON.
 * @param bookId The ID of the book (full book name, e.g., "Genesis").
 * @returns A promise that resolves to an array of BibleChapter objects.
 */
export async function getChaptersForBook(bookId: string): Promise<BibleChapter[]> {
  const data = await loadKJVData();
  const book = data.find(b => b.book === bookId);
  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }
  return book.chapters.map(ch => ({
    id: ch.chapter,
    name: `Chapter ${ch.chapter}`,
  }));
}

/**
 * Asynchronously retrieves the formatted text for a specific Bible chapter from KJV JSON.
 * @param bookId The ID of the book (full book name).
 * @param chapterNumber The chapter number.
 * @returns A promise that resolves to a string containing the chapter text (HTML formatted).
 */
export async function getChapterText(bookId: string, chapterNumber: number): Promise<string> {
  const data = await loadKJVData();
  const book = data.find(b => b.book === bookId);

  if (!book) {
    throw new Error(`Book not found: ${bookId}`);
  }

  const chapterData = book.chapters.find(ch => ch.chapter === chapterNumber);
  if (!chapterData) {
    throw new Error(`Chapter ${chapterNumber} not found in ${book.book}`);
  }

  let formattedText = `<h3 class="text-lg font-semibold mb-2">${book.book} - Chapter ${chapterNumber}</h3>\n`;
  formattedText += chapterData.verses.map(v => `<p class="mb-1"><strong class="mr-1">${v.verse}</strong>${v.text}</p>`).join('\n');
  return formattedText;
}

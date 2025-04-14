/**
 * Represents a Bible verse.
 */
export interface Verse {
  /**
   * The book of the Bible the verse is from.
   */
  book: string;
  /**
   * The chapter of the Bible the verse is from.
   */
  chapter: number;
  /**
   * The verse number.
   */
  verse: number;
  /**
   * The text of the verse.
   */
  text: string;
}

const bibleVerses: Verse[] = [
    {
        book: 'John',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
    },
    {
        book: 'Psalm',
        chapter: 23,
        verse: 1,
        text: 'The Lord is my shepherd; I shall not want.',
    },
    {
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning, God created the heavens and the earth.',
    },
    {
        book: 'Romans',
        chapter: 8,
        verse: 28,
        text: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.',
    },
    {
      book: 'Matthew',
      chapter: 2,
      verse: 1,
      text: 'Now after Jesus was born in Bethlehem of Judea in the days of Herod the king, behold, wise men from the east came to Jerusalem',
    }
];

/**
 * Asynchronously retrieves Bible verses based on a query.
 *
 * @param query The search query for Bible verses.
 * @returns A promise that resolves to an array of Verse objects.
 */
export async function searchVerses(query: string): Promise<Verse[]> {
  // Attempt to extract the book, chapter, and verse from the query
  const match = query.match(/(\w+)\s+(\d+):(\d+)/);

  if (match) {
      const book = match[1];
      const chapter = parseInt(match[2]);
      const verse = parseInt(match[3]);

      // Search for the specific verse
      const specificVerse = bibleVerses.find(
          (v) => v.book === book && v.chapter === chapter && v.verse === verse
      );

      if (specificVerse) {
          return [specificVerse];
      } else {
          return [{
            book: 'Verse Not',
            chapter: 0,
            verse: 0,
            text: 'No matching verse found',
          },]; // Verse not found
      }
  }
  else {
      return bibleVerses; // If the verse does not exist, return all verses
  }
}

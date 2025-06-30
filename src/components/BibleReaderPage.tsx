
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getChapterText, getBooks, getChaptersForBook, type BibleBook, type BibleChapter, type Verse } from '@/services/bible';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useSettings, type BibleTranslation } from '@/contexts/SettingsContext';
import { SearchForm } from '@/components/SearchForm';

interface BibleReaderPageProps {
  verseToRead: Verse | null;
  onReadComplete: () => void;
}

export function BibleReaderPage({ verseToRead, onReadComplete }: BibleReaderPageProps) {
  const { bibleTranslation, setBibleTranslation } = useSettings();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterText, setChapterText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  const chapterScrollAreaRef = useRef<HTMLDivElement>(null);

  const handleVerseSelect = useCallback((verse: Verse) => {
    // If verse is from a different translation, offer to switch
    if (verse.translationContext && verse.translationContext !== bibleTranslation) {
      if (window.confirm(`This verse is from the ${verse.translationContext} translation. Do you want to switch to ${verse.translationContext} to read it?`)) {
        setBibleTranslation(verse.translationContext);
      } else {
        // If user declines, we still navigate but it might not be a perfect match
      }
    }
    setSelectedBook(verse.book);
    setSelectedChapter(verse.chapter);
    setHighlightedVerse(verse.verse);
  }, [bibleTranslation, setBibleTranslation]);

  // Handle verseToRead prop from other tabs
  useEffect(() => {
    if (verseToRead) {
      handleVerseSelect(verseToRead);
      onReadComplete();
    }
  }, [verseToRead, onReadComplete, handleVerseSelect]);
  

  useEffect(() => {
    async function fetchBooksForTranslation() {
      setIsLoading(true);
      setError(null);
      setBooks([]); // Clear previous books
      
      // Don't reset selection if the book still exists in the new translation
      const currentBookStillExists = books.some(b => b.id === selectedBook);
      if (!currentBookStillExists) {
        setSelectedBook(null); 
        setChapters([]); 
        setSelectedChapter(null);
        setChapterText(null);
      }

      try {
        const fetchedBooks = await getBooks(bibleTranslation);
        setBooks(fetchedBooks);
        if (fetchedBooks.length === 0 && (bibleTranslation === 'ESV' || bibleTranslation === 'NIV' || bibleTranslation === 'NRSV')) {
             console.warn(`No books loaded for ${bibleTranslation}. This might be due to its parsing function not being fully implemented in src/services/bible.ts.`);
             setError(`Book list for ${bibleTranslation} is currently unavailable. Parsing logic might be pending.`);
        }
      } catch (err: any) {
        setError(`Failed to load Bible books for ${bibleTranslation}: ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooksForTranslation();
  }, [bibleTranslation]);

  useEffect(() => {
    async function fetchChaptersForBookAndTranslation() {
      if (selectedBook) {
        setIsLoading(true);
        setError(null);
        setChapters([]); // Clear previous chapters
        // Don't reset chapter selection if it's still valid
        try {
          const fetchedChapters = await getChaptersForBook(bibleTranslation, selectedBook);
          setChapters(fetchedChapters);
          const chapterStillExists = fetchedChapters.some(c => c.id === selectedChapter);
          if (!chapterStillExists) {
              setSelectedChapter(null);
              setChapterText(null);
          }
           if (fetchedChapters.length === 0 && (bibleTranslation === 'ESV' || bibleTranslation === 'NIV' || bibleTranslation === 'NRSV')) {
             console.warn(`No chapters loaded for ${selectedBook} in ${bibleTranslation}. This might be due to its parsing function not being fully implemented.`);
          }
        } catch (err: any) {
          setError(`Failed to load chapters for ${selectedBook} (${bibleTranslation}): ${err.message}`);
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setChapters([]);
        setSelectedChapter(null);
        setChapterText(null);
      }
    }
    fetchChaptersForBookAndTranslation();
  }, [selectedBook, bibleTranslation]);

  const loadChapterContent = useCallback(async (book: string, chapter: number, verseToHighlight: number | null) => {
      setIsLoading(true);
      setError(null);
      setChapterText(null);
      try {
        const text = await getChapterText(translation, book, chapter, verseToHighlight);
        setChapterText(text);
      } catch (err: any) {
        setError(`Failed to load ${book} chapter ${chapter} (${translation}): ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
  }, [bibleTranslation]);

  useEffect(() => {
    if (selectedBook && selectedChapter !== null) {
      loadChapterContent(selectedBook, selectedChapter, highlightedVerse);
    }
  }, [selectedBook, selectedChapter, highlightedVerse, loadChapterContent]);

  // Scroll to highlighted verse effect
  useEffect(() => {
    if (chapterText && highlightedVerse) {
        const highlightElement = document.getElementById('highlighted-verse');
        if (highlightElement) {
            highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // De-highlight after a moment to allow for re-highlighting the same verse
            setTimeout(() => {
                setHighlightedVerse(null);
            }, 2000);
        }
    }
  }, [chapterText, highlightedVerse]);


  const handlePreviousChapter = () => {
    if (!selectedBook || selectedChapter === null || chapters.length === 0) return;
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter);
    if (currentIndex > 0) {
      setSelectedChapter(chapters[currentIndex - 1].id);
      setHighlightedVerse(null);
    }
  };

  const handleNextChapter = () => {
    if (!selectedBook || selectedChapter === null || chapters.length === 0) return;
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter);
    if (currentIndex < chapters.length - 1 && currentIndex !== -1) {
      setSelectedChapter(chapters[currentIndex + 1].id);
      setHighlightedVerse(null);
    }
  };

  const currentChapterIndex = selectedChapter !== null ? chapters.findIndex(ch => ch.id === selectedChapter) : -1;
  const canGoPrevious = currentChapterIndex > 0;
  const canGoNext = currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1;
  const noBooksOrChaptersMessage = books.length === 0 || (selectedBook && chapters.length === 0);


  return (
    <div className="w-full h-full flex flex-col gap-4">
        {/* Search Section */}
        <Card className="shadow-lg rounded-xl">
            <CardHeader>
                <CardTitle>Search the Bible</CardTitle>
            </CardHeader>
            <CardContent>
                <SearchForm onSearchResults={() => {}} onVerseSelect={handleVerseSelect} />
            </CardContent>
        </Card>

        {/* Reader Section */}
        <Card className="w-full h-full flex flex-col shadow-lg rounded-xl flex-grow">
        <CardHeader>
            <CardTitle className="text-xl font-semibold">Read the Bible ({bibleTranslation})</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1">
                <Label htmlFor="book-select">Book</Label>
                <Select
                value={selectedBook || undefined}
                onValueChange={(value) => { setSelectedBook(value); setHighlightedVerse(null); }}
                disabled={isLoading || books.length === 0}
                >
                <SelectTrigger id="book-select" className="w-full">
                    <SelectValue placeholder={isLoading && books.length === 0 ? "Loading books..." : "Select a book"} />
                </SelectTrigger>
                <SelectContent>
                    {books.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                        {book.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label htmlFor="chapter-select">Chapter</Label>
                <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousChapter}
                    disabled={!canGoPrevious || isLoading}
                    aria-label="Previous Chapter"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select
                    value={selectedChapter ? String(selectedChapter) : undefined}
                    onValueChange={(value) => { setSelectedChapter(Number(value)); setHighlightedVerse(null); }}
                    disabled={!selectedBook || chapters.length === 0 || isLoading}
                >
                    <SelectTrigger id="chapter-select" className="w-full">
                    <SelectValue placeholder={isLoading && selectedBook ? "Loading chapters..." : "Chapter"} />
                    </SelectTrigger>
                    <SelectContent>
                    {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={String(chapter.id)}>
                        {chapter.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextChapter}
                    disabled={!canGoNext || isLoading}
                    aria-label="Next Chapter"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                </div>
            </div>
            </div>

            {error && <p className="text-destructive text-center py-2">{error}</p>}
            
            {!error && noBooksOrChaptersMessage && !isLoading && (
                <p className="text-muted-foreground text-center pt-10">
                    {`No content available for ${bibleTranslation} at the moment. Please ensure its data file and parsing logic in 'src/services/bible.ts' are correctly set up.`}
                </p>
            )}

            <ScrollArea ref={chapterScrollAreaRef} className="flex-grow border rounded-md p-4 bg-muted/10 min-h-[300px] relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/30 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            {chapterText ? (
                <div className="whitespace-pre-line text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: chapterText }}></div>
            ) : (
                !isLoading && !error && !noBooksOrChaptersMessage && (
                    <p className="text-muted-foreground text-center pt-10">
                    {selectedBook && selectedChapter !== null ? `Loading ${bibleTranslation} chapter...` : `Select a book and chapter to read in ${bibleTranslation}.`}
                    </p>
                )
            )}
            </ScrollArea>
        </CardContent>
        </Card>
    </div>
  );
}

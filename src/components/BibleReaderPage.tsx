
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { getChapterText, getBooks, getChaptersForBook, type BibleBook, type BibleChapter } from '@/services/bible';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useSettings, type BibleTranslation } from '@/contexts/SettingsContext';


export function BibleReaderPage() {
  const { bibleTranslation } = useSettings();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterText, setChapterText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooksForTranslation() {
      setIsLoading(true);
      setError(null);
      setBooks([]); // Clear previous books
      setSelectedBook(null); // Reset book selection
      setChapters([]); // Reset chapters
      setSelectedChapter(null); // Reset chapter selection
      setChapterText(null); // Clear text
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
        setSelectedChapter(null); // Reset chapter selection
        setChapterText(null); // Clear previous text
        try {
          const fetchedChapters = await getChaptersForBook(bibleTranslation, selectedBook);
          setChapters(fetchedChapters);
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

  const loadChapterContent = useCallback(async () => {
    if (selectedBook && selectedChapter !== null) {
      setIsLoading(true);
      setError(null);
      setChapterText(null);
      try {
        const text = await getChapterText(bibleTranslation, selectedBook, selectedChapter);
        setChapterText(text);
      } catch (err: any) {
        setError(`Failed to load ${selectedBook} chapter ${selectedChapter} (${bibleTranslation}): ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedBook, selectedChapter, bibleTranslation]);

  useEffect(() => {
    if (selectedBook && selectedChapter !== null) {
      loadChapterContent();
    }
  }, [selectedBook, selectedChapter, loadChapterContent]); // loadChapterContent includes bibleTranslation in its dependencies

  const handlePreviousChapter = () => {
    if (!selectedBook || selectedChapter === null || chapters.length === 0) return;
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter);
    if (currentIndex > 0) {
      setSelectedChapter(chapters[currentIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (!selectedBook || selectedChapter === null || chapters.length === 0) return;
    const currentIndex = chapters.findIndex(ch => ch.id === selectedChapter);
    if (currentIndex < chapters.length - 1 && currentIndex !== -1) {
      setSelectedChapter(chapters[currentIndex + 1].id);
    }
  };

  const currentChapterIndex = selectedChapter !== null ? chapters.findIndex(ch => ch.id === selectedChapter) : -1;
  const canGoPrevious = currentChapterIndex > 0;
  const canGoNext = currentChapterIndex !== -1 && currentChapterIndex < chapters.length - 1;
  const noBooksOrChaptersMessage = books.length === 0 || (selectedBook && chapters.length === 0);


  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Read the Bible ({bibleTranslation})</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="book-select">Book</Label>
            <Select
              value={selectedBook || undefined}
              onValueChange={(value) => setSelectedBook(value)}
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
                onValueChange={(value) => setSelectedChapter(Number(value))}
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


        <ScrollArea className="flex-grow border rounded-md p-4 bg-muted/10 min-h-[300px] relative">
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
  );
}

    
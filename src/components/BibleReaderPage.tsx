
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
import { getChapterText, getBooks, getChaptersForBook } from '@/services/bible';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface Book {
  id: string;
  name: string;
}

interface Chapter {
  id: number;
  name: string; // e.g. "Chapter 1"
}

export function BibleReaderPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [chapterText, setChapterText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooks() {
      setIsLoading(true);
      try {
        const fetchedBooks = await getBooks();
        setBooks(fetchedBooks);
        if (fetchedBooks.length > 0) {
          // Optionally select the first book by default
          // setSelectedBook(fetchedBooks[0].id);
        }
      } catch (err) {
        setError("Failed to load Bible books.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBooks();
  }, []);

  useEffect(() => {
    async function fetchChapters() {
      if (selectedBook) {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedChapters = await getChaptersForBook(selectedBook);
          setChapters(fetchedChapters);
          setSelectedChapter(null); // Reset chapter selection
          setChapterText(null); // Clear previous text
          if (fetchedChapters.length > 0) {
            // Optionally select the first chapter by default
            // setSelectedChapter(fetchedChapters[0].id);
          }
        } catch (err) {
          setError(`Failed to load chapters for ${selectedBook}.`);
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
    fetchChapters();
  }, [selectedBook]);

  const loadChapterContent = useCallback(async () => {
    if (selectedBook && selectedChapter !== null) {
      setIsLoading(true);
      setError(null);
      setChapterText(null);
      try {
        const text = await getChapterText(selectedBook, selectedChapter);
        setChapterText(text);
      } catch (err: any) {
        setError(`Failed to load ${selectedBook} chapter ${selectedChapter}: ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    if (selectedBook && selectedChapter !== null) {
      loadChapterContent();
    }
  }, [selectedBook, selectedChapter, loadChapterContent]);


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

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Read the Bible</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="book-select">Book</Label>
            <Select
              value={selectedBook || undefined}
              onValueChange={(value) => setSelectedBook(value)}
            >
              <SelectTrigger id="book-select" className="w-full" disabled={isLoading && books.length === 0}>
                <SelectValue placeholder="Select a book" />
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
                  <SelectValue placeholder="Chapter" />
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

        <ScrollArea className="flex-grow border rounded-md p-4 bg-muted/10 min-h-[300px] relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/30 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {chapterText ? (
            <div className="whitespace-pre-line text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: chapterText }}></div>
          ) : (
             !isLoading && (
                <p className="text-muted-foreground text-center pt-10">
                {selectedBook && selectedChapter !== null ? 'Loading chapter...' : 'Select a book and chapter to read.'}
                </p>
             )
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


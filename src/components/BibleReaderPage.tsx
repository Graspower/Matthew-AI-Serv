
'use client';

import React, { useState, useEffect } from 'react';
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
import { getChapterText, getBooks, getChaptersForBook } from '@/services/bible'; // Placeholder functions

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
      try {
        const fetchedBooks = await getBooks(); // This will return mock data for now
        setBooks(fetchedBooks);
      } catch (err) {
        setError("Failed to load Bible books.");
        console.error(err);
      }
    }
    fetchBooks();
  }, []);

  useEffect(() => {
    async function fetchChapters() {
      if (selectedBook) {
        try {
          const fetchedChapters = await getChaptersForBook(selectedBook); // Mock data
          setChapters(fetchedChapters);
          setSelectedChapter(null); // Reset chapter selection
          setChapterText(null); // Clear previous text
        } catch (err) {
          setError(`Failed to load chapters for ${selectedBook}.`);
          console.error(err);
        }
      } else {
        setChapters([]);
        setSelectedChapter(null);
        setChapterText(null);
      }
    }
    fetchChapters();
  }, [selectedBook]);

  const handleLoadChapter = async () => {
    if (selectedBook && selectedChapter) {
      setIsLoading(true);
      setError(null);
      setChapterText(null);
      try {
        // In a real app, getChapterText would fetch actual Bible text
        const text = await getChapterText(selectedBook, selectedChapter);
        setChapterText(text);
      } catch (err: any) {
        setError(`Failed to load ${selectedBook} chapter ${selectedChapter}: ${err.message}`);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Read the Bible</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="book-select">Book</Label>
            <Select
              value={selectedBook || undefined}
              onValueChange={(value) => setSelectedBook(value)}
            >
              <SelectTrigger id="book-select" className="w-full">
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
            <Select
              value={selectedChapter ? String(selectedChapter) : undefined}
              onValueChange={(value) => setSelectedChapter(Number(value))}
              disabled={!selectedBook || chapters.length === 0}
            >
              <SelectTrigger id="chapter-select" className="w-full">
                <SelectValue placeholder="Select a chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={String(chapter.id)}>
                    {chapter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleLoadChapter}
            disabled={!selectedBook || !selectedChapter || isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? 'Loading...' : 'Load Chapter'}
          </Button>
        </div>

        {error && <p className="text-destructive text-center">{error}</p>}

        <ScrollArea className="flex-grow border rounded-md p-4 bg-muted/10 min-h-[200px]">
          {chapterText ? (
            <div className="whitespace-pre-line text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: chapterText }}></div>
          ) : (
            <p className="text-muted-foreground text-center">
              {selectedBook && selectedChapter && !isLoading ? 'Press "Load Chapter" to read.' : 'Select a book and chapter to read.'}
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

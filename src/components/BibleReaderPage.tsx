
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getChapterText, getBooks, getChaptersForBook, type BibleBook, type BibleChapter, type Verse } from '@/services/bible';
import { Loader2, Search, Baseline, Type, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings, type BibleTranslation } from '@/contexts/SettingsContext';
import { SearchForm } from '@/components/SearchForm';
import { cn } from '@/lib/utils';

// List of Old Testament books for grouping
const oldTestamentBooks = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
];

interface BibleReaderPageProps {
  verseToRead: Verse | null;
  onReadComplete: () => void;
}

const fontSizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const fontFamilies = ['font-sans', 'font-serif'];
const MIN_SWIPE_DISTANCE = 50;


export function BibleReaderPage({ verseToRead, onReadComplete }: BibleReaderPageProps) {
  const { bibleTranslation } = useSettings();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>('Genesis');
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(1);
  const [chapterText, setChapterText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

  // UI State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);
  const [isChapterSelectorOpen, setIsChapterSelectorOpen] = useState(false);
  const [bookSearchTerm, setBookSearchTerm] = useState('');
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // 'text-base'
  const [fontFamilyIndex, setFontFamilyIndex] = useState(0); // 'font-sans'

  const chapterScrollAreaRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number, y: number } | null>(null);

  // --- Data Loading Effects ---

  useEffect(() => {
    async function fetchBooksForTranslation() {
      try {
        const fetchedBooks = await getBooks(bibleTranslation);
        setBooks(fetchedBooks);
      } catch (err: any) {
        setError(`Failed to load Bible books for ${bibleTranslation}: ${err.message}`);
      }
    }
    fetchBooksForTranslation();
  }, [bibleTranslation]);

  useEffect(() => {
    async function fetchChaptersForBook() {
      if (selectedBook) {
        try {
          const fetchedChapters = await getChaptersForBook(bibleTranslation, selectedBook);
          setChapters(fetchedChapters);
        } catch (err: any) {
          setError(`Failed to load chapters for ${selectedBook} (${bibleTranslation}): ${err.message}`);
        }
      } else {
        setChapters([]);
      }
    }
    fetchChaptersForBook();
  }, [selectedBook, bibleTranslation]);

  const loadChapterContent = useCallback(async (book: string, chapter: number, verseToHighlight: number | null) => {
    setIsLoading(true);
    setError(null);
    setChapterText(null);
    try {
      const text = await getChapterText(bibleTranslation, book, chapter, verseToHighlight);
      setChapterText(text);
    } catch (err: any) {
      setError(`Failed to load ${book} chapter ${chapter} (${bibleTranslation}): ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [bibleTranslation]);

  useEffect(() => {
    if (selectedBook && selectedChapter !== null) {
      loadChapterContent(selectedBook, selectedChapter, highlightedVerse);
    }
  }, [selectedBook, selectedChapter, highlightedVerse, loadChapterContent]);

  // --- Prop Handling Effects ---

  const handleVerseSelect = useCallback((verse: Verse) => {
    setSelectedBook(verse.book);
    setSelectedChapter(verse.chapter);
    setHighlightedVerse(verse.verse);
    setIsSearchOpen(false); // Close search dialog on selection
  }, []);

  useEffect(() => {
    if (verseToRead) {
      handleVerseSelect(verseToRead);
      onReadComplete();
    }
  }, [verseToRead, onReadComplete, handleVerseSelect]);
  
  useEffect(() => {
    if (chapterText && highlightedVerse) {
      const highlightElement = document.getElementById('highlighted-verse');
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [chapterText, highlightedVerse]);
  
  // --- UI Handlers ---

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    setIsBookSelectorOpen(false);
    setIsChapterSelectorOpen(true);
  };

  const handleChapterSelect = (chapterId: number) => {
    setSelectedChapter(chapterId);
    setHighlightedVerse(null);
    setIsChapterSelectorOpen(false);
  };

  const handlePrevChapter = useCallback(() => {
    if (!selectedBook || selectedChapter === null) return;
    const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter);
    if (currentChapterIndex > 0) {
      const prevChapter = chapters[currentChapterIndex - 1];
      handleChapterSelect(prevChapter.id);
    }
  }, [selectedBook, selectedChapter, chapters]);

  const handleNextChapter = useCallback(() => {
    if (!selectedBook || selectedChapter === null) return;
    const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter);
    if (currentChapterIndex > -1 && currentChapterIndex < chapters.length - 1) {
      const nextChapter = chapters[currentChapterIndex + 1];
      handleChapterSelect(nextChapter.id);
    }
  }, [selectedBook, selectedChapter, chapters]);
  
  const canGoToPrevChapter = useMemo(() => {
    if (!selectedBook || selectedChapter === null || chapters.length === 0) return false;
    return selectedChapter > 1;
  }, [selectedBook, selectedChapter]);

  const canGoToNextChapter = useMemo(() => {
    if (!selectedBook || selectedChapter === null || chapters.length === 0) return false;
    return selectedChapter < chapters.length;
  }, [selectedBook, selectedChapter, chapters.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStart.current.x;
    const deltaY = touchEndY - touchStart.current.y;
    
    touchStart.current = null; 

    if (Math.abs(deltaX) > Math.abs(deltaY)) { // It's a horizontal swipe
      if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
        if (deltaX > 0) { // Right swipe
          handlePrevChapter();
        } else { // Left swipe
          handleNextChapter();
        }
      }
    }
  };
  
  const toggleFontFamily = () => setFontFamilyIndex(i => (i + 1) % fontFamilies.length);

  const filteredBooks = useMemo(() => {
    return books.filter(book => book.name.toLowerCase().includes(bookSearchTerm.toLowerCase()));
  }, [books, bookSearchTerm]);

  const { oldTestament, newTestament } = useMemo(() => {
    const ot = filteredBooks.filter(book => oldTestamentBooks.includes(book.name));
    const nt = filteredBooks.filter(book => !oldTestamentBooks.includes(book.name));
    return { oldTestament: ot, newTestament: nt };
  }, [filteredBooks]);


  return (
    <div className="w-full h-full flex flex-col gap-2 relative">
      {/* Header Bar */}
      <div className="flex items-center gap-2 p-2 border-b sticky top-0 bg-background z-10">
        <Button 
          variant="outline" 
          className="flex-1 justify-start text-left"
          onClick={() => { setIsBookSelectorOpen(true); setBookSearchTerm(''); }}
        >
          {selectedBook && selectedChapter ? `${selectedBook} ${selectedChapter}` : 'Select Book'}
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setIsSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Baseline className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Font Size</h4>
                  <p className="text-sm text-muted-foreground">
                    Adjust the text size for readability.
                  </p>
                </div>
                <Slider
                  min={0}
                  max={fontSizes.length - 1}
                  step={1}
                  value={[fontSizeIndex]}
                  onValueChange={(value) => setFontSizeIndex(value[0])}
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="icon" onClick={toggleFontFamily}>
            <Type className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Reader Content */}
      <ScrollArea
        ref={chapterScrollAreaRef}
        className="flex-grow p-2 md:p-4 relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )}
        {error && <p className="text-destructive text-center py-2">{error}</p>}
        
        {chapterText ? (
            <div 
              className={cn(
                "prose prose-sm sm:prose-base max-w-none leading-relaxed transition-all dark:prose-invert",
                fontSizes[fontSizeIndex], 
                fontFamilies[fontFamilyIndex]
              )} 
              dangerouslySetInnerHTML={{ __html: chapterText }}
            ></div>
        ) : (
            !isLoading && !error && (
                <p className="text-muted-foreground text-center pt-10">
                {selectedBook && selectedChapter !== null ? `Loading ${bibleTranslation} chapter...` : `Select a book and chapter to read.`}
                </p>
            )
        )}
      </ScrollArea>

      {/* Floating Navigation Buttons */}
      {selectedBook && selectedChapter !== null && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
          <Button onClick={handlePrevChapter} disabled={!canGoToPrevChapter} variant="secondary" className="shadow-lg">
            <ChevronLeft className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Previous</span>
          </Button>
          <Button onClick={handleNextChapter} disabled={!canGoToNextChapter} variant="secondary" className="shadow-lg">
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="h-5 w-5 md:ml-2" />
          </Button>
        </div>
      )}

      {/* Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="w-[90vw] max-w-xl h-[80vh] flex flex-col">
           <DialogHeader>
            <DialogTitle>Search the Bible</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-hidden p-0">
            <SearchForm onSearchResults={() => {}} onVerseSelect={handleVerseSelect} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Book Selection Dialog */}
      <Dialog open={isBookSelectorOpen} onOpenChange={setIsBookSelectorOpen}>
        <DialogContent className="max-w-3xl flex flex-col h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select a Book</DialogTitle>
            <Input 
              type="search"
              placeholder="Search books..."
              className="mt-2"
              value={bookSearchTerm}
              onChange={(e) => setBookSearchTerm(e.target.value)}
            />
          </DialogHeader>
          <ScrollArea className="flex-grow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pr-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">Old Testament</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {oldTestament.map(book => (
                    <Button key={book.id} variant="secondary" onClick={() => handleBookSelect(book.id)}>{book.name}</Button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-primary">New Testament</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {newTestament.map(book => (
                    <Button key={book.id} variant="secondary" onClick={() => handleBookSelect(book.id)}>{book.name}</Button>
                  ))}
                </div>
              </div>
            </div>
            {filteredBooks.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">No books match your search.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Chapter Selection Dialog */}
      <Dialog open={isChapterSelectorOpen} onOpenChange={setIsChapterSelectorOpen}>
        <DialogContent className="max-w-xl flex flex-col h-[70vh]">
          <DialogHeader>
            <DialogTitle>Select a Chapter in {selectedBook}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-grow">
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 pr-4">
              {chapters.map(chapter => (
                <Button key={chapter.id} variant="secondary" size="icon" onClick={() => handleChapterSelect(chapter.id)}>
                  {chapter.id}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateVerseExplanation } from '@/ai/flows/generateVerseExplanationFlow';
import { Skeleton } from '@/components/ui/skeleton';

interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface DailyVerse {
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
  verse: Verse;
  explanation: string;
}

const inspirationalVerses: Verse[] = [
  { book: 'Psalm', chapter: 103, verse: 1, text: 'Bless the LORD, O my soul, and all that is within me, bless his holy name!' },
  { book: 'Psalm', chapter: 103, verse: 2, text: 'Bless the LORD, O my soul, and forget not all his benefits.' },
  { book: 'Psalm', chapter: 145, verse: 1, text: 'I will extol thee, my God, O king; and I will bless thy name for ever and ever.' },
  { book: 'Psalm', chapter: 145, verse: 2, text: 'Every day will I bless thee; and I will praise thy name for ever and ever.' },
  { book: 'Ephesians', chapter: 1, verse: 3, text: 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ.' },
  { book: '1 Chronicles', chapter: 16, verse: 8, text: 'Give thanks unto the LORD, call upon his name, make known his deeds among the people.' },
  { book: '1 Chronicles', chapter: 16, verse: 34, text: 'O give thanks unto the LORD; for he is good; for his mercy endureth for ever.' },
  { book: 'Psalm', chapter: 95, verse: 2, text: 'Let us come before his presence with thanksgiving, and make a joyful noise unto him with psalms.' },
  { book: 'Psalm', chapter: 107, verse: 1, text: 'O give thanks unto the LORD, for he is good: for his mercy endureth for ever.' },
  { book: 'Colossians', chapter: 3, verse: 17, text: 'And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him.' },
  { book: '1 Thessalonians', chapter: 5, verse: 18, text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
  { book: 'Hebrews', chapter: 13, verse: 15, text: 'By him therefore let us offer the sacrifice of praise to God continually, that is, the fruit of our lips giving thanks to his name.' },
  { book: 'Psalm', chapter: 34, verse: 1, text: 'I will bless the LORD at all times: his praise shall continually be in my mouth.' },
  { book: 'Jude', chapter: 1, verse: 25, text: 'To the only wise God our Saviour, be glory and majesty, dominion and power, both now and ever. Amen.'},
  { book: 'Revelation', chapter: 4, verse: 11, text: 'Thou art worthy, O Lord, to receive glory and honour and power: for thou hast created all things, and for thy pleasure they are and were created.'},
];

// Helper to shuffle array and pick N items
function pickRandomItems<T>(arr: T[], num: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

export function HomePage() {
  const [dailyVerses, setDailyVerses] = useState<DailyVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { toast } = useToast();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const generateAndStoreVerses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const selectedVerses = pickRandomItems(inspirationalVerses, 3);
      
      const explanationPromises = selectedVerses.map(verse => 
        generateVerseExplanation({
          verseReference: `${verse.book} ${verse.chapter}:${verse.verse}`,
          verseText: verse.text,
        })
      );
      
      const explanations = await Promise.all(explanationPromises);

      const newDailyVerses: DailyVerse[] = [
        { timeOfDay: 'Morning', verse: selectedVerses[0], explanation: explanations[0].explanation },
        { timeOfDay: 'Afternoon', verse: selectedVerses[1], explanation: explanations[1].explanation },
        { timeOfDay: 'Evening', verse: selectedVerses[2], explanation: explanations[2].explanation },
      ];

      if (typeof window !== 'undefined') {
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('dailyInspiration', JSON.stringify({ date: today, verses: newDailyVerses }));
      }
      setDailyVerses(newDailyVerses);

    } catch (err: any) {
      console.error('Failed to generate daily verses or explanations:', err);
      const errorMessage = `Failed to load daily inspiration. ${err.message || 'Please try again.'}`;
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setDailyVerses([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('dailyInspiration');
    
    if (storedData) {
      try {
        const { date, verses } = JSON.parse(storedData);
        if (date === today && Array.isArray(verses) && verses.length === 3) {
          setDailyVerses(verses);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error("Failed to parse daily inspiration from local storage", e);
      }
    }
    
    generateAndStoreVerses();
  }, [generateAndStoreVerses]);

  const scrollToCard = useCallback((index: number) => {
    if (cardRefs.current[index]) {
      cardRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && dailyVerses.length > 0) {
      const hour = new Date().getHours();
      let initialIndex = 0;
      if (hour >= 18) { // 6 PM or later
        initialIndex = 2;
      } else if (hour >= 12) { // 12 PM or later
        initialIndex = 1;
      }
      setActiveIndex(initialIndex);
      // Use a timeout to scroll after the component has rendered
      setTimeout(() => scrollToCard(initialIndex), 100);
    }
  }, [isLoading, dailyVerses, scrollToCard]);

  const handlePrev = () => {
    const newIndex = activeIndex > 0 ? activeIndex - 1 : 0;
    setActiveIndex(newIndex);
    scrollToCard(newIndex);
  };

  const handleNext = () => {
    const newIndex = activeIndex < dailyVerses.length - 1 ? activeIndex + 1 : dailyVerses.length - 1;
    setActiveIndex(newIndex);
    scrollToCard(newIndex);
  };

  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = () => {
    if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
        if(scrollContainerRef.current) {
            const { scrollLeft, clientWidth } = scrollContainerRef.current;
            const newIndex = Math.round(scrollLeft / clientWidth);
            if (isFinite(newIndex)) {
              setActiveIndex(newIndex);
            }
        }
    }, 150);
  };

  const renderVerseCard = (item: DailyVerse, index: number) => (
    <div
      key={item.timeOfDay}
      ref={el => cardRefs.current[index] = el}
      className="w-full flex-shrink-0 snap-center p-1 md:p-2"
    >
      <Card className="w-full shadow-lg rounded-xl flex flex-col min-h-[400px]">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{item.timeOfDay} Inspiration</CardTitle>
          <CardDescription>{`${item.verse.book} ${item.verse.chapter}:${item.verse.verse}`}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4">
          <blockquote className="p-4 bg-secondary/30 rounded-md border-l-4 border-primary">
            <p className="text-xl font-medium italic">"{item.verse.text}"</p>
          </blockquote>
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap">
              <p>{item.explanation}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSkeletonCard = (key: string) => (
      <div key={key} className="w-full flex-shrink-0 snap-center p-1 md:p-2">
        <Card className="w-full shadow-lg rounded-xl min-h-[400px]">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/4 mt-1" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Skeleton className="h-16 w-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </CardContent>
        </Card>
      </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-2 md:p-6 w-full">
      <div className="w-full max-w-2xl text-center mb-4">
        <h2 className="text-2xl font-bold">Daily Divine Inspiration</h2>
        <p className="text-muted-foreground">Verses of Blessing, Adoration, and Thanksgiving</p>
      </div>

      <div className="w-full max-w-2xl flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={isLoading || activeIndex === 0}
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="sr-only">Previous Inspiration</span>
        </Button>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-grow flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        >
            {isLoading ? (
              [...Array(3)].map((_, i) => renderSkeletonCard(`sk-${i}`))
            ) : error ? (
              <div className="w-full flex-shrink-0 snap-center p-1">
                  <Card className="w-full shadow-lg rounded-xl min-h-[400px]">
                      <CardContent className="p-6 text-center flex items-center justify-center">
                          <p className="text-destructive">{error}</p>
                      </CardContent>
                  </Card>
              </div>
            ) : dailyVerses.length > 0 ? (
                dailyVerses.map(renderVerseCard)
            ) : (
              <div className="w-full flex-shrink-0 snap-center p-1">
                 <Card className="w-full shadow-lg rounded-xl min-h-[400px]">
                      <CardContent className="p-6 text-center flex items-center justify-center">
                          <p className="text-muted-foreground">Your daily inspiration is being prepared.</p>
                      </CardContent>
                  </Card>
              </div>
            )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isLoading || activeIndex >= dailyVerses.length - 1}
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          <ChevronRight className="h-6 w-6" />
          <span className="sr-only">Next Inspiration</span>
        </Button>
      </div>
    </div>
  );
}

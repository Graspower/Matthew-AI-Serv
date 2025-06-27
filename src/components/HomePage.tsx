
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
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
  const [visibleVerses, setVisibleVerses] = useState<DailyVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

  useEffect(() => {
    if (dailyVerses.length > 0) {
      const hour = new Date().getHours();
      const nowVisible: DailyVerse[] = [];

      const morning = dailyVerses.find(v => v.timeOfDay === 'Morning');
      const afternoon = dailyVerses.find(v => v.timeOfDay === 'Afternoon');
      const evening = dailyVerses.find(v => v.timeOfDay === 'Evening');
      
      if (hour >= 0 && morning) nowVisible.push(morning);
      if (hour >= 12 && afternoon) nowVisible.push(afternoon);
      if (hour >= 18 && evening) nowVisible.push(evening);
      
      setVisibleVerses(nowVisible);
    }
  }, [dailyVerses]);

  const renderVerseCard = (item: DailyVerse) => (
    <Card key={item.timeOfDay} className="w-full shadow-lg rounded-xl flex flex-col">
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
  );

  const renderSkeletonCard = (key: string) => (
      <Card key={key} className="w-full shadow-lg rounded-xl">
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
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-6">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-center mb-6">
           <div className="text-left">
              <h2 className="text-2xl font-bold">Daily Divine Inspiration</h2>
              <p className="text-muted-foreground">Verses of Blessing, Adoration, and Thanksgiving</p>
           </div>
          <Button onClick={generateAndStoreVerses} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Verses
          </Button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderSkeletonCard("sk-morning")}
            {renderSkeletonCard("sk-afternoon")}
            {renderSkeletonCard("sk-evening")}
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-10">
            <p className="text-destructive mb-4">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
            <>
                {visibleVerses.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {visibleVerses.map(renderVerseCard)}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">Your first inspiration for the day is being prepared. Please check back shortly.</p>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}

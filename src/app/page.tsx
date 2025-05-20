'use client';

import React, {useState, useCallback} from 'react';
import {SearchForm} from '@/components/SearchForm';
import {VerseExplanationCard} from '@/components/VerseExplanationCard';
import type {Verse} from '@/services/bible';
import {explainBibleVerse} from '@/ai/flows/explain-bible-verse-flow';
import {useToast} from '@/hooks/use-toast';

export default function Home() {
  const [verseToExplain, setVerseToExplain] = useState<Verse | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const {toast} = useToast();

  const handleVerseSelect = useCallback(async (verse: Verse) => {
    setVerseToExplain(verse);
    setExplanation(null);
    setIsExplanationLoading(true);
    setExplanationError(null);

    try {
      const result = await explainBibleVerse({verse});
      setExplanation(result.explanation);
    } catch (error: any) {
      console.error('Failed to get verse explanation:', error);
      setExplanationError(`Failed to get explanation. ${error.message || 'Please try again.'}`);
      toast({
        title: 'Error Fetching Explanation',
        description: `Could not load explanation for ${verse.book} ${verse.chapter}:${verse.verse}. ${error.message || ''}`,
        variant: 'destructive',
      });
    } finally {
      setIsExplanationLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="md:w-2/5 p-4 flex flex-col">
        <header className="mb-4 text-center md:text-left">
          <h1 className="text-3xl font-bold">Matthew AI</h1>
          <p className="text-muted-foreground">Search Bible verses and get AI-powered explanations.</p>
        </header>
        <div className="flex-grow">
           <SearchForm onVerseSelect={handleVerseSelect} />
        </div>
      </div>
      <div className="md:w-3/5 p-4 bg-muted/20 md:border-l border-border flex flex-col">
        <div className="flex-grow">
          <VerseExplanationCard
            verse={verseToExplain}
            explanation={explanation}
            isLoading={isExplanationLoading}
            error={explanationError}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, {useState, useCallback} from 'react';
import {SearchForm} from '@/components/SearchForm';
import {TeachingDisplayCard} from '@/components/VerseExplanationCard'; // Renamed import
import type {Verse} from '@/services/bible';
import {generateTeaching} from '@/ai/flows/generateTeachingFlow'; // New import
import {useToast} from '@/hooks/use-toast';

export default function Home() {
  const [currentQueryTopic, setCurrentQueryTopic] = useState<string | null>(null);
  const [teachingText, setTeachingText] = useState<string | null>(null);
  const [isTeachingLoading, setIsTeachingLoading] = useState(false);
  const [teachingError, setTeachingError] = useState<string | null>(null);
  const [versesFoundCountForTopic, setVersesFoundCountForTopic] = useState<number | undefined>(undefined);
  const {toast} = useToast();

  const handleSearchResults = useCallback(async (query: string, verses: Verse[]) => {
    setCurrentQueryTopic(query);
    setTeachingText(null);
    setIsTeachingLoading(true);
    setTeachingError(null);
    setVersesFoundCountForTopic(verses.length);

    if (verses.length === 0) {
      setIsTeachingLoading(false);
      // No need to call generateTeaching if no verses are found
      // The TeachingDisplayCard will handle the "no verses found" message.
      return;
    }

    try {
      const result = await generateTeaching({query, verses});
      setTeachingText(result.teaching);
    } catch (error: any)
    {
      console.error('Failed to generate teaching:', error);
      const errorMessage = `Failed to generate teaching for "${query}". ${error.message || 'Please try again.'}`;
      setTeachingError(errorMessage);
      toast({
        title: 'Error Generating Teaching',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsTeachingLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <div className="md:w-2/5 p-4 flex flex-col">
        <header className="mb-4 text-center md:text-left">
          <h1 className="text-3xl font-bold">VerseFinder AI</h1>
          <p className="text-muted-foreground">Search Bible topics and get AI-powered teachings.</p>
        </header>
        <div className="flex-grow">
           <SearchForm onSearchResults={handleSearchResults} />
        </div>
      </div>
      <div className="md:w-3/5 p-4 bg-muted/20 md:border-l border-border flex flex-col">
        <div className="flex-grow">
          <TeachingDisplayCard
            queryTopic={currentQueryTopic}
            teachingText={teachingText}
            isLoading={isTeachingLoading}
            error={teachingError}
            versesFoundCount={versesFoundCountForTopic}
          />
        </div>
      </div>
    </div>
  );
}

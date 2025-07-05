'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateTeaching } from '@/ai/flows/generateTeachingFlow';
import type { Verse } from '@/services/bible';
import { BibleReaderPage } from '@/components/BibleReaderPage';
import { SearchForm } from '@/components/SearchForm';
import { TeachingDisplayCard } from '@/components/VerseExplanationCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HomePage } from '@/components/HomePage';
import { Button } from "@/components/ui/button";
import { useSettings } from '@/contexts/SettingsContext';
import { TestimoniesSection } from '@/components/TestimoniesSection';
import { PrayersSection } from '@/components/PrayersSection';
import { TeachingsSection } from '@/components/TeachingsSection';

const LAST_SEARCH_CACHE_KEY = 'matthew-ai-last-search';
const TEACHINGS_CACHE_KEY = 'matthew-ai-teachings-cache';

type HomeSection = 'testimonies' | 'prayers' | 'teachings';

// Helper functions for the new cache
const getTeachingsCache = () => {
  try {
    if (typeof window === 'undefined') return {};
    const cached = localStorage.getItem(TEACHINGS_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    console.error("Failed to read teachings cache:", e);
    return {};
  }
};

const setTeachingsCache = (key: string, data: any) => {
  try {
    if (typeof window === 'undefined') return;
    const cache = getTeachingsCache();
    cache[key] = data;
    localStorage.setItem(TEACHINGS_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to write to teachings cache:", e);
  }
};


export default function Home() {
  const [currentQueryTopic, setCurrentQueryTopic] = useState<string | null>(null);
  const [currentVersesForTopic, setCurrentVersesForTopic] = useState<Verse[] | null>(null);
  const [teachingText, setTeachingText] = useState<string | null>(null);
  const [isTeachingLoading, setIsTeachingLoading] = useState(false);
  const [teachingError, setTeachingError] = useState<string | null>(null);
  const [teachingLength, setTeachingLength] = useState<'brief' | 'medium'>('medium');
  const [activeTab, setActiveTab] = useState('home');
  const [verseToRead, setVerseToRead] = useState<Verse | null>(null);
  const [activeHomeSection, setActiveHomeSection] = useState<HomeSection>('testimonies');

  const {toast} = useToast();
  const { language, bibleTranslation } = useSettings();

  useEffect(() => {
    // Restore the last search state on initial load
    try {
      const cachedData = localStorage.getItem(LAST_SEARCH_CACHE_KEY);
      if (cachedData) {
        const { query, verses } = JSON.parse(cachedData);
        if (query && verses) {
          setCurrentQueryTopic(query);
          setCurrentVersesForTopic(verses);
        }
      }
    } catch (error) {
      console.error("Failed to load last search from cache:", error);
      localStorage.removeItem(LAST_SEARCH_CACHE_KEY);
    }
  }, []);

  const handleSearchResults = useCallback(async (query: string, versesWithText: Verse[]) => {
    setCurrentQueryTopic(query);
    setCurrentVersesForTopic(versesWithText);

    // Cache the latest search query and its verses to be restored on next visit
    if (!query) {
      localStorage.removeItem(LAST_SEARCH_CACHE_KEY);
    } else {
      try {
        localStorage.setItem(LAST_SEARCH_CACHE_KEY, JSON.stringify({
          query: query,
          verses: versesWithText,
        }));
      } catch (error) {
        console.error("Failed to save search to cache:", error);
      }
    }
  }, []);

  const handleReadVerseRequest = useCallback((verse: Verse) => {
    setVerseToRead(verse);
    setActiveTab('bibleReader');
  }, []);

  useEffect(() => {
    const fetchTeaching = async () => {
      if (!currentQueryTopic || !currentVersesForTopic) {
        setTeachingText(null);
        setTeachingError(null);
        setIsTeachingLoading(false);
        return;
      }

      setIsTeachingLoading(true);
      setTeachingError(null);
      setTeachingText(null);

      const cacheKey = `${currentQueryTopic}-${language}-${bibleTranslation}-${teachingLength}`;
      const teachingsCache = getTeachingsCache();

      if (teachingsCache[cacheKey]) {
        setTeachingText(teachingsCache[cacheKey].teaching);
        setIsTeachingLoading(false);
        return;
      }
      
      if (currentVersesForTopic.length === 0) {
        setTeachingText(null);
        setTeachingError(null);
        setIsTeachingLoading(false);
        return;
      }

      try {
        const result = await generateTeaching({
          query: currentQueryTopic,
          verses: currentVersesForTopic,
          lengthPreference: teachingLength,
          language: language,
          bibleTranslation: bibleTranslation,
        });
        setTeachingText(result.teaching);
        setTeachingsCache(cacheKey, { teaching: result.teaching });

      } catch (error: any)
      {
        console.error('Failed to generate teaching:', error);
        setTeachingError(error.message || "Something went wrong. Please try again later.");
        toast({
          title: 'Error Generating Teaching',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setIsTeachingLoading(false);
      }
    };

    fetchTeaching();
  }, [currentQueryTopic, currentVersesForTopic, teachingLength, toast, language, bibleTranslation]);

  return (
    <div className="container mx-auto py-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
        <div className="text-center mb-4">
            <h1 className="text-3xl font-bold">Matthew AI</h1>
            <p className="text-muted-foreground">Salvation to the World AI</p>
        </div>
        <TabsList className="w-full max-w-lg mx-auto h-auto rounded-full bg-muted p-1.5 flex">
          <TabsTrigger value="home" className="flex-1 rounded-full px-5 py-2 text-sm sm:text-base transition-colors duration-200 data-[state=inactive]:hover:bg-background/50">Home</TabsTrigger>
          <TabsTrigger value="matthewAI" className="flex-1 rounded-full px-5 py-2 text-sm sm:text-base transition-colors duration-200 data-[state=inactive]:hover:bg-background/50">AI Study</TabsTrigger>
          <TabsTrigger value="bibleReader" className="flex-1 rounded-full px-5 py-2 text-sm sm:text-base transition-colors duration-200 data-[state=inactive]:hover:bg-background/50">Bible Reader</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="flex-grow p-4 mt-0 data-[state=inactive]:hidden">
          <HomePage />
          <div className="my-8 flex justify-center items-center gap-2 rounded-full bg-muted p-1 max-w-sm mx-auto">
            <Button
              variant={activeHomeSection === 'testimonies' ? 'secondary' : 'ghost'}
              onClick={() => setActiveHomeSection('testimonies')}
              className="rounded-full flex-1 shadow-sm data-[state=active]:bg-background"
              data-state={activeHomeSection === 'testimonies' ? 'active' : 'inactive'}
            >
              Testimonies
            </Button>
            <Button
              variant={activeHomeSection === 'prayers' ? 'secondary' : 'ghost'}
              onClick={() => setActiveHomeSection('prayers')}
              className="rounded-full flex-1 shadow-sm data-[state=active]:bg-background"
              data-state={activeHomeSection === 'prayers' ? 'active' : 'inactive'}
            >
              Prayers
            </Button>
            <Button
              variant={activeHomeSection === 'teachings' ? 'secondary' : 'ghost'}
              onClick={() => setActiveHomeSection('teachings')}
              className="rounded-full flex-1 shadow-sm data-[state=active]:bg-background"
              data-state={activeHomeSection === 'teachings' ? 'active' : 'inactive'}
            >
              Teachings
            </Button>
          </div>
          <div className="px-4">
            {activeHomeSection === 'testimonies' && <TestimoniesSection />}
            {activeHomeSection === 'prayers' && <PrayersSection />}
            {activeHomeSection === 'teachings' && <TeachingsSection />}
          </div>
        </TabsContent>

        <TabsContent value="matthewAI" className="flex-grow flex flex-col md:flex-row mt-0 data-[state=inactive]:hidden">
          <div className="md:w-2/5 flex flex-col border-r">
            <div className="flex-grow p-4">
               <SearchForm onSearchResults={handleSearchResults} onReadInReaderRequest={handleReadVerseRequest} />
            </div>
            <div className="mt-6 p-4 border-t border-border">
              <Label className="text-md font-semibold mb-3 block text-center md:text-left">Teaching Length</Label>
              <RadioGroup
                value={teachingLength}
                onValueChange={(value) => setTeachingLength(value as 'brief' | 'medium')}
                className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 justify-center md:justify-start"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="brief" id="r-brief" />
                  <Label htmlFor="r-brief" className="cursor-pointer">Brief</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="r-medium" />
                  <Label htmlFor="r-medium" className="cursor-pointer">Medium</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <div className="md:w-3/5 p-4 bg-muted/20 flex flex-col">
            <div className="flex-grow">
              <TeachingDisplayCard
                queryTopic={currentQueryTopic}
                teachingText={teachingText}
                isLoading={isTeachingLoading}
                error={teachingError}
                versesFoundCount={currentVersesForTopic?.length}
                language={language}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bibleReader" className="flex-grow p-4 mt-0 data-[state=inactive]:hidden">
          <BibleReaderPage verseToRead={verseToRead} onReadComplete={() => setVerseToRead(null)} />
        </TabsContent>

      </Tabs>
    </div>
  );
}

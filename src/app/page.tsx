
'use client';

import React, {useState, useCallback, useEffect} from 'react';
import {SearchForm} from '@/components/SearchForm';
import {TeachingDisplayCard} from '@/components/VerseExplanationCard';
import type {Verse} from '@/services/bible';
import {generateTeaching} from '@/ai/flows/generateTeachingFlow';
import {useToast} from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BibleReaderPage } from '@/components/BibleReaderPage';
import { HomePage } from '@/components/HomePage';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { BookOpenText, Moon, Sun } from 'lucide-react';
import { useSettings, type Language, type BibleTranslation } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';

const TEACHING_CACHE_KEY = 'matthew-ai-teaching-cache';

export default function Home() {
  const [currentQueryTopic, setCurrentQueryTopic] = useState<string | null>(null);
  const [currentVersesForTopic, setCurrentVersesForTopic] = useState<Verse[] | null>(null);
  const [teachingText, setTeachingText] = useState<string | null>(null);
  const [isTeachingLoading, setIsTeachingLoading] = useState(false);
  const [teachingError, setTeachingError] = useState<string | null>(null);
  const [teachingLength, setTeachingLength] = useState<'brief' | 'medium'>('medium');
  const [activeTab, setActiveTab] = useState('home');
  const [verseToRead, setVerseToRead] = useState<Verse | null>(null);

  const {toast} = useToast();
  const { language, setLanguage, bibleTranslation, setBibleTranslation } = useSettings();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // On initial load, try to restore state from localStorage
    try {
      const cachedData = localStorage.getItem(TEACHING_CACHE_KEY);
      if (cachedData) {
        const { query, verses, teaching } = JSON.parse(cachedData);
        if (query && verses && teaching) {
          setCurrentQueryTopic(query);
          setCurrentVersesForTopic(verses);
          setTeachingText(teaching);
        }
      }
    } catch (error) {
      console.error("Failed to load teaching from cache:", error);
      localStorage.removeItem(TEACHING_CACHE_KEY);
    }
  }, []);

  const handleSearchResults = useCallback(async (query: string, versesWithKJVText: Verse[]) => {
    setCurrentQueryTopic(query);
    setCurrentVersesForTopic(versesWithKJVText);
    if (!query) {
      localStorage.removeItem(TEACHING_CACHE_KEY);
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

      if (currentVersesForTopic.length === 0) {
        setTeachingText(null);
        setTeachingError(null);
        setIsTeachingLoading(false);
        return;
      }

      setIsTeachingLoading(true);
      setTeachingError(null);
      setTeachingText(null);

      try {
        const result = await generateTeaching({
          query: currentQueryTopic,
          verses: currentVersesForTopic,
          lengthPreference: teachingLength,
          language: language,
          bibleTranslation: bibleTranslation,
        });
        setTeachingText(result.teaching);
        // Cache the successful result
        localStorage.setItem(TEACHING_CACHE_KEY, JSON.stringify({
          query: currentQueryTopic,
          verses: currentVersesForTopic,
          teaching: result.teaching
        }));
      } catch (error: any)
      {
        console.error('Failed to generate teaching:', error);
        const errorMessage = `Failed to generate teaching for "${currentQueryTopic}". ${error.message || 'Please try again.'}`;
        setTeachingError(errorMessage);
        toast({
          title: 'Error Generating Teaching',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsTeachingLoading(false);
      }
    };

    fetchTeaching();
  }, [currentQueryTopic, currentVersesForTopic, teachingLength, toast, language, bibleTranslation]);

  return (
    <div className="flex flex-col min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow">
        <div className="p-4 border-b">
            <header className="flex justify-between items-center">
              <div className="text-center flex-grow">
                <h1 className="text-3xl font-bold">Matthew AI</h1>
                <p className="text-muted-foreground">Salvation to the World AI</p>
              </div>
              <div className="flex items-center gap-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <BookOpenText className="h-5 w-5" />
                      <span className="sr-only">Open Settings</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>Language</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={language} onValueChange={(value) => setLanguage(value as Language)}>
                      <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="fr">French</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="zh">Chinese</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Bible Translation</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={bibleTranslation} onValueChange={(value) => setBibleTranslation(value as BibleTranslation)}>
                      <DropdownMenuRadioItem value="KJV">KJV</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="NIV">NIV</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="NRSV">NRSV</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="ESV">ESV</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            <TabsList className="grid w-full grid-cols-3 mt-4 max-w-lg mx-auto">
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="matthewAI">AI Teaching</TabsTrigger>
              <TabsTrigger value="bibleReader">Bible Reader</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="home" className="flex-grow p-4 mt-0 data-[state=inactive]:hidden">
          <HomePage />
        </TabsContent>

        <TabsContent value="matthewAI" className="flex-grow flex flex-col md:flex-row mt-0 data-[state=inactive]:hidden">
          <div className="md:w-2/5 p-4 flex flex-col border-r">
            <div className="flex-grow">
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

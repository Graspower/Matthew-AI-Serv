
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { generateEncouragement } from '@/ai/flows/generateEncouragementFlow';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';

interface DailyEncouragement {
  message: string;
  topic: string;
  bibleVerseReference: string;
  bibleVerseText: string;
  date: string; // YYYY-MM-DD
  language: string;
  translation: string;
}

export function HomePage() {
  const [encouragementData, setEncouragementData] = useState<DailyEncouragement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language, bibleTranslation } = useSettings();

  const fetchAndStoreEncouragement = useCallback(async (currentLanguage: string, currentTranslation: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateEncouragement({
        language: currentLanguage,
        bibleTranslation: currentTranslation,
      });
      const today = new Date().toISOString().split('T')[0];
      const newEncouragement: DailyEncouragement = {
        message: result.message,
        topic: result.topic,
        bibleVerseReference: result.bibleVerseReference,
        bibleVerseText: result.bibleVerseText,
        date: today,
        language: currentLanguage,
        translation: currentTranslation,
      };
      localStorage.setItem('dailyEncouragement', JSON.stringify(newEncouragement));
      setEncouragementData(newEncouragement);
    } catch (err: any) {
      console.error('Failed to generate encouragement:', err);
      const errorMessage = `Failed to load an encouraging message. ${err.message || 'Please try again.'}`;
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setEncouragementData(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('dailyEncouragement');

    if (storedData) {
      try {
        const parsedData: DailyEncouragement = JSON.parse(storedData);
        if (parsedData.date === todayStr && parsedData.language === language && parsedData.translation === bibleTranslation) {
          setEncouragementData(parsedData);
          setIsLoading(false);
        } else {
          fetchAndStoreEncouragement(language, bibleTranslation);
        }
      } catch (e) {
        console.error("Failed to parse stored encouragement data:", e);
        localStorage.removeItem('dailyEncouragement');
        fetchAndStoreEncouragement(language, bibleTranslation);
      }
    } else {
      fetchAndStoreEncouragement(language, bibleTranslation);
    }
  }, [fetchAndStoreEncouragement, language, bibleTranslation]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Welcome to Matthew AI!</CardTitle>
          <CardDescription>Your daily word of encouragement.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isLoading && (
            <div className="my-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Seeking inspiration for you...</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="my-8 text-destructive">
              <p>{error}</p>
              <Button onClick={() => fetchAndStoreEncouragement(language, bibleTranslation)} className="mt-4">Try Again</Button>
            </div>
          )}
          {!isLoading && !error && encouragementData && (
            <div className="my-6 space-y-4">
              {encouragementData.topic && (
                <p className="text-sm text-muted-foreground italic">
                  Today's Focus: <strong>{encouragementData.topic}</strong>
                </p>
              )}
              {encouragementData.bibleVerseReference && encouragementData.bibleVerseReference !== "N/A" && encouragementData.bibleVerseText && (
                <div className="p-4 bg-secondary/30 rounded-md border border-border">
                  <p className="text-lg font-semibold text-primary">{encouragementData.bibleVerseReference}</p>
                  <p className="mt-2 text-2xl font-bold">"{encouragementData.bibleVerseText}"</p>
                </div>
              )}
              <blockquote className="text-lg leading-relaxed border-l-4 border-primary pl-4 py-2 bg-muted/20 rounded-r-md">
                {encouragementData.message.split('\n').map((paragraph, index) => (
                  <p key={index} className={index > 0 ? 'mt-2' : ''}>{paragraph}</p>
                ))}
              </blockquote>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

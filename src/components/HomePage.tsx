
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { generateEncouragement } from '@/ai/flows/generateEncouragementFlow';
import { useToast } from '@/hooks/use-toast';

export function HomePage() {
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [bibleVerseReference, setBibleVerseReference] = useState<string | null>(null);
  const [bibleVerseText, setBibleVerseText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEncouragement = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setEncouragement(null);
    setCurrentTopic(null);
    setBibleVerseReference(null);
    setBibleVerseText(null);
    try {
      const result = await generateEncouragement({});
      setEncouragement(result.message);
      setCurrentTopic(result.topic);
      setBibleVerseReference(result.bibleVerseReference);
      setBibleVerseText(result.bibleVerseText);
    } catch (err: any) {
      console.error('Failed to generate encouragement:', err);
      const errorMessage = `Failed to load an encouraging message. ${err.message || 'Please try again.'}`;
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEncouragement();
  }, [fetchEncouragement]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Card className="w-full max-w-2xl shadow-xl rounded-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Welcome to Matthew AI!</CardTitle>
          <CardDescription>A fresh word of encouragement for your day.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isLoading && (
            <div className="my-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Seeking inspiration for you...</p>
            </div>
          )}
          {error && (
            <div className="my-8 text-destructive">
              <p>{error}</p>
            </div>
          )}
          {!isLoading && !error && encouragement && (
            <div className="my-6 space-y-4">
              {currentTopic && (
                <p className="text-sm text-muted-foreground italic">
                  Today's Focus: <strong>{currentTopic}</strong>
                </p>
              )}
              {bibleVerseReference && bibleVerseReference !== "N/A" && bibleVerseText && (
                <div className="p-3 bg-secondary/30 rounded-md border border-border">
                  <p className="text-md font-semibold text-primary">{bibleVerseReference}</p>
                  <p className="mt-1 text-sm italic">"{bibleVerseText}"</p>
                </div>
              )}
              <blockquote className="text-lg leading-relaxed border-l-4 border-primary pl-4 py-2 bg-muted/20 rounded-r-md">
                {encouragement.split('\n').map((paragraph, index) => (
                  <p key={index} className={index > 0 ? 'mt-2' : ''}>{paragraph}</p>
                ))}
              </blockquote>
            </div>
          )}
          <Button onClick={fetchEncouragement} disabled={isLoading} className="mt-6">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Get New Encouragement'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

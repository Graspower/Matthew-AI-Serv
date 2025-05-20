'use client';

import type {Verse} from '@/services/bible';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Loader2} from 'lucide-react';

interface VerseExplanationCardProps {
  verse: Verse | null;
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
}

export function VerseExplanationCard({verse, explanation, isLoading, error}: VerseExplanationCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Verse Explanation</CardTitle>
          {verse && (
            <CardDescription className="text-md text-muted-foreground">
              {verse.book} {verse.chapter}:{verse.verse}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating explanation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Verse Explanation</CardTitle>
           {verse && (
            <CardDescription className="text-md text-muted-foreground">
              {verse.book} {verse.chapter}:{verse.verse}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!verse) {
    return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Verse Explanation</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Search for a verse and click on it to see its explanation here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Explanation for {verse.book} {verse.chapter}:{verse.verse}
        </CardTitle>
        <CardDescription className="text-md italic">
          "{verse.text}"
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {explanation ? (
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{explanation}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">No explanation available for this verse yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

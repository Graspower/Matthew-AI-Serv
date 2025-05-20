'use client';

import type {Verse} from '@/services/bible';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import {Loader2} from 'lucide-react';

interface TeachingDisplayCardProps {
  queryTopic: string | null;
  teachingText: string | null;
  isLoading: boolean;
  error: string | null;
  versesFoundCount?: number; // Optional: to know if verses were found for the query
}

export function TeachingDisplayCard({queryTopic, teachingText, isLoading, error, versesFoundCount}: TeachingDisplayCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Teaching</CardTitle>
          {queryTopic && (
            <CardDescription className="text-md text-muted-foreground">
              Topic: "{queryTopic}"
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating teaching...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Teaching</CardTitle>
           {queryTopic && (
            <CardDescription className="text-md text-muted-foreground">
              Topic: "{queryTopic}"
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!queryTopic) {
    return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Teaching</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Search for a topic, and relevant verses will be used to generate a teaching here.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (versesFoundCount === 0 && !teachingText) {
     return (
      <Card className="shadow-lg rounded-xl h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">AI Teaching for "{queryTopic}"</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            No verses were found for "{queryTopic}". Please try a different search to generate a teaching.
          </p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg rounded-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          AI Teaching on "{queryTopic}"
        </CardTitle>
        {teachingText && (
            <CardDescription className="text-md text-muted-foreground">
                Based on relevant scriptures.
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {teachingText ? (
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{teachingText}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">No teaching available for this topic yet, or no verses were found.</p>
        )}
      </CardContent>
    </Card>
  );
}

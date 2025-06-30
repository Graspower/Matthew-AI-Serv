'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {Verse} from '@/services/bible';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {Loader2, Copy, Volume2, VolumeX} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeachingDisplayCardProps {
  queryTopic: string | null;
  teachingText: string | null;
  isLoading: boolean;
  error: string | null;
  versesFoundCount?: number;
}

export function TeachingDisplayCard({queryTopic, teachingText, isLoading, error, versesFoundCount}: TeachingDisplayCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synth = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      // Cleanup on component unmount
      return () => {
        if (synth.current?.speaking) {
          synth.current.cancel();
        }
      };
    }
    return () => {};
  }, []);

  const handleCopy = useCallback(() => {
    if (teachingText) {
      navigator.clipboard.writeText(teachingText)
        .then(() => {
          toast({ title: 'Copied!', description: 'The teaching has been copied to your clipboard.' });
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          toast({ title: 'Error', description: 'Failed to copy the teaching.', variant: 'destructive' });
        });
    }
  }, [teachingText, toast]);

  const handleSpeak = useCallback(() => {
    if (!synth.current || !teachingText) return;

    if (synth.current.speaking) {
      synth.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(teachingText);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Error', e);
      toast({ title: "Speech Error", description: "Could not play audio.", variant: "destructive" });
      setIsSpeaking(false);
    };
    synth.current.speak(utterance);
  }, [teachingText, toast]);
  
  useEffect(() => {
    // When the teaching text changes, stop any ongoing speech.
    if (synth.current?.speaking) {
      synth.current.cancel();
      setIsSpeaking(false);
    }
  }, [teachingText]);


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
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle className="text-xl font-semibold">
            AI Teaching on "{queryTopic}"
            </CardTitle>
            {teachingText && (
                <CardDescription className="text-md text-muted-foreground">
                    Based on relevant scriptures.
                </CardDescription>
            )}
        </div>
        {teachingText && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleCopy} title="Copy Teaching">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleSpeak} title={isSpeaking ? "Stop Reading" : "Read Aloud"}>
              {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
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

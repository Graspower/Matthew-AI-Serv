"use client";

import {useState, useEffect, useRef} from 'react';
import {useToast} from "@/hooks/use-toast";
import {interpretBibleVerseSearch} from "@/ai/flows/interpret-bible-verse-search";
import type {Verse} from "@/services/bible"; // Use import type
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Label} from "@/components/ui/label";
import {Switch} from "@/components/ui/switch";
import {useForm} from "react-hook-form";
import {Loader2, Mic} from "lucide-react";
import {Toaster} from "@/components/ui/toaster";

export function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const {register, handleSubmit, setValue} = useForm<{ query: string }>(); // Add type for useForm
  const [isLoading, setIsLoading] = useState(false);

  const [isVoiceReaderEnabled, setIsVoiceReaderEnabled] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number | null>(null);

  const verseTextRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const synth = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      return () => {
        if (synth.current) {
          synth.current.cancel();
        }
      };
    }
    return () => {};
  }, []);

  const speakVerse = (text: string, verseIndex: number, verse: Verse) => {
    if (!synth.current || typeof window === 'undefined') return;

    synth.current.cancel();

    if (isSpeaking && currentSpeakingVerseIndex === verseIndex) {
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
      setCurrentSpeakingVerseIndex(null);
      return;
    }

    const words = text.split(/(\s+)/).filter(word => word.trim().length > 0);
    let wordIndexRef = 0;

    setHighlightedWordIndex(-1);
    setCurrentSpeakingVerseIndex(verseIndex);
    setIsSpeaking(true);

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.pitch = 0.9;
    utterThis.rate = 1.0;

    utterThis.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word' && currentSpeakingVerseIndex === verseIndex) {
        let charCounter = 0;
        for (let i = 0; i < words.length; i++) {
           // Use event.charIndex to find the current word
           const wordLength = words[i].length;
           if (event.charIndex >= charCounter && event.charIndex < charCounter + wordLength) {
             wordIndexRef = i;
             break;
           }
           charCounter += wordLength;
           // Account for spaces between words
           if (i < words.length - 1) {
             const spaceMatch = text.substring(charCounter).match(/^\s+/);
             if (spaceMatch) {
               charCounter += spaceMatch[0].length;
             }
           }
        }
        setHighlightedWordIndex(wordIndexRef); // Update state directly
      }
    };

    utterThis.onend = () => {
       if (currentSpeakingVerseIndex === verseIndex) {
            setHighlightedWordIndex(-1);
            setIsSpeaking(false);
            setCurrentSpeakingVerseIndex(null);
       }
    };

     utterThis.onerror = (event: SpeechSynthesisEvent) => {
      console.error('SpeechSynthesisUtterance.onerror', event);
      toast({
        title: 'Speech Error',
        description: `Could not speak the verse. ${event.error || 'Unknown error'}`,
        variant: 'destructive',
      });
       if (currentSpeakingVerseIndex === verseIndex) {
          setHighlightedWordIndex(-1);
          setIsSpeaking(false);
          setCurrentSpeakingVerseIndex(null);
       }
    };

    synth.current.speak(utterThis);
  };

  const toggleVoiceReader = () => {
    const turningOn = !isVoiceReaderEnabled;
    setIsVoiceReaderEnabled(turningOn);

    if (!turningOn && isSpeaking && synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
      setCurrentSpeakingVerseIndex(null);
    }
  };

  const searchVerses = async (query: string) => {
    if (!query.trim()) {
       setVerses([]);
       setSearchTerm('');
       return;
    }
    setIsLoading(true);
    setSearchTerm(query);
    if (synth.current) {
        synth.current.cancel();
        setIsSpeaking(false);
        setHighlightedWordIndex(-1);
        setCurrentSpeakingVerseIndex(null);
    }
    try {
      const result = await interpretBibleVerseSearch({query: query});
      setVerses(result.verses || []);
    } catch (error: any) {
      console.error('Search failed', error);
      toast({
        title: 'Error',
        description: `Failed to perform search. ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
      setVerses([]);
    } finally {
      setIsLoading(false);
    }
  };

   useEffect(() => {
    if (!autoSearch) return;

    const handler = setTimeout(() => {
      if (searchTerm) {
        searchVerses(searchTerm);
      } else {
        setVerses([]);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, autoSearch]); // Dependencies remain the same


  useEffect(() => {
    if (typeof window === 'undefined' || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      return;
    }

    let recognition: SpeechRecognition | null = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isVoiceSearch && SpeechRecognition) { // Check if SpeechRecognition exists
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Voice search started');
          setVoiceSearchText('Listening...');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');

          setVoiceSearchText(transcript);
          setValue('query', transcript);
           if (!autoSearch) {
             if (event.results[event.results.length - 1].isFinal) {
               setSearchTerm(transcript);
             }
           } else {
             setSearchTerm(transcript);
           }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          setIsVoiceSearch(false);
          setVoiceSearchText('');
          const finalTranscript = (document.getElementById('bible-search-input') as HTMLInputElement)?.value;
          if (!autoSearch && finalTranscript) {
            searchVerses(finalTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
           let errorMessage = 'Could not perform voice search.';
            if (event.error === 'no-speech') {
                errorMessage = 'No speech detected. Please try again.';
            } else if (event.error === 'audio-capture') {
                errorMessage = 'Microphone error. Please ensure it is enabled and working.';
            } else if (event.error === 'not-allowed') {
                errorMessage = 'Permission denied. Please allow microphone access.';
            } else if (event.error === 'network') {
                errorMessage = 'Network error during voice recognition.';
            }
          toast({
            title: 'Voice Search Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsVoiceSearch(false);
          setVoiceSearchText('');
        };

        try {
            recognition.start();
        } catch (e) {
             console.error('Error starting recognition:', e);
             toast({
                title: 'Voice Search Error',
                description: 'Could not start voice search.',
                variant: 'destructive',
             });
             setIsVoiceSearch(false);
             setVoiceSearchText('');
        }

    }

    return () => {
      if (recognition) {
        recognition.stop();
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      }
    };
  }, [isVoiceSearch, toast, setValue, autoSearch]);


  const onSubmit = (data: { query: string }) => {
     if (!autoSearch) {
        searchVerses(data.query);
     }
  };

  const toggleVoiceSearch = () => {
     // Check for API support before toggling
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        setIsVoiceSearch((prev) => !prev);
    } else {
        toast({
            title: 'Unsupported Feature',
            description: 'Voice search is not supported in your browser.',
            variant: 'destructive',
        });
    }
  };

  const toggleAutoSearch = () => {
    setAutoSearch((prev) => !prev);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setValue('query', e.target.value);
     setSearchTerm(e.target.value);
  };

    const isJohn316 = (verse: Verse) => {
        return verse.book === 'John' && verse.chapter === 3 && verse.verse === 16;
    };

  const renderVerseText = (verse: Verse, verseIndex: number) => {
    const words = verse.text.split(/(\s+)/).filter(word => word.trim().length > 0);

    // Only apply highlighting logic for John 3:16
    if (isJohn316(verse)) {
        return words.map((word, wordIndex) => (
          <span
            key={wordIndex}
            style={{
              backgroundColor:
                isVoiceReaderEnabled && currentSpeakingVerseIndex === verseIndex && highlightedWordIndex === wordIndex
                  ? 'lightblue'
                  : 'transparent',
              transition: 'background-color 0.1s linear',
              display: 'inline',
            }}
          >
            {word}
            {wordIndex < words.length - 1 ? '\u00A0' : ''}
          </span>
        ));
    } else {
        // For other verses, just return the text without highlighting spans
        return verse.text;
    }
  };


  // Main component return
  return (
    <div className="w-full max-w-md p-4">
      <Toaster />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative flex items-center">
          <Input
            id="bible-search-input"
            type="text"
            placeholder={isVoiceSearch ? voiceSearchText : "Search for a Bible verse..."}
            {...register('query')}
            aria-label="Bible verse search"
            onChange={handleInputChange}
            className="pr-12"
            disabled={isVoiceSearch}
          />
          <Button
            type="button"
            variant={isVoiceSearch ? "destructive" : "secondary"}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            onClick={toggleVoiceSearch}
            aria-label={isVoiceSearch ? "Stop voice search" : "Start voice search"}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-search"
              checked={autoSearch}
              onCheckedChange={toggleAutoSearch}
              aria-label="Toggle auto search"
            />
            <Label htmlFor="auto-search">Auto Search</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="voice-reader"
              checked={isVoiceReaderEnabled}
              onCheckedChange={toggleVoiceReader}
              aria-label="Toggle voice reader"
            />
            <Label htmlFor="voice-reader">Voice Reader</Label>
          </div>
        </div>


        {!autoSearch && (
          <Button type="submit" className="w-full" disabled={isLoading || isVoiceSearch}>
             {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
             Search
          </Button>
        )}
      </form>


      {isLoading && (
        <div className="mt-6 flex justify-center items-center h-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      )}

      {!isLoading && searchTerm && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4 text-center">Results for "{searchTerm}"</h2>
          {verses.length > 0 ? (
            <div className="grid gap-4">
              {verses.map((verse, index) => (
                <Card key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}`} className="shadow-md rounded-lg overflow-hidden">
                  <CardHeader className="bg-secondary p-4">
                    <CardTitle className="text-lg font-semibold">{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p
                        ref={(el) => { verseTextRefs.current[index] = el; }}
                        className="text-base leading-relaxed"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {renderVerseText(verse, index)}
                    </p>
                    {/* Only show Speak button for John 3:16 if voice reader is enabled */}
                    {isVoiceReaderEnabled && isJohn316(verse) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => speakVerse(verse.text, index, verse)}
                        disabled={isSpeaking && currentSpeakingVerseIndex !== index}
                        aria-label={`Speak verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                      >
                        {isSpeaking && currentSpeakingVerseIndex === index ? (
                            <>
                                <Loader2 className="animate-spin mr-2 h-4 w-4" /> Speaking...
                            </>
                         ) : (
                            'Speak'
                         )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
             <Card className="shadow-md rounded-lg">
                <CardContent className="p-4 text-center text-muted-foreground">
                  <p>No matching verses found. Please try another search.</p>
                </CardContent>
             </Card>
          )}
        </div>
      )}
    </div>
  );
}

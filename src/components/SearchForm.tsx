
"use client";

import React, {type ChangeEvent, useState, useEffect, useRef} from 'react';
import {useToast} from "@/hooks/use-toast";
import {interpretBibleVerseSearch} from "@/ai/flows/interpret-bible-verse-search";
import type {Verse} from "@/services/bible";
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
import {Loader2, Mic, Volume2, VolumeX } from "lucide-react";


interface SearchFormProps {
  onSearchResults: (query: string, verses: Verse[]) => void;
}

export function SearchForm({ onSearchResults }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const {register, handleSubmit, setValue, getValues, watch} = useForm<{ query: string }>();
  const [isLoading, setIsLoading] = useState(false);

  const [isVoiceReaderEnabled, setIsVoiceReaderEnabled] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number | null>(null);


  const verseTextRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const synth = useRef<SpeechSynthesis | null>(null);
  const [isSpeechRecognitionAPIAvailable, setIsSpeechRecognitionAPIAvailable] = useState(false);

  const formQuery = watch('query');


  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        setIsSpeechRecognitionAPIAvailable(true);
      } else {
        setIsSpeechRecognitionAPIAvailable(false);
      }

      return () => {
        if (synth.current) {
          synth.current.cancel();
        }
      };
    }
    return () => {};
  }, []);


  const speakVerse = (text: string, verseIndex: number, verse: Verse, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!synth.current || typeof window === 'undefined') return;

    synth.current.cancel();

    if (isSpeaking && currentSpeakingVerseIndex === verseIndex) {
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
      setCurrentSpeakingVerseIndex(null);
      return;
    }

    if (isSpeaking || currentSpeakingVerseIndex !== null) {
        setHighlightedWordIndex(-1);
    }

    setHighlightedWordIndex(-1);
    setCurrentSpeakingVerseIndex(verseIndex);
    setIsSpeaking(true);

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.pitch = 0.9;
    utterThis.rate = 1.0;

    const words = text.split(/(\s+|\b)/).filter(word => word.trim().length > 0);

    utterThis.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word' && currentSpeakingVerseIndex === verseIndex && synth.current && synth.current.speaking) {
            let currentWordIdx = -1;
            let accumulatedCharLength = 0;

            for (let i = 0; i < words.length; i++) {
                const wordLength = words[i].length;
                if (event.charIndex >= accumulatedCharLength && event.charIndex < accumulatedCharLength + wordLength) {
                    currentWordIdx = i;
                    break;
                }
                accumulatedCharLength += wordLength + 1;
            }
            if(currentWordIdx !== -1){
                 setHighlightedWordIndex(currentWordIdx);
            }
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
       onSearchResults(query, []);
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
      const foundVerses = result.verses || [];
      setVerses(foundVerses);
      onSearchResults(query, foundVerses);
    } catch (error: any) {
      console.error('Search failed', error);
      toast({
        title: 'Error',
        description: `Failed to perform search. ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
      setVerses([]);
      onSearchResults(query, []);
    } finally {
      setIsLoading(false);
    }
  };

   useEffect(() => {
    if (!autoSearch) return;

    const handler = setTimeout(() => {
      const currentFormQuery = getValues('query');
      if (currentFormQuery && currentFormQuery.trim()) {
        searchVerses(currentFormQuery);
      } else {
        setVerses([]);
        onSearchResults('', []);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [formQuery, autoSearch, onSearchResults, getValues]);


  useEffect(() => {
    if (!isSpeechRecognitionAPIAvailable) {
      return;
    }

    let recognition: SpeechRecognition | null = null;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isVoiceSearch && SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Voice search started');
          setVoiceSearchText('Listening...');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }

          setVoiceSearchText(finalTranscript);
          if (event.results[event.results.length - 1].isFinal) {
            setValue('query', finalTranscript, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            if (autoSearch) {
                searchVerses(finalTranscript);
            }
          }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          const finalTranscript = getValues('query');
          setIsVoiceSearch(false);
          setVoiceSearchText('');

          if (finalTranscript && finalTranscript.trim()) {
            setSearchTerm(finalTranscript);
            if (!autoSearch) {
              handleSubmit(onSubmit)();
            }
          } else if (!autoSearch) {
            setVerses([]);
            onSearchResults('', []);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error. Code:', event.error, 'Message:', event.message);
           console.error(
            'Full SpeechRecognitionErrorEvent object:', event
          );

           let errorMessage = 'Could not perform voice search.';
           if (event.error) {
                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'No speech detected. Please try again.';
                        break;
                    case 'audio-capture':
                        errorMessage = 'Microphone error. Please ensure it is enabled and working.';
                        break;
                    case 'not-allowed':
                        errorMessage = 'Permission denied. Please allow microphone access.';
                        break;
                    case 'network':
                        errorMessage = 'Network error during voice recognition.';
                        break;
                    case 'aborted':
                        errorMessage = 'Speech recognition aborted.';
                        break;
                    case 'service-not-allowed':
                        errorMessage = 'Speech recognition service is not allowed. Check browser settings.';
                        break;
                    case 'bad-grammar':
                        errorMessage = 'Error in speech grammar. Please try again.';
                        break;
                    case 'language-not-supported':
                        errorMessage = 'The specified language is not supported for speech recognition.';
                        break;
                    default:
                        errorMessage = `Voice search error: ${event.error}. ${event.message || 'Please try again.'}`;
                        break;
                }
            } else if (event.message) {
                 errorMessage = `Voice search error: ${event.message}`;
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
        } catch (e: any) {
             console.error('Error starting speech recognition. Name:', e?.name, 'Message:', e?.message, 'Full error object:', e);
             toast({
                title: 'Voice Search Error',
                description: `Could not start voice search. ${e?.message || 'Please check microphone permissions and setup.'}`,
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
  }, [isVoiceSearch, toast, setValue, autoSearch, handleSubmit, isSpeechRecognitionAPIAvailable, getValues, onSearchResults]);


  const onSubmit = (data: { query: string }) => {
     if (!autoSearch) {
        searchVerses(data.query);
     }
  };

  const toggleVoiceSearch = () => {
    if (!isSpeechRecognitionAPIAvailable) {
        toast({
            title: 'Unsupported Feature',
            description: 'Voice search is not supported in your browser.',
            variant: 'destructive',
        });
        return;
    }
    setIsVoiceSearch((prev) => !prev);
  };

  const toggleAutoSearch = () => {
    setAutoSearch((prev) => {
        if (!prev && getValues('query')?.trim()) {
            searchVerses(getValues('query'));
        }
        return !prev;
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
     const newQuery = e.target.value;
     if (!newQuery.trim() && !autoSearch) {
        setVerses([]);
        onSearchResults('', []);
     }
  };

    const isJohn316 = (verse: Verse) => {
        return verse.book.toLowerCase() === 'john' && verse.chapter === 3 && verse.verse === 16;
    };


  const renderVerseText = (text: string, verseIndex: number, verse: Verse) => {
    if (isVoiceReaderEnabled && isJohn316(verse)) {
        const words = text.split(/(\s+|\b)/).filter(word => word.trim().length > 0);
        return words.map((word, wordIdx) => (
          <span
            key={wordIdx}
            style={{
              backgroundColor:
                currentSpeakingVerseIndex === verseIndex &&
                highlightedWordIndex === wordIdx
                  ? 'var(--accent)'
                  : 'transparent',
              color: currentSpeakingVerseIndex === verseIndex && highlightedWordIndex === wordIdx ? 'var(--accent-foreground)' : 'inherit',
              transition: 'background-color 0.1s linear, color 0.1s linear',
              display: 'inline',
            }}
          >
            {word.includes('\n') ? word.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < word.split('\n').length - 1 && <br/>}</React.Fragment>) : word}
            {text.split(/(\s+|\b)/).filter(w => w.trim().length > 0)[wordIdx + 1]?.match(/^\s+$/) ? '\u00A0' : ''}

          </span>
        ));
    }
    return text.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < text.split('\n').length - 1 && <br/>}</React.Fragment>);
  };



  return (
    <div className="w-full max-w-md p-4 mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative flex items-center">
          <Input
            id="bible-search-input"
            type="text"
            placeholder={isVoiceSearch ? voiceSearchText : "Search Bible topics..."}
            {...register('query')}
            aria-label="Bible verse search"
            onChange={handleInputChange}
            className="pr-12"
            disabled={isVoiceSearch && voiceSearchText === 'Listening...'}
          />
          <Button
            type="button"
            variant={isVoiceSearch ? "destructive" : "secondary"}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            onClick={toggleVoiceSearch}
            disabled={!isSpeechRecognitionAPIAvailable}
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
          <Button type="submit" className="w-full" disabled={isLoading || (isVoiceSearch && voiceSearchText === 'Listening...')}>
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
          <h2 className="text-xl font-semibold mb-3 text-center">Results for "{searchTerm}"</h2>
          {verses.length > 0 ? (
            <div className="grid gap-4">
              {verses.map((verse, index) => (
                <Card
                  key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}`}
                  className="shadow-md rounded-lg overflow-hidden cursor-default transition-colors"
                  tabIndex={0}
                  role="article"
                  aria-label={`Verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                >
                  <CardHeader className="bg-secondary/70 p-3 flex flex-row justify-between items-center">
                    <CardTitle className="text-md font-semibold">{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                     {isVoiceReaderEnabled && isJohn316(verse) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => speakVerse(verse.text, index, verse, e)}
                        disabled={isSpeaking && currentSpeakingVerseIndex !== index && currentSpeakingVerseIndex !== null}
                        aria-label={`Speak verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        {isSpeaking && currentSpeakingVerseIndex === index ? (
                            <>
                                <VolumeX className="mr-1 h-3 w-3" /> Stop
                            </>
                         ) : (
                            <>
                                <Volume2 className="mr-1 h-3 w-3" /> Speak
                            </>
                         )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-3">
                    <p
                        ref={(el) => { verseTextRefs.current[index] = el; }}
                        className="text-sm leading-relaxed"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {renderVerseText(verse.text, index, verse)}
                    </p>
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


"use client";

import React, {type ChangeEvent, useState, useEffect, useRef, useCallback} from 'react';
import {useToast} from "@/hooks/use-toast";
import {interpretBibleVerseSearch} from "@/ai/flows/interpret-bible-verse-search";
import type {Verse, VerseReference} from "@/services/bible";
import {getVerse} from "@/services/bible";
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
import {Loader2, Mic, Volume2, VolumeX, BookOpenText } from "lucide-react";
import { useSettings, type Language, type BibleTranslation } from '@/contexts/SettingsContext';
import { ScrollArea } from '@/components/ui/scroll-area';


interface SearchFormProps {
  onSearchResults: (query: string, verses: Verse[]) => void;
  onVerseSelect?: (verse: Verse) => void;
  onReadInReaderRequest?: (verse: Verse) => void; // For "Read in Reader" button
}

export function SearchForm({ onSearchResults, onVerseSelect, onReadInReaderRequest }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedVerses, setDisplayedVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const {register, handleSubmit, setValue, getValues, watch, formState: { isSubmitting }} = useForm<{ query: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const { language, bibleTranslation } = useSettings();

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
    utterThis.pitch = 1.0;
    utterThis.rate = 0.9;
    
    if (language && typeof window !== 'undefined' && synth.current && synth.current.getVoices().some(voice => voice.lang.startsWith(language))) {
        utterThis.lang = language;
    } else {
        utterThis.lang = 'en-US'; 
    }


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
                accumulatedCharLength += wordLength + (text.substring(accumulatedCharLength + wordLength).match(/^(\s+|\b)/)?.[0]?.length || 0);
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


  const searchAndFetchVerses = useCallback(async (query: string) => {
    if (!query.trim()) {
       setDisplayedVerses([]);
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
      const result = await interpretBibleVerseSearch({
        query: query,
        language: language,
        bibleTranslation: bibleTranslation
      });
      const verseReferences = result.verseReferences || [];
      
      const fetchedVersesPromises = verseReferences.map(ref =>
        getVerse(bibleTranslation, ref.book, ref.chapter, ref.verse) 
      );
      const fetchedVersesData = await Promise.all(fetchedVersesPromises);

      const successfullyFetchedVerses = fetchedVersesData
        .filter(v => v !== null)
        .map(v => ({
            ...v,
            languageContext: language, 
            translationContext: bibleTranslation 
        })) as Verse[];


      setDisplayedVerses(successfullyFetchedVerses);
      onSearchResults(query, successfullyFetchedVerses);

    } catch (error: any) {
      console.error('Search or verse fetching failed', error);
      toast({
        title: 'Error',
        description: `Failed to perform search or fetch verse details. ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
      setDisplayedVerses([]);
      onSearchResults(query, []);
    } finally {
      setIsLoading(false);
    }
  }, [language, bibleTranslation, onSearchResults, toast]); 


  const autoSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const currentQueryValue = formQuery?.trim();

    if (autoSearchTimeoutRef.current) {
      clearTimeout(autoSearchTimeoutRef.current);
    }

    if (autoSearch) {
      if (currentQueryValue) {
        autoSearchTimeoutRef.current = setTimeout(() => {
          searchAndFetchVerses(currentQueryValue);
        }, 500);
      } else {
        setDisplayedVerses([]);
        if (searchTerm) { 
            setSearchTerm('');
            onSearchResults('', []);
        }
      }
    } else {
      if (!currentQueryValue && searchTerm) { 
        setDisplayedVerses([]);
        setSearchTerm('');
        onSearchResults('', []);
      }
    }
    return () => {
        if (autoSearchTimeoutRef.current) {
            clearTimeout(autoSearchTimeoutRef.current);
        }
    }
  }, [formQuery, autoSearch, searchAndFetchVerses, onSearchResults, searchTerm]);


  const settingsChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousSearchAndFetchVersesRef = useRef(searchAndFetchVerses);

  useEffect(() => {
    const currentQueryValue = formQuery?.trim();

    if (settingsChangeTimeoutRef.current) {
        clearTimeout(settingsChangeTimeoutRef.current);
    }
    // Check if searchAndFetchVerses function itself has changed due to language/translation dependencies
    if (previousSearchAndFetchVersesRef.current !== searchAndFetchVerses) {
        if (!autoSearch && currentQueryValue) {
          // If autoSearch is OFF, there's a query, and lang/transl changed, then re-search
          settingsChangeTimeoutRef.current = setTimeout(() => {
            searchAndFetchVerses(currentQueryValue);
          }, 500);
        }
        // Always update the ref to the latest version of searchAndFetchVerses
        previousSearchAndFetchVersesRef.current = searchAndFetchVerses;
    }
    
    return () => {
        if (settingsChangeTimeoutRef.current) {
            clearTimeout(settingsChangeTimeoutRef.current);
        }
    }
  }, [formQuery, autoSearch, searchAndFetchVerses]);


  useEffect(() => {
    if (!isSpeechRecognitionAPIAvailable) {
      return;
    }

    let recognition: SpeechRecognition | null = null;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isVoiceSearch && SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = language === 'zh' ? 'zh-CN' : language; 

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
          }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          setIsVoiceSearch(false);
          setVoiceSearchText('');
          const finalTranscribedText = getValues('query'); 

          if (!autoSearch && finalTranscribedText && finalTranscribedText.trim()) {
              searchAndFetchVerses(finalTranscribedText);
          } else if (!autoSearch && (!finalTranscribedText || !finalTranscribedText.trim())) {
             setDisplayedVerses([]);
             setSearchTerm('');
             onSearchResults('', []);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === 'no-speech') {
            console.info('Speech recognition: No speech detected.', 'Message:', event.message || '(No message)');
          } else {
            console.error('Speech recognition error. Code:', event.error, 'Message:', event.message);
          }

           let errorMessage = 'Could not perform voice search.';
           if (event.error) {
                switch (event.error) {
                    case 'no-speech': errorMessage = 'No speech detected. Please try again.'; break;
                    case 'audio-capture': errorMessage = 'Microphone error. Please ensure it is enabled and working.'; break;
                    case 'not-allowed': errorMessage = 'Permission denied. Please allow microphone access.'; break;
                    case 'network': errorMessage = 'Network error during voice recognition.'; break;
                    case 'aborted': errorMessage = 'Speech recognition aborted.'; break;
                    case 'service-not-allowed': errorMessage = 'Speech recognition service is not allowed. Check browser settings.'; break;
                    case 'bad-grammar': errorMessage = 'Error in speech grammar. Please try again.'; break;
                    case 'language-not-supported': errorMessage = `Voice search in ${language} is not supported by your browser.`; break;
                    default: errorMessage = `Voice search error: ${event.error}. ${event.message || 'Please try again.'}`; break;
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
             console.error('Error starting speech recognition.', e);
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
  }, [isVoiceSearch, toast, setValue, autoSearch, getValues, onSearchResults, isSpeechRecognitionAPIAvailable, language, bibleTranslation, searchAndFetchVerses]);


  const onSubmit = (data: { query: string }) => {
     if (!autoSearch) { 
        searchAndFetchVerses(data.query);
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
    setAutoSearch((prevAutoSearchState) => {
        const newAutoSearchState = !prevAutoSearchState;
        if (newAutoSearchState && getValues('query')?.trim()) { 
            searchAndFetchVerses(getValues('query'));
        }
        return newAutoSearchState;
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
     const newQuery = e.target.value;
     setValue('query', newQuery, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
     if (!autoSearch && !newQuery.trim()) {
        setDisplayedVerses([]);
        setSearchTerm('');
        onSearchResults('', []);
     }
  };

    const isJohn316KJV = (verse: Verse) => { // Example, make dynamic based on selected translation if needed
        return verse.book.toLowerCase() === 'john' && verse.chapter === 3 && verse.verse === 16 && verse.translationContext === 'KJV';
    };


  const renderVerseText = (text: string, verseIndex: number, verse: Verse) => {
    // Enable voice reader for specific verses or based on broader criteria if needed
    if (isVoiceReaderEnabled && isJohn316KJV(verse)) { 
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

  interface DisplayedVerse extends Verse {
    languageContext?: Language;
    translationContext?: BibleTranslation;
  }


  return (
    <div className="w-full h-full flex flex-col">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative flex items-center">
          <Input
            id="bible-search-input"
            type="text"
            placeholder={isVoiceSearch ? voiceSearchText : "Search Bible topics, questions ..."}
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
          <Button type="submit" className="w-full" disabled={isLoading || (isVoiceSearch && voiceSearchText === 'Listening...') || isSubmitting}>
             {(isLoading || isSubmitting) ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
             Search
          </Button>
        )}
      </form>


      {isLoading && (
        <div className="mt-6 flex flex-grow justify-center items-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      )}

      {!isLoading && searchTerm && (
        <div className="mt-6 flex-grow overflow-hidden flex flex-col">
          <h2 className="text-xl font-semibold mb-3 text-center flex-shrink-0">Results for "{searchTerm}"</h2>
          {displayedVerses.length > 0 ? (
            <ScrollArea className="flex-grow">
                <div className="grid gap-4 pr-4">
                {displayedVerses.map((verse, index) => (
                    <Card
                    key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}-${verse.languageContext || language}-${verse.translationContext || bibleTranslation}`} 
                    className="shadow-md rounded-lg overflow-hidden transition-colors hover:bg-muted/10"
                    tabIndex={0}
                    role="article"
                    aria-label={`Verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                    >
                    <CardHeader 
                        className="bg-secondary/70 p-3 flex flex-row justify-between items-center cursor-pointer"
                        onClick={() => onVerseSelect && onVerseSelect(verse)}
                    >
                        <CardTitle className="text-md font-semibold">{verse.book} {verse.chapter}:{verse.verse} ({verse.translationContext || bibleTranslation})</CardTitle>
                        <div className="flex items-center gap-1">
                        {isVoiceReaderEnabled && isJohn316KJV(verse) && ( 
                            <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); speakVerse(verse.text, index, verse, e); }}
                            disabled={isSpeaking && currentSpeakingVerseIndex !== index && currentSpeakingVerseIndex !== null}
                            aria-label={`Speak verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                            >
                            {isSpeaking && currentSpeakingVerseIndex === index ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                            </Button>
                        )}
                        {onReadInReaderRequest && (
                            <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); onReadInReaderRequest(verse); }}
                            aria-label={`Read ${verse.book} ${verse.chapter}:${verse.verse} in Bible Reader`}
                            title="Read in Bible Reader"
                            >
                            <BookOpenText className="h-4 w-4" />
                            </Button>
                        )}
                        </div>
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
            </ScrollArea>
          ) : (
             <Card className="shadow-md rounded-lg mt-4">
                <CardContent className="p-4 text-center text-muted-foreground">
                  <p>No matching verses found for your query in the selected language ({language.toUpperCase()}) and translation ({bibleTranslation}).</p>
                </CardContent>
             </Card>
          )}
        </div>
      )}
    </div>
  );
}

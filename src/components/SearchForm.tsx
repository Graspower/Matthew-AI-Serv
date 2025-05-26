
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
  onSearchResults: (query: string, verses: Verse[]) => void; // Changed prop name and signature
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

    const words = text.split(/(\\s+|\\b)/).filter(word => word.trim().length > 0);
    let charIndex = 0;

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
                // Approximate boundary by adding word length + 1 for space/boundary
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
       onSearchResults(query, []); // Notify parent even if query is empty
       return;
    }
    setIsLoading(true);
    setSearchTerm(query); // Keep track of the active search term for display
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
      onSearchResults(query, foundVerses); // Pass query and verses to parent
    } catch (error: any) {
      console.error('Search failed', error);
      toast({
        title: 'Error',
        description: `Failed to perform search. ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
      setVerses([]);
      onSearchResults(query, []); // Pass query and empty verses on error
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

 setVoiceSearchText(finalTranscript); // Update the text displayed in the input
 if (event.results[event.results.length - 1].isFinal) {
 setValue('query', finalTranscript, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
             // If autoSearch is on, the useEffect for formQuery will trigger search.
             // If autoSearch is off, we wait for onend to submit.
 searchVerses(finalTranscript); // Trigger search with the final transcript
          }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          const finalTranscript = getValues('query');
          setIsVoiceSearch(false);
          setVoiceSearchText(''); 
          
          if (finalTranscript && finalTranscript.trim()) {
            setSearchTerm(finalTranscript); // Ensure searchTerm is set to the final transcript
            if (!autoSearch) {
              handleSubmit(onSubmit)(); // Trigger form submission if not auto-searching
            }
          } else if (!autoSearch) {
            // If final transcript is empty and not auto-searching, clear results
            setVerses([]);
            onSearchResults('', []);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error details:', event);
           console.error(
            'Speech recognition error details. Event Object:', event,
            'Error Code:', event.error,
            'Message:', event.message
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
                        // Aborted is often user-initiated or due to timeout, might not always be a hard error
                        // For now, we'll treat it as an error to notify the user.
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
             console.error('Error starting speech recognition:', e, 'Message:', e?.message, 'Name:', e?.name);
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
     if (!autoSearch) { // Only submit manually if autoSearch is off
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
    if (isVoiceSearch) {
      // If currently voice searching, stop it.
      // The onend handler of SpeechRecognition will manage state.
      // This might require access to the recognition object if it's not stopping correctly.
    }
    setIsVoiceSearch((prev) => !prev);
  };

  const toggleAutoSearch = () => {
    setAutoSearch((prev) => {
        // If turning auto-search on and there's a query, trigger search
        if (!prev && getValues('query')?.trim()) {
            searchVerses(getValues('query'));
        }
        return !prev;
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
     const newQuery = e.target.value;
     // setValue('query', newQuery); // This is handled by react-hook-form's register
     // setSearchTerm(newQuery); // This is now handled by formQuery via watch
     if (!newQuery.trim() && !autoSearch) { // If input cleared and not auto-searching
        setVerses([]);
        onSearchResults('', []); // Notify parent with empty query and verses
     }
  };

    const isJohn316 = (verse: Verse) => {
        return verse.book.toLowerCase() === 'john' && verse.chapter === 3 && verse.verse === 16;
    };


  const renderVerseText = (text: string, verseIndex: number, verse: Verse) => {
    if (isVoiceReaderEnabled && isJohn316(verse)) {
        const words = text.split(/(\\s+|\\b)/).filter(word => word.trim().length > 0);
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
            {/* Add a non-breaking space if the next "word" is just whitespace, to preserve layout */}
            {text.split(/(\\s+|\\b)/).filter(w => w.trim().length > 0)[wordIdx + 1]?.match(/^\\s+$/) ? '\\u00A0' : ''}

          </span>
        ));
    }
    // For other verses or if voice reader is disabled, return plain text
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
            onChange={handleInputChange} // react-hook-form handles value, this is for auto-search logic
            className="pr-12" // Make space for the mic button
            disabled={isVoiceSearch && voiceSearchText === 'Listening...'}
          />
          <Button
            type="button"
            variant={isVoiceSearch ? "destructive" : "secondary"}
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8" // Adjusted for better positioning
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


      {isLoading && ( // Show loader if isLoading is true
        <div className="mt-6 flex justify-center items-center h-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      )}

      {!isLoading && searchTerm && ( // Show results if not loading and searchTerm exists
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3 text-center">Results for "{searchTerm}"</h2>
          {verses.length > 0 ? (
            <div className="grid gap-4">
              {verses.map((verse, index) => (
                <Card
                  key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}`}
                  className="shadow-md rounded-lg overflow-hidden cursor-default transition-colors"
                  // onClick={() => onVerseSelect(verse)} // Removed this to prevent single verse explanation
                  tabIndex={0}
                  role="article" // Changed role as it's not a button anymore
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
                        style={{ whiteSpace: 'pre-wrap' }} // Preserve newlines from verse text
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


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
  onVerseSelect: (verse: Verse) => void;
}

export function SearchForm({ onSearchResults, onVerseSelect }: SearchFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const {register, handleSubmit, setValue, getValues, watch, formState: { isSubmitting }} = useForm<{ query: string }>();
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
    event.stopPropagation(); // Prevent card click when clicking speak button
    if (!synth.current || typeof window === 'undefined') return;

    synth.current.cancel(); // Stop any ongoing speech

    // If currently speaking this verse, stop it
    if (isSpeaking && currentSpeakingVerseIndex === verseIndex) {
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
      setCurrentSpeakingVerseIndex(null);
      return;
    }

    // If speaking another verse, or just starting, clear previous highlighting
    if (isSpeaking || currentSpeakingVerseIndex !== null) {
        setHighlightedWordIndex(-1); // Clear highlighting from any previous verse
    }

    setHighlightedWordIndex(-1); // Reset for the new verse
    setCurrentSpeakingVerseIndex(verseIndex);
    setIsSpeaking(true);

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.pitch = 0.9;
    utterThis.rate = 1.0;

    const words = text.split(/(\s+|\b)/).filter(word => word.trim().length > 0);

    utterThis.onboundary = (event: SpeechSynthesisEvent) => {
        // Ensure speech is still active for this specific verse
        if (event.name === 'word' && currentSpeakingVerseIndex === verseIndex && synth.current && synth.current.speaking) {
            let currentWordIdx = -1;
            let accumulatedCharLength = 0;

            // Find the index of the currently spoken word
            for (let i = 0; i < words.length; i++) {
                const wordLength = words[i].length;
                // Check if the event's character index falls within the current word's range
                if (event.charIndex >= accumulatedCharLength && event.charIndex < accumulatedCharLength + wordLength) {
                    currentWordIdx = i;
                    break;
                }
                // Add word length and 1 for the space/boundary character
                accumulatedCharLength += wordLength + (text.substring(accumulatedCharLength + wordLength).match(/^(\s+|\b)/)?.[0]?.length || 0);
            }
            if(currentWordIdx !== -1){
                 setHighlightedWordIndex(currentWordIdx);
            }
        }
    };


    utterThis.onend = () => {
       // Only reset if this was the verse that just finished speaking
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
      // Only reset if this was the verse that had an error
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

    // If turning off voice reader and speech is active, stop it
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
       setSearchTerm(''); // Clear search term as well
       onSearchResults(query, []); // Notify parent even if query is empty
       return;
    }
    setIsLoading(true);
    setSearchTerm(query); // Set search term for display
    // Cancel any ongoing speech before starting a new search
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
      onSearchResults(query, foundVerses); // Pass both query and verses
    } catch (error: any) {
      console.error('Search failed', error);
      toast({
        title: 'Error',
        description: `Failed to perform search. ${error.message || 'Please try again.'}`,
        variant: 'destructive',
      });
      setVerses([]); // Clear verses on error
      onSearchResults(query, []); // Notify parent about the error (empty verses)
    } finally {
      setIsLoading(false);
    }
  };

   // Effect for auto-search
   useEffect(() => {
    if (!autoSearch) return;

    const handler = setTimeout(() => {
      const currentFormQuery = getValues('query'); // Get current value from react-hook-form
      if (currentFormQuery && currentFormQuery.trim()) {
        searchVerses(currentFormQuery);
      } else {
        // If autoSearch is on and input becomes empty, clear results
        setVerses([]);
        setSearchTerm('');
        onSearchResults('', []);
      }
    }, 500); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [formQuery, autoSearch, onSearchResults, getValues]); // formQuery comes from watch('query')


  // Effect for voice search
  useEffect(() => {
    if (!isSpeechRecognitionAPIAvailable) {
      return;
    }

    let recognition: SpeechRecognition | null = null;
    // Ensure window context for SpeechRecognition APIs
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isVoiceSearch && SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = false; // Stop after first final result
        recognition.interimResults = true; // Get interim results for responsiveness
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Voice search started');
          setVoiceSearchText('Listening...'); // Placeholder while listening
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }

          setVoiceSearchText(finalTranscript); // Update placeholder with interim/final transcript
          // Once a final result is received
          if (event.results[event.results.length - 1].isFinal) {
            setValue('query', finalTranscript, { shouldValidate: true, shouldDirty: true, shouldTouch: true }); // Update form state
            if (autoSearch) { // If auto-search is on, trigger search
                searchVerses(finalTranscript);
            }
          }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          const finalTranscript = getValues('query'); // Get the most recent value, possibly set by onresult
          setIsVoiceSearch(false); // Turn off voice search mode
          setVoiceSearchText(''); // Clear the voice search placeholder

          // If there's a final transcript and auto-search is off, submit the form
          if (finalTranscript && finalTranscript.trim()) {
            setSearchTerm(finalTranscript); // Update displayed search term
            if (!autoSearch) {
              handleSubmit(onSubmit)(); // Programmatically submit the form
            }
          } else if (!autoSearch) {
            // If voice search ends with no input and auto-search is off, clear results
            setVerses([]);
            setSearchTerm('');
            onSearchResults('', []);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === 'no-speech') {
            console.info('Speech recognition: No speech detected.', 'Message:', event.message || '(No message)');
            console.info('Full SpeechRecognitionErrorEvent object for no-speech:', event);
          } else {
            console.error('Speech recognition error. Code:', event.error, 'Message:', event.message);
            console.error('Full SpeechRecognitionErrorEvent object:', event);
          }

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
             console.error('Error starting speech recognition.', 'Name:', e?.name, 'Message:', e?.message);
             console.error('Full error object on start:', e);
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
  }, [isVoiceSearch, toast, setValue, autoSearch, handleSubmit, isSpeechRecognitionAPIAvailable, getValues, onSearchResults, searchVerses]); // Added searchVerses to dependency array


  const onSubmit = (data: { query: string }) => {
     // Only search if autoSearch is off. If on, useEffect handles it.
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
        // If turning autoSearch ON and there's a query, perform search
        if (!prev && getValues('query')?.trim()) {
            searchVerses(getValues('query'));
        }
        return !prev;
    });
  };

  // Handle manual input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
     const newQuery = e.target.value;
     // If autoSearch is OFF and input becomes empty, clear results
     if (!autoSearch && !newQuery.trim()) {
        setVerses([]);
        setSearchTerm('');
        onSearchResults('', []);
     }
     // If autoSearch is ON, the useEffect for formQuery will handle it
  };

    // Helper function to check if a verse is John 3:16
    const isJohn316 = (verse: Verse) => {
        return verse.book.toLowerCase() === 'john' && verse.chapter === 3 && verse.verse === 16;
    };


  // Function to render verse text with word highlighting for John 3:16
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
                  ? 'var(--accent)' // Use accent color from globals.css
                  : 'transparent',
              color: currentSpeakingVerseIndex === verseIndex && highlightedWordIndex === wordIdx ? 'var(--accent-foreground)' : 'inherit', // Use accent foreground
              transition: 'background-color 0.1s linear, color 0.1s linear', // Smooth transition
              display: 'inline', // Ensure spans flow like text
            }}
          >
            {/* Handle newlines within words if any, though unlikely for single words */}
            {word.includes('\n') ? word.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < word.split('\n').length - 1 && <br/>}</React.Fragment>) : word}
            {/* Preserve spaces between words by checking the next boundary character */}
            {text.split(/(\s+|\b)/).filter(w => w.trim().length > 0)[wordIdx + 1]?.match(/^\s+$/) ? '\u00A0' : ''}

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
            onChange={handleInputChange}
            className="pr-12" // Padding right for the mic button
            disabled={isVoiceSearch && voiceSearchText === 'Listening...'} // Disable input while "Listening..."
          />
          <Button
            type="button" // Important: type="button" to prevent form submission
            variant={isVoiceSearch ? "destructive" : "secondary"} // Change variant when active
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8" // Position inside input
            onClick={toggleVoiceSearch}
            disabled={!isSpeechRecognitionAPIAvailable} // Disable if API not available
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

        {!autoSearch && ( // Only show manual search button if autoSearch is OFF
          <Button type="submit" className="w-full" disabled={isLoading || (isVoiceSearch && voiceSearchText === 'Listening...') || isSubmitting}>
             {(isLoading || isSubmitting) ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
             Search
          </Button>
        )}
      </form>


      {/* Loading indicator for search results */}
      {isLoading && (
        <div className="mt-6 flex justify-center items-center h-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      )}

      {/* Display search term and results */}
      {!isLoading && searchTerm && ( // Only show results section if a search has been performed
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-3 text-center">Results for "{searchTerm}"</h2>
          {verses.length > 0 ? (
            <div className="grid gap-4">
              {verses.map((verse, index) => (
                <Card
                  key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}`}
                  className="shadow-md rounded-lg overflow-hidden cursor-pointer transition-colors hover:bg-muted/10"
                  onClick={() => onVerseSelect(verse)} // Make card clickable
                  tabIndex={0} // Make it focusable
                  role="article"
                  aria-label={`Verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                >
                  <CardHeader className="bg-secondary/70 p-3 flex flex-row justify-between items-center">
                    <CardTitle className="text-md font-semibold">{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                     {/* Show Speak button only if voice reader is enabled and it's John 3:16 */}
                     {isVoiceReaderEnabled && isJohn316(verse) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => speakVerse(verse.text, index, verse, e)}
                        disabled={isSpeaking && currentSpeakingVerseIndex !== index && currentSpeakingVerseIndex !== null} // Disable other speak buttons while one is active
                        aria-label={`Speak verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                        className="text-xs px-2 py-1 h-auto" // Smaller button
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
             // Message when no verses are found for the searchTerm
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

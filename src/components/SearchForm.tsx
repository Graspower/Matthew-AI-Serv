"use client";

import type { ChangeEvent} from 'react'; // Use import type
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
import {Loader2, Mic, Volume2, VolumeX } from "lucide-react";
import {Toaster} from "@/components/ui/toaster";


export function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const {register, handleSubmit, setValue, getValues} = useForm<{ query: string }>(); // Add getValues
  const [isLoading, setIsLoading] = useState(false);

  const [isVoiceReaderEnabled, setIsVoiceReaderEnabled] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number | null>(null);


  const verseTextRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const synth = useRef<SpeechSynthesis | null>(null);
  const [isSpeechRecognitionAPIAvailable, setIsSpeechRecognitionAPIAvailable] = useState(false);


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


  const speakVerse = (text: string, verseIndex: number, verse: Verse) => {
    if (!synth.current || typeof window === 'undefined') return;

    synth.current.cancel();

    if (isSpeaking && currentSpeakingVerseIndex === verseIndex) {
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
      setCurrentSpeakingVerseIndex(null);
      return;
    }

    if (isSpeaking) {
        setHighlightedWordIndex(-1); // Reset highlight for previous verse if any
    }


    const words = text.split(/(\s+|\b)(?![^<]*>)/).filter(word => word.trim().length > 0);
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
            let currentWordIndex = -1;
            // Ensure ref is current and textContent exists
            const plainTextContent = verseTextRefs.current[verseIndex]?.textContent || '';
            const plainWords = plainTextContent.split(/(\s+|\b)/).filter(w => w.trim().length > 0);

            for (let i = 0; i < plainWords.length; i++) {
                 const wordLength = plainWords[i].length;
                 if (event.charIndex >= charCounter && event.charIndex < charCounter + wordLength) {
                     currentWordIndex = i;
                     break;
                 }
                 charCounter += wordLength;
                 // Account for spaces or boundaries between words in the plain text
                 const nextBoundaryMatch = plainTextContent.substring(charCounter).match(/^(\s+|\b)/);
                 if (nextBoundaryMatch) {
                     charCounter += nextBoundaryMatch[0].length;
                 }
            }
            if(currentWordIndex !== -1){
                 setHighlightedWordIndex(currentWordIndex);
            }
        }
    };


    utterThis.onend = () => {
       if (currentSpeakingVerseIndex === verseIndex) { // Check if this is still the active speaking verse
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
       if (currentSpeakingVerseIndex === verseIndex) { // Check if this is still the active speaking verse
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
    if (synth.current) { // Stop any ongoing speech synthesis
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
      setVerses([]); // Clear verses on error
    } finally {
      setIsLoading(false);
    }
  };

   useEffect(() => {
    if (!autoSearch) return;

    const handler = setTimeout(() => {
      if (searchTerm.trim()) { // Check if searchTerm is not just whitespace
        searchVerses(searchTerm);
      } else {
        // Optionally clear verses if search term becomes empty and autoSearch is on
        // setVerses([]);
      }
    }, 500); // Debounce time for auto search

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, autoSearch]); // Rerun when searchTerm or autoSearch changes


  useEffect(() => {
    if (!isSpeechRecognitionAPIAvailable) {
      return;
    }

    let recognition: SpeechRecognition | null = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isVoiceSearch && SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop recognition after a pause
        recognition.interimResults = true; // Get results as they are recognized
        recognition.lang = 'en-US'; // Set language

        recognition.onstart = () => {
          console.log('Voice search started');
          setVoiceSearchText('Listening...'); // Placeholder text
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');

          setVoiceSearchText(transcript); // Update placeholder with live transcript
          setValue('query', transcript); // Update form value for submission

           if (!autoSearch) {
             // For manual search, update searchTerm only on final result to avoid premature display
             if (event.results[event.results.length - 1].isFinal) {
               setSearchTerm(transcript);
             }
           } else {
             // For auto search, update searchTerm continuously to trigger search
             setSearchTerm(transcript);
           }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          const finalTranscript = getValues('query'); // Use getValues from react-hook-form
          if (finalTranscript) {
            setSearchTerm(finalTranscript); // Ensure searchTerm is updated with the final value
          }
          setIsVoiceSearch(false); // Turn off voice search mode
          setVoiceSearchText(''); // Clear placeholder

          // If not auto-searching and there's a transcript, submit the form
          if (!autoSearch && finalTranscript && finalTranscript.trim()) {
            handleSubmit(onSubmit)();
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error details:', event);
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
          setIsVoiceSearch(false); // Turn off voice search mode
          setVoiceSearchText(''); // Clear placeholder
        };

        try {
            recognition.start();
        } catch (e) {
             console.error('Error starting recognition:', e);
             toast({
                title: 'Voice Search Error',
                description: 'Could not start voice search. Please check microphone permissions and setup.',
                variant: 'destructive',
             });
             setIsVoiceSearch(false); // Turn off voice search mode
             setVoiceSearchText(''); // Clear placeholder
        }
    }

    return () => {
      if (recognition) {
        recognition.stop();
        // It's good practice to nullify handlers on cleanup
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      }
    };
  }, [isVoiceSearch, toast, setValue, autoSearch, handleSubmit, isSpeechRecognitionAPIAvailable, getValues]);


  const onSubmit = (data: { query: string }) => {
     if (!autoSearch) { // Only submit if autoSearch is off; autoSearch has its own trigger
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
    setIsVoiceSearch((prev) => !prev); // Toggle voice search state
  };

  const toggleAutoSearch = () => {
    setAutoSearch((prev) => !prev);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
     const newQuery = e.target.value;
     setValue('query', newQuery); // Update form state
     setSearchTerm(newQuery); // Update searchTerm for auto-search or display
  };

    // Helper to identify John 3:16 for special rendering/functionality
    const isJohn316 = (verse: Verse) => {
        return verse.book.toLowerCase() === 'john' && verse.chapter === 3 && verse.verse === 16;
    };


  const renderVerseText = (text: string, verseIndex: number, verse: Verse) => {
    // Only apply word-by-word span wrapping for John 3:16 if voice reader is enabled
    if (isVoiceReaderEnabled && isJohn316(verse)) {
        const words = text.split(/(\s+|\b)/).filter(word => word.trim().length > 0);
        return words.map((word, wordIdx) => (
          <span
            key={wordIdx}
            style={{
              backgroundColor:
                currentSpeakingVerseIndex === verseIndex &&
                highlightedWordIndex === wordIdx
                  ? 'var(--accent)' // Use accent color from theme
                  : 'transparent',
              color: currentSpeakingVerseIndex === verseIndex && highlightedWordIndex === wordIdx ? 'var(--accent-foreground)' : 'inherit', // Use accent foreground from theme
              transition: 'background-color 0.1s linear, color 0.1s linear',
              display: 'inline', // Keep words inline
            }}
          >
            {word.includes('\n') ? word.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < word.split('\n').length - 1 && <br/>}</React.Fragment>) : word}
            {text.split(/(\s+|\b)/).filter(w => w.trim().length > 0)[wordIdx + 1]?.match(/^\s+$/) ? '\u00A0' : ''}
          </span>
        ));
    }
    // For other verses or if voice reader is disabled, return plain text
    return text.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < text.split('\n').length - 1 && <br/>}</React.Fragment>);
  };



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
            className="pr-12" // Padding for the mic button
            disabled={isVoiceSearch && voiceSearchText === 'Listening...'} // Disable input while listening
          />
          <Button
            type="button"
            variant={isVoiceSearch ? "destructive" : "secondary"} // Change variant when active
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
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
                  <CardHeader className="bg-secondary p-4 flex flex-row justify-between items-center">
                    <CardTitle className="text-lg font-semibold">{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                     {isVoiceReaderEnabled && isJohn316(verse) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => speakVerse(verse.text, index, verse)}
                        disabled={isSpeaking && currentSpeakingVerseIndex !== index && currentSpeakingVerseIndex !== null}
                        aria-label={`Speak verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                      >
                        {isSpeaking && currentSpeakingVerseIndex === index ? (
                            <>
                                <VolumeX className="mr-2 h-4 w-4" /> Stop
                            </>
                         ) : (
                            <>
                                <Volume2 className="mr-2 h-4 w-4" /> Speak
                            </>
                         )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <p
                        ref={(el) => { verseTextRefs.current[index] = el; }}
                        className="text-base leading-relaxed"
                        style={{ whiteSpace: 'pre-wrap' }} // Preserve line breaks from verse text
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

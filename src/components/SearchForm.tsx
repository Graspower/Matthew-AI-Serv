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

    synth.current.cancel(); // Stop any ongoing speech

    if (isSpeaking && currentSpeakingVerseIndex === verseIndex) {
      // If clicking the same "Speak" button while it's speaking, stop it
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
      setCurrentSpeakingVerseIndex(null);
      return;
    }

    // Reset previous state if speaking a new verse
    if (isSpeaking) {
        setHighlightedWordIndex(-1);
    }


    const words = text.split(/(\s+|\b)/).filter(word => word.trim().length > 0); // Split carefully
    let wordIndexRef = 0; // Use a ref or local variable to track word index within the event handler scope

    setHighlightedWordIndex(-1); // Reset highlight before starting
    setCurrentSpeakingVerseIndex(verseIndex);
    setIsSpeaking(true); // Set speaking state

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.pitch = 0.9;
    utterThis.rate = 1.0;

    // Use onboundary event to highlight words
    utterThis.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word' && currentSpeakingVerseIndex === verseIndex) {
            // Find the current word based on character index
            let charCounter = 0;
            for (let i = 0; i < words.length; i++) {
                 const wordLength = words[i].length;
                 if (event.charIndex >= charCounter && event.charIndex < charCounter + wordLength) {
                     wordIndexRef = i;
                     break;
                 }
                 charCounter += wordLength;
                 // Account for spaces or boundaries matched by the regex
                 const nextBoundaryMatch = text.substring(charCounter).match(/^(\s+|\b)/);
                 if (nextBoundaryMatch) {
                     charCounter += nextBoundaryMatch[0].length;
                 }
            }
            setHighlightedWordIndex(wordIndexRef); // Update state directly
        }
    };


    utterThis.onend = () => {
       // Ensure cleanup only happens if this utterance was the one that finished
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
       // Ensure cleanup only happens if this utterance had the error
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

    // If turning off voice reader, stop any current speech
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
    setSearchTerm(query); // Update search term state immediately
    // Cancel any ongoing speech when a new search starts
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
      setVerses([]); // Clear verses on error
    } finally {
      setIsLoading(false);
    }
  };

   // Effect for auto-search based on searchTerm and autoSearch state
   useEffect(() => {
    // Only run if autoSearch is enabled
    if (!autoSearch) return;

    // Debounce the search to avoid excessive API calls while typing
    const handler = setTimeout(() => {
      if (searchTerm) {
        searchVerses(searchTerm);
      } else {
        // Optionally clear verses if search term is empty
        setVerses([]);
      }
    }, 500); // Adjust debounce delay as needed (e.g., 500ms)

    // Cleanup function to clear the timeout if searchTerm or autoSearch changes
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, autoSearch]); // Re-run effect when searchTerm or autoSearch changes


  // Effect for handling voice search input
  useEffect(() => {
    // Check if SpeechRecognition API is available
    if (typeof window === 'undefined' || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      // Maybe disable voice search button if not supported?
      return;
    }

    let recognition: SpeechRecognition | null = null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (isVoiceSearch && SpeechRecognition) { // Check again if SpeechRecognition exists before using it
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after first final result
        recognition.interimResults = true; // Get interim results while speaking
        recognition.lang = 'en-US'; // Set language

        recognition.onstart = () => {
          console.log('Voice search started');
          setVoiceSearchText('Listening...'); // Provide feedback to user
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          // Combine all transcript parts
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');

          setVoiceSearchText(transcript); // Update placeholder text
          setValue('query', transcript); // Update form value

           // Update searchTerm state based on autoSearch setting
           if (!autoSearch) {
             // If not auto-searching, only update searchTerm when final result is available
             if (event.results[event.results.length - 1].isFinal) {
               setSearchTerm(transcript);
             }
           } else {
             // If auto-searching, update searchTerm continuously
             setSearchTerm(transcript);
           }
        };

         recognition.onend = () => {
          console.log('Voice search ended');
          setIsVoiceSearch(false); // Turn off voice search state
          setVoiceSearchText(''); // Clear placeholder

          // If not auto-searching, trigger the search manually after voice input ends
          const finalTranscript = (document.getElementById('bible-search-input') as HTMLInputElement)?.value; // Get final value from input
          if (!autoSearch && finalTranscript) {
            // No need to call searchVerses here if using the form's onSubmit
            // searchVerses(finalTranscript); // Manual trigger if not using form submit for voice
            handleSubmit(onSubmit)(); // Trigger form submission which calls searchVerses if autoSearch is off
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
           let errorMessage = 'Could not perform voice search.';
            // Provide more specific error messages
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
          setIsVoiceSearch(false); // Turn off voice search state on error
          setVoiceSearchText(''); // Clear placeholder
        };

        // Start recognition
        try {
            recognition.start();
        } catch (e) {
             console.error('Error starting recognition:', e);
             toast({
                title: 'Voice Search Error',
                description: 'Could not start voice search.',
                variant: 'destructive',
             });
             setIsVoiceSearch(false); // Turn off state if starting fails
             setVoiceSearchText('');
        }

    }

    // Cleanup function to stop recognition if component unmounts or isVoiceSearch becomes false
    return () => {
      if (recognition) {
        recognition.stop();
        // Remove event listeners to prevent memory leaks
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      }
    };
  }, [isVoiceSearch, toast, setValue, autoSearch, handleSubmit]); // Add handleSubmit as dependency


  // Handle form submission (for manual search when autoSearch is off)
  const onSubmit = (data: { query: string }) => {
     // Only trigger search on submit if autoSearch is OFF
     if (!autoSearch) {
        searchVerses(data.query);
     }
  };

  // Toggle voice search state
  const toggleVoiceSearch = () => {
     // Check for API support before toggling
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        setIsVoiceSearch((prev) => !prev); // Toggle the state
    } else {
        // Inform user if the browser doesn't support it
        toast({
            title: 'Unsupported Feature',
            description: 'Voice search is not supported in your browser.',
            variant: 'destructive',
        });
    }
  };

  // Toggle auto-search state
  const toggleAutoSearch = () => {
    setAutoSearch((prev) => !prev);
  };

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newQuery = e.target.value;
     setValue('query', newQuery); // Update form state
     setSearchTerm(newQuery); // Update searchTerm state (triggers auto-search if enabled)
  };

    // Helper function to check if a verse is John 3:16
    const isJohn316 = (verse: Verse) => {
        return verse.book === 'John' && verse.chapter === 3 && verse.verse === 16;
    };

  // Function to render verse text with highlighting spans (only for John 3:16)
  const renderVerseText = (verse: Verse, verseIndex: number) => {
    const words = verse.text.split(/(\s+|\b)/).filter(word => word.trim().length > 0);

    // Only apply highlighting logic for John 3:16
    if (isJohn316(verse)) {
        return words.map((word, wordIndex) => (
          <span
            key={wordIndex}
            style={{
              backgroundColor:
                isVoiceReaderEnabled && // Only highlight if reader is on
                currentSpeakingVerseIndex === verseIndex && // Only for the currently spoken verse
                highlightedWordIndex === wordIndex // Only for the currently highlighted word
                  ? 'lightblue' // Highlight color
                  : 'transparent', // Default background
              transition: 'background-color 0.1s linear', // Smooth transition
              display: 'inline', // Keep words inline
            }}
          >
            {word} {/* Render the word */}
            {/* Add space between words correctly - check if next element is not just boundary */}
             {(wordIndex < words.length - 1 && !words[wordIndex+1].match(/^(\s+|\b)$/)) ? '' : ''}
          </span>
        ));
    } else {
        // For other verses, just return the plain text without spans
        return verse.text;
    }
  };


  // Main component return
  return (
    <div className="w-full max-w-md p-4">
      <Toaster />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative flex items-center">
          {/* Search Input */}
          <Input
            id="bible-search-input"
            type="text"
            placeholder={isVoiceSearch ? voiceSearchText : "Search for a Bible verse..."}
            {...register('query')}
            aria-label="Bible verse search"
            onChange={handleInputChange} // Use unified input handler
            className="pr-12" // Padding to avoid overlap with mic button
            disabled={isVoiceSearch} // Disable input during voice search
          />
          {/* Voice Search Button */}
          <Button
            type="button"
            variant={isVoiceSearch ? "destructive" : "secondary"} // Change appearance when active
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
            onClick={toggleVoiceSearch}
            aria-label={isVoiceSearch ? "Stop voice search" : "Start voice search"}
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>

        {/* Toggles for Auto Search and Voice Reader */}
        <div className="flex justify-between items-center gap-4">
          {/* Auto Search Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-search"
              checked={autoSearch}
              onCheckedChange={toggleAutoSearch}
              aria-label="Toggle auto search"
            />
            <Label htmlFor="auto-search">Auto Search</Label>
          </div>
          {/* Voice Reader Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="voice-reader"
              checked={isVoiceReaderEnabled}
              onCheckedChange={toggleVoiceReader}
              aria-label="Toggle voice reader"
            />
            <Label htmlFor="voice-reader">Voice Reader</Label>
          </div>
           {/* Removed Background Music Toggle */}
        </div>


        {/* Manual Search Button (only shown if autoSearch is off) */}
        {!autoSearch && (
          <Button type="submit" className="w-full" disabled={isLoading || isVoiceSearch}>
             {/* Loading indicator */}
             {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
             Search
          </Button>
        )}
      </form>


      {/* Loading Indicator */}
      {isLoading && (
        <div className="mt-6 flex justify-center items-center h-20">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      )}

      {/* Results Section */}
      {/* Only show results if not loading AND a search term exists */}
      {!isLoading && searchTerm && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4 text-center">Results for "{searchTerm}"</h2>
          {verses.length > 0 ? (
            // Display verses if found
            <div className="grid gap-4">
              {verses.map((verse, index) => (
                <Card key={`${verse.book}-${verse.chapter}-${verse.verse}-${index}`} className="shadow-md rounded-lg overflow-hidden">
                  <CardHeader className="bg-secondary p-4">
                    <CardTitle className="text-lg font-semibold">{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Verse Text - rendered with highlighting logic */}
                    <p
                        ref={(el) => { verseTextRefs.current[index] = el; }} // Ref for potential future use (scrolling?)
                        className="text-base leading-relaxed"
                        style={{ whiteSpace: 'pre-wrap' }} // Preserve whitespace for proper word separation
                      >
                        {renderVerseText(verse, index)}
                    </p>
                    {/* Speak Button - only for John 3:16 and if voice reader is enabled */}
                    {isVoiceReaderEnabled && isJohn316(verse) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => speakVerse(verse.text, index, verse)}
                        // Disable button if another verse is being spoken
                        disabled={isSpeaking && currentSpeakingVerseIndex !== index}
                        aria-label={`Speak verse ${verse.book} ${verse.chapter}:${verse.verse}`}
                      >
                        {/* Show loading/speaking state or default 'Speak' */}
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
             // Display message if no verses found
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


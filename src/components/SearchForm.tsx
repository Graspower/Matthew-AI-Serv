"use client";

import {useState, useEffect, useRef} from 'react';
import {useToast} from "@/hooks/use-toast";
import {interpretBibleVerseSearch} from "@/ai/flows/interpret-bible-verse-search";
import {Verse} from "@/services/bible";
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
import {Loader2} from "lucide-react";

export function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [autoSearch, setAutoSearch] = useState(false);
  const {register, handleSubmit, setValue} = useForm();
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const [isVoiceReaderEnabled, setIsVoiceReaderEnabled] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const verseTextRefs = useRef<HTMLParagraphElement[]>([]);

  // Initialize SpeechSynthesisUtterance
  const synth = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synth.current = window.speechSynthesis;
    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);


  const speakVerse = (text: string, verseIndex: number) => {
    if (!synth.current) return;

    // Split the text into words
    const words = text.split(' ');
    let currentWordIndex = 0;
    setHighlightedWordIndex(-1);
    synth.current.cancel();
    setIsSpeaking(true);

    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.onboundary = (event: SpeechSynthesisEvent) => {
      if (event.name === 'word') {
        currentWordIndex = words.slice(0, event.charIndex).join(' ').split(' ').length;
        setHighlightedWordIndex(currentWordIndex -1);
        if(currentWordIndex >= words.length){
          setIsSpeaking(false);
        }
      }
    };
    utterThis.onend = () => {
      setHighlightedWordIndex(-1);
      setIsSpeaking(false);
    };

    synth.current.speak(utterThis);
  };

  const toggleVoiceReader = () => {
    setIsVoiceReaderEnabled((prev) => !prev);
    if(isSpeaking && synth.current){
      synth.current.cancel();
      setIsSpeaking(false);
      setHighlightedWordIndex(-1);
    }
  };

  // Function to handle the verse search
  const searchVerses = async (query: string) => {
    setIsLoading(true); // Start loading
    setSearchTerm(query);
    try {
      const result = await interpretBibleVerseSearch({query: query});
      setVerses(result.verses);
    } catch (error: any) {
      console.error('Search failed', error);
      toast({
        title: 'Error',
        description: 'Failed to perform search. Please try again.',
        variant: 'destructive',
      });
      setVerses([]);
    } finally {
      setIsLoading(false); // End loading
    }
  };

  // UseEffect to trigger search when autoSearch is on and searchTerm changes
  useEffect(() => {
    if (autoSearch && searchTerm) {
      searchVerses(searchTerm);
    }
  }, [searchTerm, autoSearch]);

  // Implement voice search using the Web Speech API
  useEffect(() => {
    let recognition: SpeechRecognition | null = null;

    if (isVoiceSearch) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('Voice search started');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');

          setVoiceSearchText(transcript);
          setValue('query', transcript);
          setSearchTerm(transcript); // Set searchTerm to trigger auto-search
        };

        recognition.onend = () => {
          console.log('Voice search ended');
          setIsVoiceSearch(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: 'Error',
            description: `Could not perform voice search. ${event.error}`,
            variant: 'destructive',
          });
          setIsVoiceSearch(false);
        };

        recognition.start();
      } else {
        toast({
          title: 'Error',
          description: 'Your browser does not support voice search.',
          variant: 'destructive',
        });
        setIsVoiceSearch(false);
      }
    } else if (recognition) {
      recognition.stop();
      console.log('Voice search stopped');
    }

    return () => {
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      }
    };
  }, [isVoiceSearch, toast, setValue]);

  const onSubmit = async (data: any) => {
    searchVerses(data.query);
  };

  const toggleVoiceSearch = () => {
    setIsVoiceSearch((prev) => !prev);
  };

  const toggleAutoSearch = () => {
    setAutoSearch((prev) => !prev);
  };

  const handleInputChange = (e: any) => {
    setSearchTerm(e.target.value); // Update searchTerm as the user types
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for a Bible verse..."
            {...register('query')}
            aria-label="Bible verse search"
            onChange={handleInputChange} // Call handle handleInputChange on input change
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
            onClick={toggleVoiceSearch}
          >
            {isVoiceSearch ? 'Stop' : 'Voice'}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="auto-search">Auto Search</Label>
          <Switch
            id="auto-search"
            checked={autoSearch}
            onCheckedChange={toggleAutoSearch}
          />
        </div>
        {!autoSearch && (
          <Button type="submit" className="bg-accent text-background">
            Search
          </Button>
        )}
      </form>
      <div className="flex items-center space-x-2 mt-4">
        <Label htmlFor="voice-reader">Voice Reader</Label>
        <Switch
          id="voice-reader"
          checked={isVoiceReaderEnabled}
          onCheckedChange={toggleVoiceReader}
        />
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center">
          <Loader2 className="animate-spin h-6 w-6" />
        </div>
      ) : verses.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Search Results for "{searchTerm}"</h2>
          <div className="grid gap-4">
            {verses.map((verse, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p ref={(el) => (verseTextRefs.current[index] = el)}
                     style={{ whiteSpace: 'pre-wrap' }}>
                    {isVoiceReaderEnabled ? (
                      verse.text.split(' ').map((word, wordIndex) => (
                        <span
                          key={wordIndex}
                          style={{
                            backgroundColor: highlightedWordIndex === wordIndex ? 'lightblue' : 'transparent',
                            transition: 'background-color 0.3s',
                          }}
                        >
                          {word}{' '}
                        </span>
                      ))
                    ) : (
                      verse.text
                    )}
                  </p>
                  {isVoiceReaderEnabled && (
                    <Button
                      onClick={() => speakVerse(verse.text, index)}
                      disabled={isSpeaking}
                    >
                      {isSpeaking ? 'Speaking...' : 'Speak'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : searchTerm && verses.length === 0 ? (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Search Results for "{searchTerm}"</h2>
          <Card>
            <CardContent>
              <p>No matching verse found. Search another verse.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}



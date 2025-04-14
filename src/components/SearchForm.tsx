"use client";

import {useState} from 'react';
import {useToast} from "@/hooks/use-toast";
import {interpretBibleVerseSearch} from "@/ai/flows/interpret-bible-verse-search";
import {Verse} from "@/services/bible";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {Textarea} from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<Verse[]>([]);
  const {toast} = useToast();
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const {register, handleSubmit, setValue} = useForm();

  //Implement voice search using the Web Speech API
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
    setSearchTerm(data.query);
    try {
      const result = await interpretBibleVerseSearch({query: data.query});
      setVerses(result.verses);
    } catch (error: any) {
      console.error('Search failed', error);
      toast({
        title: 'Error',
        description: 'Failed to perform search. Please try again.',
        variant: 'destructive',
      });
      setVerses([]);
    }
  };

  const toggleVoiceSearch = () => {
    setIsVoiceSearch((prev) => !prev);
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
        <Button type="submit" className="bg-accent text-background">
          Search
        </Button>
      </form>

      {verses.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Search Results for "{searchTerm}"</h2>
          <div className="grid gap-4">
            {verses.map((verse, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{verse.book} {verse.chapter}:{verse.verse}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{verse.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

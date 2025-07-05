
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Volume2, VolumeX, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateVerseExplanation } from '@/ai/flows/generateVerseExplanationFlow';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface DailyVerse {
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
  verse: Verse;
  explanation: string;
}

const inspirationalVerses: Verse[] = [
  { book: 'Psalm', chapter: 103, verse: 1, text: 'Bless the LORD, O my soul, and all that is within me, bless his holy name!' },
  { book: 'Psalm', chapter: 103, verse: 2, text: 'Bless the LORD, O my soul, and forget not all his benefits.' },
  { book: 'Psalm', chapter: 145, verse: 1, text: 'I will extol thee, my God, O king; and I will bless thy name for ever and ever.' },
  { book: 'Psalm', chapter: 145, verse: 2, text: 'Every day will I bless thee; and I will praise thy name for ever and ever.' },
  { book: 'Ephesians', chapter: 1, verse: 3, text: 'Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ.' },
  { book: '1 Chronicles', chapter: 16, verse: 8, text: 'Give thanks unto the LORD, call upon his name, make known his deeds among the people.' },
  { book: '1 Chronicles', chapter: 16, verse: 34, text: 'O give thanks unto the LORD; for he is good; for his mercy endureth for ever.' },
  { book: 'Psalm', chapter: 95, verse: 2, text: 'Let us come before his presence with thanksgiving, and make a joyful noise unto him with psalms.' },
  { book: 'Psalm', chapter: 107, verse: 1, text: 'O give thanks unto the LORD, for he is good: for his mercy endureth for ever.' },
  { book: 'Colossians', chapter: 3, verse: 17, text: 'And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him.' },
  { book: '1 Thessalonians', chapter: 5, verse: 18, text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.' },
  { book: 'Hebrews', chapter: 13, verse: 15, text: 'By him therefore let us offer the sacrifice of praise to God continually, that is, the fruit of our lips giving thanks to his name.' },
  { book: 'Psalm', chapter: 34, verse: 1, text: 'I will bless the LORD at all times: his praise shall continually be in my mouth.' },
  { book: 'Jude', chapter: 1, verse: 25, text: 'To the only wise God our Saviour, be glory and majesty, dominion and power, both now and ever. Amen.'},
  { book: 'Revelation', chapter: 4, verse: 11, text: 'Thou art worthy, O Lord, to receive glory and honour and power: for thou hast created all things, and for thy pleasure they are and were created.'},
];

// Helper to shuffle array and pick N items
function pickRandomItems<T>(arr: T[], num: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, num);
}

function CardSkeleton() {
    return (
        <Card className="w-full max-w-sm h-[480px] shadow-lg rounded-xl">
            <CardHeader>
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-1/4 mx-auto mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col gap-6 justify-center">
                <div className="px-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                </div>
                <div className="mx-4 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-5/6 mt-2" />
                </div>
            </CardContent>
        </Card>
    );
}


function InspirationCard({ item, onSpeakClick, isSpeaking }: { item: DailyVerse; onSpeakClick: (e: React.MouseEvent) => void; isSpeaking: boolean }) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    return truncated.slice(0, truncated.lastIndexOf(' '));
  };
  
  return (
      <Card className="w-full h-full shadow-2xl rounded-xl flex flex-col cursor-pointer overflow-hidden transform-gpu">
        <CardHeader className="p-4 relative">
          <CardTitle className="text-xl font-semibold text-center">{item.timeOfDay} Inspiration</CardTitle>
          <CardDescription className="text-primary font-semibold text-lg text-center pt-2">
            {`${item.verse.book} ${item.verse.chapter}:${item.verse.verse}`}
          </CardDescription>
           <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 rounded-full"
            onClick={onSpeakClick}
          >
            {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            <span className="sr-only">Speak inspiration</span>
          </Button>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 justify-center p-4 pt-0">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground leading-relaxed">
              "{item.verse.text}"
            </p>
          </div>
          <div className="p-4 bg-muted/20 rounded-md border-l-4 border-primary">
             <p className="text-base font-normal text-muted-foreground text-left leading-relaxed">
              {truncateText(item.explanation, 120)}...
              <span className="text-primary font-semibold ml-1">
                Read More
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
  );
}


export function HomePage() {
  const [dailyVerses, setDailyVerses] = useState<DailyVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInspiration, setSelectedInspiration] = useState<DailyVerse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [activeIndex, setActiveIndex] = useState(0);

  const synth = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      return () => {
        if (synth.current?.speaking) {
          synth.current.cancel();
        }
      };
    }
  }, []);
  
  const stopSpeaking = useCallback(() => {
    if (synth.current?.speaking) {
      synth.current.cancel();
    }
    setIsSpeaking(false);
  }, []);
  
  const speakInspiration = useCallback((item: DailyVerse) => {
    if (!synth.current) return;
    
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
  
    if (synth.current.speaking) {
      synth.current.cancel();
    }
  
    const textToSpeak = `${item.timeOfDay} Inspiration. Verse from ${item.verse.book} chapter ${item.verse.chapter}, verse ${item.verse.verse}. ${item.verse.text}. Adoration: ${item.explanation}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.pitch = 1.0;
    utterance.rate = 0.9;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Error', e);
      toast({ title: "Speech Error", description: "Could not play audio.", variant: "destructive" });
      setIsSpeaking(false);
    };
  
    synth.current.speak(utterance);
  }, [isSpeaking, stopSpeaking, toast]);

  const generateAndStoreVerses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    stopSpeaking();

    try {
      const selectedVerses = pickRandomItems(inspirationalVerses, 3);
      
      const explanationPromises = selectedVerses.map(verse => 
        generateVerseExplanation({
          verseReference: `${verse.book} ${verse.chapter}:${verse.verse}`,
          verseText: verse.text,
        })
      );
      
      const explanations = await Promise.all(explanationPromises);

      const newDailyVerses: DailyVerse[] = [
        { timeOfDay: 'Morning', verse: selectedVerses[0], explanation: explanations[0].explanation },
        { timeOfDay: 'Afternoon', verse: selectedVerses[1], explanation: explanations[1].explanation },
        { timeOfDay: 'Evening', verse: selectedVerses[2], explanation: explanations[2].explanation },
      ];

      if (typeof window !== 'undefined') {
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('dailyInspiration', JSON.stringify({ date: today, verses: newDailyVerses }));
      }
      setDailyVerses(newDailyVerses);

    } catch (err: any) {
      console.error('Failed to generate daily verses or explanations:', err);
      const errorMessage = `Failed to load daily inspiration. ${err.message || 'Please try again.'}`;
      setError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      setDailyVerses([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, stopSpeaking]);
  
  useEffect(() => {
    if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('dailyInspiration');
    
    if (storedData) {
      try {
        const { date, verses } = JSON.parse(storedData);
        if (date === today && Array.isArray(verses) && verses.length === 3) {
          setDailyVerses(verses);
          setIsLoading(false);
          return;
        }
      } catch (e) { console.error("Failed to parse daily inspiration", e); }
    }
    generateAndStoreVerses();
  }, [generateAndStoreVerses]);

  useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setActiveIndex(0);
      else if (hour < 17) setActiveIndex(1);
      else setActiveIndex(2);
  }, []);

  const handleCardClick = (item: DailyVerse, index: number) => {
    if (index === activeIndex) {
        setSelectedInspiration(item);
        setIsDialogOpen(true);
    } else {
        setActiveIndex(index);
    }
  }

  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + dailyVerses.length) % dailyVerses.length);
  const handleNext = () => setActiveIndex((prev) => (prev + 1) % dailyVerses.length);

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center p-4 min-w-0">
      <div className="w-full max-w-4xl text-center mb-4">
        <h2 className="text-2xl font-bold">Daily Divine Inspiration</h2>
        <p className="text-muted-foreground">Verses of Blessing, Adoration, and Thanksgiving</p>
      </div>

      <div className="relative w-full h-[520px] flex items-center justify-center [perspective:1200px] mt-2">
        {isLoading ? (
          <CardSkeleton />
        ) : error ? (
          <Card className="w-full max-w-sm shadow-lg rounded-xl">
            <CardContent className="p-6 text-center"> <p className="text-destructive">{error}</p> </CardContent>
          </Card>
        ) : dailyVerses.length > 0 ? (
            dailyVerses.map((item, index) => (
                <motion.div
                    key={item.timeOfDay}
                    className="absolute w-full max-w-xs sm:max-w-sm h-[480px]"
                    animate={{
                        x: (index - activeIndex) * 50,
                        scale: 1 - Math.abs(index - activeIndex) * 0.15,
                        rotateY: (index - activeIndex) * -20,
                        zIndex: dailyVerses.length - Math.abs(index - activeIndex),
                        opacity: Math.abs(index - activeIndex) > 1 ? 0 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    drag={index === activeIndex ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    onDragEnd={(e, { offset }) => {
                        if (offset.x > 100) handlePrev();
                        else if (offset.x < -100) handleNext();
                    }}
                    onClick={() => handleCardClick(item, index)}
                >
                    <InspirationCard 
                        item={item} 
                        isSpeaking={isSpeaking && activeIndex === index}
                        onSpeakClick={(e) => {
                            e.stopPropagation();
                            speakInspiration(item);
                        }}
                    />
                </motion.div>
            ))
        ) : (
          <Card className="w-full max-w-sm shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Your daily inspiration is being prepared.</p>
            </CardContent>
          </Card>
        )}
      </div>

       {dailyVerses.length > 0 && !isLoading && (
            <div className="flex items-center gap-4 mt-4 z-20">
                <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Previous Inspiration">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="flex items-center gap-2">
                    {dailyVerses.map((_, index) => (
                        <button key={index} onClick={() => setActiveIndex(index)} className={`h-2.5 w-2.5 rounded-full transition-colors ${activeIndex === index ? 'bg-primary' : 'bg-muted'}`} aria-label={`Go to slide ${index + 1}`}></button>
                    ))}
                </div>
                <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next Inspiration">
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>
        )}
      
      {selectedInspiration && (
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) stopSpeaking();
          setIsDialogOpen(isOpen);
        }}>
          <DialogContent className="max-w-2xl w-[90vw] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedInspiration.timeOfDay} Inspiration</DialogTitle>
              <DialogDescription className="text-primary font-semibold text-lg pt-2 text-center">
                {`${selectedInspiration.verse.book} ${selectedInspiration.verse.chapter}:${selectedInspiration.verse.verse}`}
              </DialogDescription>
               <DialogClose className="absolute right-4 top-4 rounded-sm p-2 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogClose>
            </DialogHeader>
            <div className="grid gap-4 overflow-y-auto px-6 pb-6 max-h-[70vh]">
              <p className="text-center text-3xl font-bold text-foreground leading-relaxed">
                "{selectedInspiration.verse.text}"
              </p>
              <div className="p-4 bg-muted/20 rounded-md border-l-4 border-primary">
                <p className="text-lg font-normal text-muted-foreground text-left leading-relaxed">
                  {selectedInspiration.explanation}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

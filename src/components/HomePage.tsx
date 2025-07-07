
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getInspirationalVerses } from '@/services/inspirations';
import type { DailyInspiration } from '@/services/inspirations';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

// The new data structure for a daily verse, fetched directly from Firestore.
interface DailyVerse extends DailyInspiration {}

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


function InspirationCard({ item, onSpeakClick, isSpeaking, onClick }: { item: DailyVerse; onSpeakClick: (e: React.MouseEvent) => void; isSpeaking: boolean; onClick: () => void; }) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    return truncated.slice(0, truncated.lastIndexOf(' '));
  };
  
  return (
      <Card onClick={onClick} className="w-full h-full shadow-2xl rounded-xl flex flex-col cursor-pointer overflow-hidden transform-gpu transition-transform duration-300 hover:scale-105">
        <CardHeader className="p-4 relative">
          <CardTitle className="text-xl font-semibold text-center">{item.timeOfDay} Inspiration</CardTitle>
          <CardDescription className="text-primary font-semibold text-lg text-center pt-2">
            {`${item.book} ${item.chapter}:${item.verse}`}
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
          <blockquote className="text-center p-4 border-l-4 border-primary bg-muted/20 rounded-r-md">
            <p className="text-2xl font-bold text-foreground leading-relaxed">
              "{item.text}"
            </p>
          </blockquote>
          <div className="p-4">
             <p className="text-base font-normal text-muted-foreground text-left leading-relaxed">
              {truncateText(item.explanation, 120)}...
              <span className="text-primary font-semibold ml-1 cursor-pointer">
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
  const container = useRef<HTMLDivElement>(null);


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
  
    const textToSpeak = `${item.timeOfDay} Inspiration. Verse from ${item.book} chapter ${item.chapter}, verse ${item.verse}. ${item.text}. Adoration: ${item.explanation}`;
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

  const fetchAndStoreVerses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    stopSpeaking();

    try {
      const fetchedInspirations = await getInspirationalVerses();

      if (!fetchedInspirations || fetchedInspirations.length === 0) {
        throw new Error("No inspirational verses found. Please add documents to the 'inspirations' collection in Firestore.");
      }

      if (typeof window !== 'undefined') {
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('dailyInspiration', JSON.stringify({ date: today, verses: fetchedInspirations }));
      }
      setDailyVerses(fetchedInspirations);

    } catch (err: any) {
      console.error('Failed to fetch daily inspiration:', err);
      const errorMessage = `Failed to fetch daily inspiration. ${err.message || 'Please try again.'}`;
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
        // Validate the structure of the cached data before using it.
        if (date === today && Array.isArray(verses) && verses.length > 0 && verses[0].book && typeof verses[0].text !== 'undefined') {
          setDailyVerses(verses);
          setIsLoading(false);
          return;
        }
      } catch (e) { 
        console.error("Failed to parse or validate daily inspiration cache, fetching new data.", e);
        // Clear broken cache
        localStorage.removeItem('dailyInspiration');
      }
    }
    fetchAndStoreVerses();
  }, [fetchAndStoreVerses]);

  useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setActiveIndex(0);
      else if (hour < 17) setActiveIndex(1);
      else setActiveIndex(2);
  }, []);

  useGSAP(() => {
    if (!container.current || isLoading || dailyVerses.length === 0) return;

    const cards = gsap.utils.toArray('.inspiration-card');
    
    gsap.set(cards, { opacity: 0,
        x: (i) => (i - activeIndex) * 50,
        rotateY: (i) => (i - activeIndex) * -20,
        transformOrigin: "50% 50%"
    });

    cards.forEach((card, index) => {
      gsap.to(card as HTMLElement, {
        x: (index - activeIndex) * 50,
        scale: 1 - Math.abs(index - activeIndex) * 0.15,
        rotateY: (index - activeIndex) * -20,
        zIndex: dailyVerses.length - Math.abs(index - activeIndex),
        opacity: Math.abs(index - activeIndex) > 1.5 ? 0 : 1,
        duration: 0.75,
        ease: 'power3.out',
      });
    });

  }, { scope: container, dependencies: [activeIndex, dailyVerses, isLoading] });


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

  const renderContent = () => {
    if (error) {
        return (
            <div className="w-full h-[580px] flex items-center justify-center">
                <Card className="w-full max-w-sm shadow-lg rounded-xl flex flex-col items-center justify-center p-6">
                    <CardContent className="text-center">
                    <p className="text-destructive font-semibold">An Error Occurred</p>
                    <p className="text-sm text-muted-foreground mt-2">{error}</p>
                    <Button onClick={fetchAndStoreVerses} className="mt-4">Retry</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (dailyVerses.length === 0) {
        return (
            <div className="w-full h-[580px] flex items-center justify-center">
                <Card className="w-full max-w-sm shadow-lg rounded-xl">
                    <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Your daily inspiration is being prepared.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div ref={container} className="relative w-full h-[520px] flex items-center justify-center [perspective:1200px] mt-2">
                {dailyVerses.map((item, index) => (
                    <div
                        key={item.id || `inspiration-${index}`}
                        className="inspiration-card absolute w-full max-w-xs sm:max-w-sm h-[480px]"
                    >
                        <InspirationCard 
                            item={item} 
                            isSpeaking={isSpeaking && activeIndex === index}
                            onClick={() => handleCardClick(item, index)}
                            onSpeakClick={(e) => {
                                e.stopPropagation();
                                speakInspiration(item);
                            }}
                        />
                    </div>
                ))}
            </div>
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
        </>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center p-4 min-w-0">
      <div className="w-full max-w-4xl text-center mb-4">
        <h2 className="text-2xl font-bold">Daily Divine Inspiration</h2>
        <p className="text-muted-foreground">Verses of Blessing, Adoration, and Thanksgiving</p>
      </div>

      {isLoading ? (
        <div className="w-full h-[580px] flex items-center justify-center">
            <CardSkeleton />
        </div>
      ) : renderContent()}
      
      {selectedInspiration && (
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) stopSpeaking();
          setIsDialogOpen(isOpen);
        }}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>{selectedInspiration.timeOfDay} Inspiration</DialogTitle>
              <DialogDescription className="text-primary font-semibold text-lg pt-2 text-center">
                {`${selectedInspiration.book} ${selectedInspiration.chapter}:${selectedInspiration.verse}`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto p-6">
              <p className="text-center text-3xl font-bold text-foreground leading-relaxed">
                "{selectedInspiration.text}"
              </p>
              <div className="mt-4 p-4 bg-muted/20 rounded-md border-l-4 border-primary">
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

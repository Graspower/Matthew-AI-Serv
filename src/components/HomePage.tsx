
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateVerseExplanation } from '@/ai/flows/generateVerseExplanationFlow';
import { Skeleton } from '@/components/ui/skeleton';

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

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  return truncated.slice(0, truncated.lastIndexOf(' ')); // Avoid cutting words
};

export function HomePage() {
  const [dailyVerses, setDailyVerses] = useState<DailyVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedInspiration, setSelectedInspiration] = useState<DailyVerse | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState<number | null>(null);

  const synth = useRef<SpeechSynthesis | null>(null);
  const { toast } = useToast();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState<'testimonies' | 'prayers' | 'teachings'>('testimonies');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synth.current = window.speechSynthesis;
      // Cleanup on component unmount
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
    setCurrentlySpeakingIndex(null);
  }, []);
  
  const speakInspiration = useCallback((item: DailyVerse, index: number) => {
    if (!synth.current) return;
    
    // If we click the button of the currently playing audio, stop it.
    if (isSpeaking && currentlySpeakingIndex === index) {
      stopSpeaking();
      return;
    }
  
    // If another audio is playing, stop it before starting the new one.
    if (synth.current.speaking) {
      synth.current.cancel();
    }
  
    const textToSpeak = `${item.timeOfDay} Inspiration. Verse from ${item.verse.book} chapter ${item.verse.chapter}, verse ${item.verse.verse}. ${item.verse.text}. Adoration: ${item.explanation}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.pitch = 1.0;
    utterance.rate = 0.9;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentlySpeakingIndex(index);
    };
  
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentlySpeakingIndex(null);
    };
  
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Error', e);
      toast({ title: "Speech Error", description: "Could not play audio.", variant: "destructive" });
      setIsSpeaking(false);
      setCurrentlySpeakingIndex(null);
    };
  
    synth.current.speak(utterance);
  }, [isSpeaking, currentlySpeakingIndex, stopSpeaking, toast]);

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
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
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
      } catch (e) {
        console.error("Failed to parse daily inspiration from local storage", e);
      }
    }
    
    generateAndStoreVerses();
  }, [generateAndStoreVerses]);

  const scrollToCard = useCallback((index: number) => {
    if (cardRefs.current[index]) {
      cardRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && dailyVerses.length > 0) {
      const hour = new Date().getHours();
      let initialIndex = 0;
      if (hour >= 18) { // 6 PM or later
        initialIndex = 2;
      } else if (hour >= 12) { // 12 PM or later
        initialIndex = 1;
      }
      setActiveIndex(initialIndex);
      // Use a timeout to scroll after the component has rendered
      setTimeout(() => scrollToCard(initialIndex), 100);
    }
  }, [isLoading, dailyVerses, scrollToCard]);

  const handlePrev = () => {
    stopSpeaking();
    const newIndex = activeIndex > 0 ? activeIndex - 1 : 0;
    setActiveIndex(newIndex);
    scrollToCard(newIndex);
  };

  const handleNext = () => {
    stopSpeaking();
    const newIndex = activeIndex < dailyVerses.length - 1 ? activeIndex + 1 : dailyVerses.length - 1;
    setActiveIndex(newIndex);
    scrollToCard(newIndex);
  };

  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = () => {
    if (isSpeaking) stopSpeaking();
    if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
    }
    scrollTimeout.current = setTimeout(() => {
        if(scrollContainerRef.current) {
            const { scrollLeft, scrollWidth } = scrollContainerRef.current;
            const cardWidth = scrollWidth / dailyVerses.length;
            const newIndex = Math.round(scrollLeft / cardWidth);
            if (isFinite(newIndex) && newIndex !== activeIndex) {
              setActiveIndex(newIndex);
            }
        }
    }, 150);
  };

  const handleCardClick = (item: DailyVerse) => {
    setSelectedInspiration(item);
    setIsDialogOpen(true);
  }

  const renderVerseCard = (item: DailyVerse, index: number) => (
    <div
      key={item.timeOfDay}
      ref={el => cardRefs.current[index] = el}
      className="w-full flex-shrink-0 snap-center p-1"
    >
      <Card
        onClick={() => handleCardClick(item)}
        className="w-full shadow-lg rounded-xl flex flex-col min-h-[480px] cursor-pointer"
      >
        <CardHeader className="p-4 relative">
          <CardTitle className="text-xl font-semibold text-center">{item.timeOfDay} Inspiration</CardTitle>
          <CardDescription className="text-primary font-semibold text-lg text-center pt-2">
            {`${item.verse.book} ${item.verse.chapter}:${item.verse.verse}`}
          </CardDescription>
           <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 rounded-full"
            onClick={(e) => { e.stopPropagation(); speakInspiration(item, index); }}
          >
            {isSpeaking && currentlySpeakingIndex === index ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
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
    </div>
  );

  const renderSkeletonCard = (key: string) => (
      <div key={key} className="w-full flex-shrink-0 snap-center p-1">
        <Card className="w-full shadow-lg rounded-xl min-h-[480px]">
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
      </div>
  );

  const testimonyData = [
    { name: 'Abraham', description: 'The father of faith, promised a nation through whom all the earth would be blessed.', imageSrc: '/images/abrahamtestimony.png', hint: 'desert patriarch' },
    { name: 'Joseph', description: 'From the pit to the palace, his integrity and wisdom saved nations from famine.', imageSrc: 'https://placehold.co/600x400.png', hint: 'egyptian vizier' },
    { name: 'Paul', description: 'A persecutor transformed into a powerful apostle, spreading the Gospel to the Gentiles.', imageSrc: 'https://placehold.co/600x400.png', hint: 'roman apostle' },
    { name: 'Jacob', description: 'Wrestled with God and was renamed Israel, fathering the twelve tribes.', imageSrc: 'https://placehold.co/600x400.png', hint: 'ancient wrestler' },
    { name: 'Matthew', description: 'A tax collector who left everything to follow Jesus and became an evangelist.', imageSrc: 'https://placehold.co/600x400.png', hint: 'disciple writing' },
    { name: 'Mary Magdalene', description: 'A devoted follower and the first to witness the resurrection of Jesus.', imageSrc: 'https://placehold.co/600x400.png', hint: 'woman at tomb' },
    { name: 'Esther', description: 'A courageous queen who risked her life to save her people from annihilation.', imageSrc: 'https://placehold.co/600x400.png', hint: 'persian queen' },
    { name: 'Moses', description: 'Chosen by God to lead the Israelites out of slavery in Egypt and receive the Ten Commandments.', imageSrc: 'https://placehold.co/600x400.png', hint: 'parting sea' },
    { name: 'Job', description: 'A righteous man who maintained his faith in God despite immense suffering and loss.', imageSrc: 'https://placehold.co/600x400.png', hint: 'suffering man' },
  ];

  const prayerData = [
    { name: 'For Family', description: "Prayers for unity, protection, and God's love to fill your home.", imageSrc: 'https://placehold.co/600x400.png', hint: 'family praying' },
    { name: 'For Health', description: 'Seeking divine healing, strength, and wellness for body, mind, and spirit.', imageSrc: 'https://placehold.co/600x400.png', hint: 'healing light' },
    { name: 'For the Nation', description: 'Prayers for wisdom for leaders, peace in the land, and spiritual revival.', imageSrc: 'https://placehold.co/600x400.png', hint: 'praying over map' },
  ];

  const teachingData = [
    { name: 'On Marriage', description: 'Biblical principles for building a strong, Christ-centered, and loving marriage.', imageSrc: 'https://placehold.co/600x400.png', hint: 'couple holding hands' },
    { name: 'On Love', description: 'Understanding the greatest commandment and how to practice selfless, agape love.', imageSrc: 'https://placehold.co/600x400.png', hint: 'glowing heart' },
    { name: 'On Faith', description: 'Learning to live by faith, trust in God\'s promises, and move mountains.', imageSrc: 'https://placehold.co/600x400.png', hint: 'mustard seed plant' },
    { name: 'On Prosperity', description: 'God\'s perspective on biblical prosperity, stewardship, and generous living.', imageSrc: 'https://placehold.co/600x400.png', hint: 'overflowing harvest' },
    { name: 'On Healing', description: 'Exploring the scriptural basis for divine healing and how to receive it.', imageSrc: 'https://placehold.co/600x400.png', hint: 'healing hands light' },
    { name: 'On Time Management', description: 'Redeeming the time with purpose, wisdom, and eternal perspective.', imageSrc: 'https://placehold.co/600x400.png', hint: 'ancient hourglass' },
  ];
  
  const ContentCard = ({ item }: { item: { name: string; description: string; imageSrc: string; hint: string; } }) => (
    <Card className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden transition-transform hover:scale-105 cursor-pointer">
      <div className="relative w-full aspect-[3/2]">
        <Image src={item.imageSrc} alt={item.name} fill className="object-cover" data-ai-hint={item.hint} />
      </div>
      <div className="flex flex-col flex-grow p-4">
        <h3 className="text-xl font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full max-w-4xl text-center mb-4">
        <h2 className="text-2xl font-bold">Daily Divine Inspiration</h2>
        <p className="text-muted-foreground">Verses of Blessing, Adoration, and Thanksgiving</p>
      </div>

      <div className="w-full max-w-4xl flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={isLoading || activeIndex === 0}
          className="h-10 w-10 rounded-full flex-shrink-0 hidden md:inline-flex"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="sr-only">Previous Inspiration</span>
        </Button>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-grow flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        >
            {isLoading ? (
              [...Array(3)].map((_, i) => renderSkeletonCard(`sk-${i}`))
            ) : error ? (
              <div className="w-full flex-shrink-0 snap-center p-1">
                  <Card className="w-full shadow-lg rounded-xl min-h-[480px]">
                      <CardContent className="p-6 text-center flex items-center justify-center">
                          <p className="text-destructive">{error}</p>
                      </CardContent>
                  </Card>
              </div>
            ) : dailyVerses.length > 0 ? (
                dailyVerses.map(renderVerseCard)
            ) : (
              <div className="w-full flex-shrink-0 snap-center p-1">
                 <Card className="w-full shadow-lg rounded-xl min-h-[480px]">
                      <CardContent className="p-6 text-center flex items-center justify-center">
                          <p className="text-muted-foreground">Your daily inspiration is being prepared.</p>
                      </CardContent>
                  </Card>
              </div>
            )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isLoading || activeIndex >= dailyVerses.length - 1}
          className="h-10 w-10 rounded-full flex-shrink-0 hidden md:inline-flex"
        >
          <ChevronRight className="h-6 w-6" />
          <span className="sr-only">Next Inspiration</span>
        </Button>
      </div>

      {selectedInspiration && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl w-full h-full md:h-auto md:max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-4 flex-row items-center justify-between border-b">
                <DialogTitle className="text-lg">
                    {selectedInspiration.timeOfDay} Inspiration
                </DialogTitle>
                <DialogClose className="p-2 relative rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogClose>
            </DialogHeader>
            <div className="p-6 grid gap-4 overflow-y-auto">
                <DialogDescription className="text-primary font-semibold text-lg pt-2 text-center">
                    {`${selectedInspiration.verse.book} ${selectedInspiration.verse.chapter}:${selectedInspiration.verse.verse}`}
                </DialogDescription>
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

      <div className="w-full max-w-6xl mx-auto mt-8 text-center">
        <div className="flex justify-center gap-2 md:gap-4 mb-8 border-b pb-4">
          <Button variant={activeTab === 'testimonies' ? 'default' : 'outline'} onClick={() => setActiveTab('testimonies')} className="rounded-full px-6">
            Testimonies
          </Button>
          <Button variant={activeTab === 'prayers' ? 'default' : 'outline'} onClick={() => setActiveTab('prayers')} className="rounded-full px-6">
            Prayers
          </Button>
          <Button variant={activeTab === 'teachings' ? 'default' : 'outline'} onClick={() => setActiveTab('teachings')} className="rounded-full px-6">
            Teachings
          </Button>
        </div>

        <div className="pt-4">
          {activeTab === 'testimonies' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonyData.map((item) => <ContentCard key={item.name} item={item} />)}
            </div>
          )}
          {activeTab === 'prayers' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayerData.map((item) => <ContentCard key={item.name} item={item} />)}
            </div>
          )}
          {activeTab === 'teachings' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachingData.map((item) => <ContentCard key={item.name} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

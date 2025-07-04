
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';

import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Hand, Heart, MessageSquare, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getPrayers, addPrayer, addCommentToPrayer, addReactionToPrayer, type Prayer, type NewPrayer, type Comment, type Reactions } from '@/services/prayers';

const prayerFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  hint: z.string().min(2, { message: 'A hint is required.' }).max(40, { message: 'Hint must be 40 characters or less.' }),
});
type PrayerFormData = z.infer<typeof prayerFormSchema>;

const commentFormSchema = z.object({
  author: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

// Default prayers to show if the database is empty
const defaultPrayers: Prayer[] = [
    { id: 'default-1', name: 'Anonymous', description: 'For strength to overcome daily challenges.', hint: 'Daily Strength', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-2', name: 'A Parent', description: 'For wisdom in guiding my children.', hint: 'Parental Wisdom', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-3', name: 'A Student', description: 'For focus and clarity during my studies.', hint: 'Clarity in Study', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
];


export function PrayersSection() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(true);
  const [prayersError, setPrayersError] = useState<string | null>(null);
  const [isAddPrayerDialogOpen, setIsAddPrayerDialogOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState<{isOpen: boolean; prayer: Prayer | null}>({isOpen: false, prayer: null});

  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const prayerForm = useForm<PrayerFormData>({
    resolver: zodResolver(prayerFormSchema),
    defaultValues: { name: '', description: '', hint: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { author: '', text: '' },
  });

  const fetchPrayers = useCallback(async () => {
    setIsLoadingPrayers(true);
    setPrayersError(null);
    try {
      const data = await getPrayers();
      if (data.length > 0) {
        setPrayers(data);
      } else {
        setPrayers(defaultPrayers);
      }
    } catch (error: any) {
      console.error(error);
      setPrayersError(error.message || "Failed to load prayers. Please check your connection and try again.");
      setPrayers([]);
    } finally {
      setIsLoadingPrayers(false);
    }
  }, []);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);
  
  async function handleAddPrayer(data: PrayerFormData) {
    try {
      await addPrayer(data);
      toast({ title: 'Success!', description: 'Prayer added successfully.' });
      setIsAddPrayerDialogOpen(false);
      fetchPrayers();
      prayerForm.reset();
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add prayer.', variant: 'destructive' });
    }
  }

  async function handleReaction(prayerId: string, reactionType: keyof Reactions) {
    // Optimistic update
    setPrayers(prev => prev.map(p => {
        if (p.id === prayerId) {
            return { ...p, reactions: { ...p.reactions, [reactionType]: (p.reactions[reactionType] || 0) + 1 } };
        }
        return p;
    }));
    try {
        await addReactionToPrayer(prayerId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
        fetchPrayers(); // Re-fetch to correct optimistic update
    }
  }

  async function handleAddComment(data: CommentFormData) {
    if (!commentsModal.prayer) return;

    const newComment: Comment = {
      id: uuidv4(),
      author: data.author,
      text: data.text,
      createdAt: new Date().toISOString(),
    };
    
    setCommentsModal(prev => prev.prayer ? { ...prev, prayer: { ...prev.prayer, comments: [...(prev.prayer.comments || []), newComment] } } : prev);
    
    try {
      await addCommentToPrayer(commentsModal.prayer.id, newComment);
      commentForm.reset();
      await fetchPrayers();
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
      fetchPrayers();
    }
  }

  const PrayerContentCard = ({ item }: { item: Prayer }) => {
    return (
      <Card className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px] bg-card">
        <CardContent className="flex-grow flex flex-col p-6">
          <h3 className="text-4xl font-bold text-primary text-center">
            {item.hint}
          </h3>
          <div className="mt-auto text-center">
            <p className="font-semibold text-lg">{item.name}</p>
            <p className="text-sm text-muted-foreground font-bold">{item.description}</p>
          </div>
        </CardContent>
        <CardFooter className="p-2 pt-0 border-t">
          <div className="flex items-center ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span className="text-xs">{(item.reactions?.like || 0) + (item.reactions?.pray || 0) + (item.reactions?.claps || 0)}</span>
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1">
                  <div className="flex gap-1">
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'like')}>
                          <Heart className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'pray')}>
                          <Hand className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'claps')}>
                          <ThumbsUp className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'downlike')}>
                          <ThumbsDown className="h-4 w-4" />
                       </Button>
                  </div>
              </PopoverContent>
            </Popover>
            
            <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setCommentsModal({ isOpen: true, prayer: item })}>
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">{item.comments?.length || 0}</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };
  
  const ContentCardSkeleton = () => (
    <Card className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px]">
        <Skeleton className="w-full h-40" />
        <div className="flex flex-col flex-grow p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    </Card>
  );

  const CommentArea = ({ prayer }: { prayer: Prayer }) => (
    <>
      <ScrollArea className="flex-grow pr-6 -mr-6 my-4">
        <div className="space-y-4">
          {prayer.comments && prayer.comments.length > 0 ? (
            prayer.comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold">{comment.author.charAt(0)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{comment.author}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</p>
                  </div>
                  <p className="text-sm text-foreground/90">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to share!</p>
          )}
        </div>
      </ScrollArea>
      <div className="mt-auto pt-4 border-t">
        <Form {...commentForm}>
          <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-4">
            <FormField control={commentForm.control} name="author" render={({ field }) => ( <FormItem> <FormLabel>Your Name</FormLabel> <FormControl><Input placeholder="Your name" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={commentForm.control} name="text" render={({ field }) => ( <FormItem> <FormLabel>Your Comment</FormLabel> <FormControl><Textarea placeholder="Write a comment..." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <div className="text-right">
                <Button type="submit" disabled={commentForm.formState.isSubmitting}>{commentForm.formState.isSubmitting ? 'Posting...' : 'Post Comment'}</Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );

  return (
    <div className="w-full text-center">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-left">Prayers</h2>
                <p className="text-muted-foreground text-left">Community prayer requests and praises.</p>
            </div>
            <Dialog open={isAddPrayerDialogOpen} onOpenChange={setIsAddPrayerDialogOpen}>
                <DialogTrigger asChild><Button>Add Prayer</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader> <DialogTitle>Add a New Prayer</DialogTitle> <DialogDescription>Share a prayer request or praise.</DialogDescription> </DialogHeader>
                    <Form {...prayerForm}>
                        <form onSubmit={prayerForm.handleSubmit(handleAddPrayer)} className="space-y-4">
                            <FormField control={prayerForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="e.g., Jane D." {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={prayerForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Input placeholder="A brief description of your prayer" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={prayerForm.control} name="hint" render={({ field }) => ( <FormItem> <FormLabel>Prayer Hint</FormLabel> <FormControl><Input placeholder="e.g., For Healing" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <Button type="submit" disabled={prayerForm.formState.isSubmitting}>{prayerForm.formState.isSubmitting ? 'Submitting...' : 'Submit Prayer'}</Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingPrayers ? ([...Array(3)].map((_, i) => <ContentCardSkeleton key={i} />))
        : prayersError ? (
            <Card className="col-span-full bg-destructive/10 border-destructive/50 text-left">
                <CardHeader><CardTitle className="text-destructive">Error Loading Prayers</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>The application encountered an error while trying to fetch data from the database.</p>
                    <p className="font-semibold">The specific error message from the database is:</p>
                    <p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{prayersError}</p>
                </CardContent>
            </Card>
        ) : ( prayers.map((item) => <PrayerContentCard key={item.id} item={item} />) )}
        </div>

      {isMobile ? (
        <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, prayer: null })}>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle>Comments on "{commentsModal.prayer?.hint}"</SheetTitle>
              <SheetDescription>Read what others are saying.</SheetDescription>
            </SheetHeader>
            {commentsModal.prayer && <CommentArea prayer={commentsModal.prayer} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, prayer: null })}>
          <DialogContent className="max-w-2xl w-[90vw] h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments on "{commentsModal.prayer?.hint}"</DialogTitle>
              <DialogDescription>Read what others are saying.</DialogDescription>
            </DialogHeader>
             {commentsModal.prayer && <CommentArea prayer={commentsModal.prayer} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

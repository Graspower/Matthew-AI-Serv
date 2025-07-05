
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';

import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Hand, Heart, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { getPrayers, addPrayer, addCommentToPrayer, addReactionToPrayer, type Prayer, type NewPrayer } from '@/services/prayers';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, Reactions } from '@/types';

const prayerFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'A category is required.' }).max(40, { message: 'Category must be 40 characters or less.' }),
});
type PrayerFormData = z.infer<typeof prayerFormSchema>;

const commentFormSchema = z.object({
  author: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

const prayerCategories = ['Health & Healing', 'Family', 'Guidance', 'Finances', 'Protection', 'Thanksgiving', 'Spiritual Growth', 'World & Leaders', 'Loss & Grief', 'Salvation'];

const PRAYERS_CACHE_KEY = 'matthew-ai-prayers';

const getPrayersFromCache = (): Prayer[] | null => {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(PRAYERS_CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
};

const setPrayersInCache = (data: Prayer[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PRAYERS_CACHE_KEY, JSON.stringify(data));
};


const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  return truncated.slice(0, truncated.lastIndexOf(' '));
};

function ContentCardSkeleton() {
  return (
    <Card className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px]">
        <Skeleton className="w-full h-40" />
        <div className="flex flex-col flex-grow p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    </Card>
  );
}

function CommentArea({
  prayer,
  commentForm,
  handleAddComment,
}: {
  prayer: Prayer;
  commentForm: UseFormReturn<CommentFormData>;
  handleAddComment: (data: CommentFormData) => void;
}) {
  return (
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
}

export function PrayersSection() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(true);
  const [prayersError, setPrayersError] = useState<string | null>(null);
  const [isAddPrayerDialogOpen, setIsAddPrayerDialogOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState<{isOpen: boolean; prayer: Prayer | null}>({isOpen: false, prayer: null});
  const [detailsModal, setDetailsModal] = useState<{isOpen: boolean; prayer: Prayer | null}>({isOpen: false, prayer: null});

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const prayerForm = useForm<PrayerFormData>({
    resolver: zodResolver(prayerFormSchema),
    defaultValues: { name: '', description: '', category: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { author: '', text: '' },
  });

  const fetchPrayers = useCallback(async (forceRefresh = false) => {
    setIsLoadingPrayers(true);
    setPrayersError(null);

    if (!forceRefresh) {
        const cachedPrayers = getPrayersFromCache();
        if (cachedPrayers) {
          setPrayers(cachedPrayers);
          setIsLoadingPrayers(false);
          return;
        }
    }

    try {
      const data = await getPrayers();
      setPrayers(data);
      setPrayersInCache(data);
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
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to add a prayer.', variant: 'destructive' });
        return;
    }
    try {
      await addPrayer(data, user.uid);
      toast({ title: 'Success!', description: 'Prayer added successfully.' });
      setIsAddPrayerDialogOpen(false);
      fetchPrayers(true);
      prayerForm.reset();
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add prayer.', variant: 'destructive' });
    }
  }

  async function handleReaction(prayerId: string, reactionType: keyof Reactions) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to react.', variant: 'destructive' });
        return;
    }
    setPrayers(prev => prev.map(p => {
        if (p.id === prayerId) {
            return { ...p, reactions: { ...p.reactions, [reactionType]: (p.reactions[reactionType] || 0) + 1 } };
        }
        return p;
    }));
    setDetailsModal(prev => prev.prayer?.id === prayerId ? { ...prev, prayer: { ...prev.prayer, reactions: { ...prev.prayer.reactions, [reactionType]: (prev.prayer.reactions[reactionType] || 0) + 1 } } } : prev);

    try {
        await addReactionToPrayer(prayerId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
        fetchPrayers(true);
    }
  }

  async function handleAddComment(data: CommentFormData) {
    if (!commentsModal.prayer) return;
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to comment.', variant: 'destructive' });
        return;
    }
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
      fetchPrayers(true);
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
      fetchPrayers(true);
    }
  }

  const PrayerContentCard = ({ item }: { item: Prayer }) => {
    return (
      <Card 
        className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px] bg-card cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl"
        onClick={() => setDetailsModal({isOpen: true, prayer: item})}
      >
        <CardContent className="flex-grow flex flex-col p-6 justify-center items-center text-center">
            <h3 className="font-serif font-semibold text-xl text-primary/90 capitalize [text-shadow:0_1px_2px_hsl(var(--primary)/0.2)]">
                {item.category}
            </h3>
            <div className="mt-4">
                <p className="font-semibold text-lg">{item.name}</p>
                <p className="text-sm text-muted-foreground font-bold">{truncateText(item.description, 100)}{item.description.length > 100 ? '...' : ''}</p>
            </div>
        </CardContent>
         <CardFooter className="p-2 border-t justify-end flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>{(item.reactions?.like || 0) + (item.reactions?.pray || 0) + (item.reactions?.claps || 0)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{item.comments?.length || 0}</span>
            </div>
        </CardFooter>
      </Card>
    );
  };

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
                            <FormField control={prayerForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Prayer Request</FormLabel> <FormControl><Textarea placeholder="A detailed description of your prayer" rows={5} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={prayerForm.control} name="category" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Prayer Category</FormLabel> 
                                    <FormControl><Input placeholder="e.g., For Healing" {...field} /></FormControl> 
                                     <div className="flex flex-wrap gap-2 pt-2">
                                        {prayerCategories.map(cat => (
                                            <Button key={cat} type="button" variant="outline" size="sm" onClick={() => prayerForm.setValue('category', cat, { shouldValidate: true })}>{cat}</Button>
                                        ))}
                                    </div>
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
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
                  <CardContent className="p-6">
                      <h3 className="text-destructive font-bold">Error Loading Prayers</h3>
                      <p>The application encountered an error while trying to fetch data.</p>
                      <p className="font-semibold mt-2">Error Details:</p>
                      <p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{prayersError}</p>
                  </CardContent>
              </Card>
          ) : prayers.length > 0 ? (
            prayers.map((item) => <PrayerContentCard key={item.id} item={item} />)
          ) : (
            <div className="col-span-full text-center text-muted-foreground mt-8">
              <p>No prayers have been shared yet.</p>
              {user && <p>Be the first to share one by clicking the "Add Prayer" button!</p>}
            </div>
          )}
        </div>
      
      {detailsModal.prayer && (
        <Dialog open={detailsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setDetailsModal({ isOpen: false, prayer: null })}>
          <DialogContent className="max-w-2xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-3xl font-serif font-bold text-primary">{detailsModal.prayer.category}</DialogTitle>
              <DialogDescription className="pt-2 text-lg">By: {detailsModal.prayer.name}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4">
              <p className="py-4 text-foreground/90 whitespace-pre-wrap">{detailsModal.prayer.description}</p>
            </ScrollArea>
            <div className="pt-4 border-t flex items-center">
              <span className="text-sm text-muted-foreground">React or Comment:</span>
              <div className="flex items-center ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-xs">{(detailsModal.prayer.reactions?.like || 0) + (detailsModal.prayer.reactions?.pray || 0) + (detailsModal.prayer.reactions?.claps || 0)}</span>
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                      <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.prayer!.id, 'like')}>
                              <Heart className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.prayer!.id, 'pray')}>
                              <Hand className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.prayer!.id, 'claps')}>
                              <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.prayer!.id, 'downlike')}>
                              <ThumbsDown className="h-4 w-4" />
                          </Button>
                      </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setCommentsModal({ isOpen: true, prayer: detailsModal.prayer })}>
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">{detailsModal.prayer.comments?.length || 0}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isMobile ? (
        <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, prayer: null })}>
          <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle>Comments on "{commentsModal.prayer?.category}"</SheetTitle>
              <SheetDescription>Read what others are saying.</SheetDescription>
            </SheetHeader>
            {commentsModal.prayer && <CommentArea prayer={commentsModal.prayer} commentForm={commentForm} handleAddComment={handleAddComment} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, prayer: null })}>
          <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments on "{commentsModal.prayer?.category}"</DialogTitle>
              <DialogDescription>Read what others are saying.</DialogDescription>
            </DialogHeader>
             {commentsModal.prayer && <CommentArea prayer={commentsModal.prayer} commentForm={commentForm} handleAddComment={handleAddComment} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

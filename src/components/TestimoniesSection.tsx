
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
import { getTestimonies, addTestimony, addCommentToTestimony, addReactionToTestimony, type Testimony, type NewTestimony, type Comment, type Reactions } from '@/services/testimonies';

const testimonyFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  hint: z.string().min(2, { message: 'A hint is required.' }).max(40, { message: 'Hint must be 40 characters or less.' }),
});
type TestimonyFormData = z.infer<typeof testimonyFormSchema>;

const commentFormSchema = z.object({
  author: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

// Default testimonies to show if the database is empty
const defaultTestimonies: Testimony[] = [
    { id: 'default-1', name: 'Abraham', description: "Became the father of many nations through faith.", hint: 'Father of Nations', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-2', name: 'Esther', description: "Risked her life to save her people.", hint: 'Courageous Queen', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-3', name: 'Jacob', description: "Received a new name after wrestling with God.", hint: 'Wrestled God', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-4', name: 'Job', description: "Remained faithful to God despite immense loss.", hint: 'Unwavering Faith', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-5', name: 'Joseph', description: "From a prison to a palace, he saved many.", hint: 'Dreamer to Ruler', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-6', name: 'Mary Magdalene', description: "The first to see the risen Christ.", hint: 'Devoted Follower', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-7', name: 'Matthew', description: "Left his tax booth to become an apostle.", hint: 'Followed Jesus', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-8', name: 'Moses', description: "Led the Israelites out of slavery in Egypt.", hint: 'The Lawgiver', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-9', name: 'Paul', description: "Transformed from persecutor to powerful apostle.", hint: 'Damascus Road', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
];


export function TestimoniesSection() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [isLoadingTestimonies, setIsLoadingTestimonies] = useState(true);
  const [testimoniesError, setTestimoniesError] = useState<string | null>(null);
  const [isAddTestimonyDialogOpen, setIsAddTestimonyDialogOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState<{isOpen: boolean; testimony: Testimony | null}>({isOpen: false, testimony: null});

  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const testimonyForm = useForm<TestimonyFormData>({
    resolver: zodResolver(testimonyFormSchema),
    defaultValues: { name: '', description: '', hint: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { author: '', text: '' },
  });

  const fetchTestimonies = useCallback(async () => {
    setIsLoadingTestimonies(true);
    setTestimoniesError(null);
    try {
      const data = await getTestimonies();
      if (data.length > 0) {
        setTestimonies(data);
      } else {
        setTestimonies(defaultTestimonies);
      }
    } catch (error: any) {
      console.error(error);
      setTestimoniesError(error.message || "Failed to load testimonies. Please check your connection and try again.");
      setTestimonies([]);
    } finally {
      setIsLoadingTestimonies(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonies();
  }, [fetchTestimonies]);
  
  async function handleAddTestimony(data: TestimonyFormData) {
    try {
      await addTestimony(data);
      toast({ title: 'Success!', description: 'Testimony added successfully.' });
      setIsAddTestimonyDialogOpen(false);
      fetchTestimonies();
      testimonyForm.reset();
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add testimony.', variant: 'destructive' });
    }
  }

  async function handleReaction(testimonyId: string, reactionType: keyof Reactions) {
    // Optimistic update
    setTestimonies(prev => prev.map(t => {
        if (t.id === testimonyId) {
            return { ...t, reactions: { ...t.reactions, [reactionType]: (t.reactions[reactionType] || 0) + 1 } };
        }
        return t;
    }));
    try {
        await addReactionToTestimony(testimonyId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
        fetchTestimonies(); // Re-fetch to correct optimistic update
    }
  }

  async function handleAddComment(data: CommentFormData) {
    if (!commentsModal.testimony) return;

    const newComment: Comment = {
      id: uuidv4(),
      author: data.author,
      text: data.text,
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic update for immediate UI feedback
    setCommentsModal(prev => prev.testimony ? { ...prev, testimony: { ...prev.testimony, comments: [...(prev.testimony.comments || []), newComment] } } : prev);
    
    try {
      await addCommentToTestimony(commentsModal.testimony.id, newComment);
      commentForm.reset();
      // On success, refresh all data to ensure consistency.
      await fetchTestimonies();
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
      // On failure, revert the optimistic update by re-fetching.
      fetchTestimonies();
    }
  }

  const TestimonyContentCard = ({ item }: { item: Testimony }) => {
    return (
      <Card className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px] bg-card">
        <CardContent className="flex-grow flex flex-col p-6">
          <h3 className="text-3xl font-serif font-normal text-primary text-center">
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
            
            <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setCommentsModal({ isOpen: true, testimony: item })}>
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

  const CommentArea = ({ testimony }: { testimony: Testimony }) => (
    <>
      <ScrollArea className="flex-grow pr-6 -mr-6 my-4">
        <div className="space-y-4">
          {testimony.comments && testimony.comments.length > 0 ? (
            testimony.comments.map(comment => (
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
                <h2 className="text-2xl font-bold text-left">Testimonies</h2>
                <p className="text-muted-foreground text-left">Stories of faith and transformation.</p>
            </div>
            <Dialog open={isAddTestimonyDialogOpen} onOpenChange={setIsAddTestimonyDialogOpen}>
                <DialogTrigger asChild><Button>Add Testimony</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader> <DialogTitle>Add a New Testimony</DialogTitle> <DialogDescription>Share a testimony to encourage others.</DialogDescription> </DialogHeader>
                    <Form {...testimonyForm}>
                        <form onSubmit={testimonyForm.handleSubmit(handleAddTestimony)} className="space-y-4">
                            <FormField control={testimonyForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="e.g., Abraham" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={testimonyForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Input placeholder="A brief description of the testimony" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={testimonyForm.control} name="hint" render={({ field }) => ( <FormItem> <FormLabel>Testimony Hint</FormLabel> <FormControl><Input placeholder="e.g., Father of Nations" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <Button type="submit" disabled={testimonyForm.formState.isSubmitting}>{testimonyForm.formState.isSubmitting ? 'Submitting...' : 'Submit Testimony'}</Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingTestimonies ? ([...Array(6)].map((_, i) => <ContentCardSkeleton key={i} />))
        : testimoniesError ? (
            <Card className="col-span-full bg-destructive/10 border-destructive/50 text-left">
                <CardHeader><CardTitle className="text-destructive">Error Loading Testimonies</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>The application encountered an error while trying to fetch data from the database.</p>
                    <p className="font-semibold">The specific error message from the database is:</p>
                    <p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{testimoniesError}</p>
                </CardContent>
            </Card>
        ) : ( testimonies.map((item) => <TestimonyContentCard key={item.id} item={item} />) )}
        </div>

      {isMobile ? (
        <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, testimony: null })}>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle>Comments on "{commentsModal.testimony?.hint}"</SheetTitle>
              <SheetDescription>Read what others are saying.</SheetDescription>
            </SheetHeader>
            {commentsModal.testimony && <CommentArea testimony={commentsModal.testimony} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, testimony: null })}>
          <DialogContent className="max-w-2xl w-[90vw] h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments on "{commentsModal.testimony?.hint}"</DialogTitle>
              <DialogDescription>Read what others are saying.</DialogDescription>
            </DialogHeader>
             {commentsModal.testimony && <CommentArea testimony={commentsModal.testimony} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

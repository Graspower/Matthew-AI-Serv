
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
import { getTeachings, addTeaching, addCommentToTeaching, addReactionToTeaching, type Teaching, type NewTeaching, type Comment, type Reactions } from '@/services/teachings';

const teachingFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  hint: z.string().min(2, { message: 'A hint is required.' }).max(40, { message: 'Hint must be 40 characters or less.' }),
});
type TeachingFormData = z.infer<typeof teachingFormSchema>;

const commentFormSchema = z.object({
  author: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

// Default teachings to show if the database is empty
const defaultTeachings: Teaching[] = [
    { id: 'default-1', name: 'Jesus', description: "A man had two sons...", hint: 'Prodigal Son', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-2', name: 'Jesus', description: "Blessed are the meek, for they will inherit the earth.", hint: 'The Beatitudes', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
    { id: 'default-3', name: 'Paul', description: "Love is patient, love is kind...", hint: 'The Way of Love', comments: [], reactions: { like: 0, pray: 0, claps: 0, downlike: 0 } },
];


export function TeachingsSection() {
  const [teachings, setTeachings] = useState<Teaching[]>([]);
  const [isLoadingTeachings, setIsLoadingTeachings] = useState(true);
  const [teachingsError, setTeachingsError] = useState<string | null>(null);
  const [isAddTeachingDialogOpen, setIsAddTeachingDialogOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState<{isOpen: boolean; teaching: Teaching | null}>({isOpen: false, teaching: null});

  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const teachingForm = useForm<TeachingFormData>({
    resolver: zodResolver(teachingFormSchema),
    defaultValues: { name: '', description: '', hint: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { author: '', text: '' },
  });

  const fetchTeachings = useCallback(async () => {
    setIsLoadingTeachings(true);
    setTeachingsError(null);
    try {
      const data = await getTeachings();
      if (data.length > 0) {
        setTeachings(data);
      } else {
        setTeachings(defaultTeachings);
      }
    } catch (error: any) {
      console.error(error);
      setTeachingsError(error.message || "Failed to load teachings. Please check your connection and try again.");
      setTeachings([]);
    } finally {
      setIsLoadingTeachings(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachings();
  }, [fetchTeachings]);
  
  async function handleAddTeaching(data: TeachingFormData) {
    try {
      await addTeaching(data);
      toast({ title: 'Success!', description: 'Teaching added successfully.' });
      setIsAddTeachingDialogOpen(false);
      fetchTeachings();
      teachingForm.reset();
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add teaching.', variant: 'destructive' });
    }
  }

  async function handleReaction(teachingId: string, reactionType: keyof Reactions) {
    // Optimistic update
    setTeachings(prev => prev.map(t => {
        if (t.id === teachingId) {
            return { ...t, reactions: { ...t.reactions, [reactionType]: (t.reactions[reactionType] || 0) + 1 } };
        }
        return t;
    }));
    try {
        await addReactionToTeaching(teachingId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
        fetchTeachings(); // Re-fetch to correct optimistic update
    }
  }

  async function handleAddComment(data: CommentFormData) {
    if (!commentsModal.teaching) return;

    const newComment: Comment = {
      id: uuidv4(),
      author: data.author,
      text: data.text,
      createdAt: new Date().toISOString(),
    };
    
    setCommentsModal(prev => prev.teaching ? { ...prev, teaching: { ...prev.teaching, comments: [...(prev.teaching.comments || []), newComment] } } : prev);
    
    try {
      await addCommentToTeaching(commentsModal.teaching.id, newComment);
      commentForm.reset();
      await fetchTeachings();
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
      fetchTeachings();
    }
  }

  const TeachingContentCard = ({ item }: { item: Teaching }) => {
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
            
            <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setCommentsModal({ isOpen: true, teaching: item })}>
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

  const CommentArea = ({ teaching }: { teaching: Teaching }) => (
    <>
      <ScrollArea className="flex-grow pr-6 -mr-6 my-4">
        <div className="space-y-4">
          {teaching.comments && teaching.comments.length > 0 ? (
            teaching.comments.map(comment => (
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
                <h2 className="text-2xl font-bold text-left">Teachings</h2>
                <p className="text-muted-foreground text-left">Key lessons and parables.</p>
            </div>
            <Dialog open={isAddTeachingDialogOpen} onOpenChange={setIsAddTeachingDialogOpen}>
                <DialogTrigger asChild><Button>Add Teaching</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader> <DialogTitle>Add a New Teaching</DialogTitle> <DialogDescription>Share a teaching to edify others.</DialogDescription> </DialogHeader>
                    <Form {...teachingForm}>
                        <form onSubmit={teachingForm.handleSubmit(handleAddTeaching)} className="space-y-4">
                            <FormField control={teachingForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Source/Speaker</FormLabel> <FormControl><Input placeholder="e.g., Jesus" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={teachingForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Input placeholder="A brief summary of the teaching" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={teachingForm.control} name="hint" render={({ field }) => ( <FormItem> <FormLabel>Teaching Hint</FormLabel> <FormControl><Input placeholder="e.g., The Beatitudes" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <Button type="submit" disabled={teachingForm.formState.isSubmitting}>{teachingForm.formState.isSubmitting ? 'Submitting...' : 'Submit Teaching'}</Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingTeachings ? ([...Array(3)].map((_, i) => <ContentCardSkeleton key={i} />))
        : teachingsError ? (
            <Card className="col-span-full bg-destructive/10 border-destructive/50 text-left">
                <CardHeader><CardTitle className="text-destructive">Error Loading Teachings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p>The application encountered an error while trying to fetch data from the database.</p>
                    <p className="font-semibold">The specific error message from the database is:</p>
                    <p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{teachingsError}</p>
                </CardContent>
            </Card>
        ) : ( teachings.map((item) => <TeachingContentCard key={item.id} item={item} />) )}
        </div>

      {isMobile ? (
        <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, teaching: null })}>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle>Comments on "{commentsModal.teaching?.hint}"</SheetTitle>
              <SheetDescription>Read what others are saying.</SheetDescription>
            </SheetHeader>
            {commentsModal.teaching && <CommentArea teaching={commentsModal.teaching} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, teaching: null })}>
          <DialogContent className="max-w-2xl w-[90vw] h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments on "{commentsModal.teaching?.hint}"</DialogTitle>
              <DialogDescription>Read what others are saying.</DialogDescription>
            </DialogHeader>
             {commentsModal.teaching && <CommentArea teaching={commentsModal.teaching} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


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
import { getTeachings, addTeaching, addCommentToTeaching, addReactionToTeaching, type Teaching, type NewTeaching, type Comment, type Reactions } from '@/services/teachings';
import { useAuth } from '@/contexts/AuthContext';

const teachingFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'A category is required.' }).max(40, { message: 'Category must be 40 characters or less.' }),
});
type TeachingFormData = z.infer<typeof teachingFormSchema>;

const commentFormSchema = z.object({
  author: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

const teachingCategories = ['Faith', 'Love', 'Forgiveness', 'Parables', 'Discipleship', 'End Times', 'The Law', 'Grace', 'Prayer', 'Serving Others'];

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
  teaching,
  commentForm,
  handleAddComment,
}: {
  teaching: Teaching;
  commentForm: UseFormReturn<CommentFormData>;
  handleAddComment: (data: CommentFormData) => void;
}) {
  return (
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
}

export function TeachingsSection() {
  const [teachings, setTeachings] = useState<Teaching[]>([]);
  const [isLoadingTeachings, setIsLoadingTeachings] = useState(true);
  const [teachingsError, setTeachingsError] = useState<string | null>(null);
  const [isAddTeachingDialogOpen, setIsAddTeachingDialogOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState<{isOpen: boolean; teaching: Teaching | null}>({isOpen: false, teaching: null});
  const [detailsModal, setDetailsModal] = useState<{isOpen: boolean; teaching: Teaching | null}>({isOpen: false, teaching: null});

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const teachingForm = useForm<TeachingFormData>({
    resolver: zodResolver(teachingFormSchema),
    defaultValues: { name: '', description: '', category: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { author: '', text: '' },
  });

  const fetchTeachings = useCallback(async () => {
    setIsLoadingTeachings(true);
    setTeachingsError(null);
    if (!user) {
        setTeachings([]);
        setIsLoadingTeachings(false);
        return;
    }
    try {
      const data = await getTeachings(user.uid);
      setTeachings(data);
    } catch (error: any) {
      console.error(error);
      setTeachingsError(error.message || "Failed to load teachings. Please check your connection and try again.");
      setTeachings([]);
    } finally {
      setIsLoadingTeachings(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeachings();
  }, [fetchTeachings]);
  
  async function handleAddTeaching(data: TeachingFormData) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to add a teaching.', variant: 'destructive' });
        return;
    }
    try {
      await addTeaching(data, user.uid);
      toast({ title: 'Success!', description: 'Teaching added successfully.' });
      setIsAddTeachingDialogOpen(false);
      fetchTeachings();
      teachingForm.reset();
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add teaching.', variant: 'destructive' });
    }
  }

  async function handleReaction(teachingId: string, reactionType: keyof Reactions) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to react.', variant: 'destructive' });
        return;
    }
    setTeachings(prev => prev.map(t => {
        if (t.id === teachingId) {
            return { ...t, reactions: { ...t.reactions, [reactionType]: (t.reactions[reactionType] || 0) + 1 } };
        }
        return t;
    }));
    setDetailsModal(prev => prev.teaching?.id === teachingId ? { ...prev, teaching: { ...prev.teaching, reactions: { ...prev.teaching.reactions, [reactionType]: (prev.teaching.reactions[reactionType] || 0) + 1 } } } : prev);

    try {
        await addReactionToTeaching(teachingId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
        await fetchTeachings();
    }
  }

  async function handleAddComment(data: CommentFormData) {
    if (!commentsModal.teaching) return;
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
    
    setCommentsModal(prev => prev.teaching ? { ...prev, teaching: { ...prev.teaching, comments: [...(prev.teaching.comments || []), newComment] } } : prev);
    
    try {
      await addCommentToTeaching(commentsModal.teaching.id, newComment);
      commentForm.reset();
      await fetchTeachings(); 
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
      await fetchTeachings();
    }
  }

  function TeachingContentCard({ item }: { item: Teaching }) {
    return (
      <Card 
        className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px] bg-card cursor-pointer"
        onClick={() => setDetailsModal({isOpen: true, teaching: item})}
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
  }

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
                            <FormField control={teachingForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Teaching</FormLabel> <FormControl><Textarea placeholder="A detailed summary of the teaching" rows={5} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={teachingForm.control} name="category" render={({ field }) => ( 
                                <FormItem> 
                                    <FormLabel>Teaching Category</FormLabel> 
                                    <FormControl><Input placeholder="e.g., The Beatitudes" {...field} /></FormControl> 
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {teachingCategories.map(cat => (
                                            <Button key={cat} type="button" variant="outline" size="sm" onClick={() => teachingForm.setValue('category', cat, { shouldValidate: true })}>{cat}</Button>
                                        ))}
                                    </div>
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
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
                <CardContent className="p-6">
                    <h3 className="text-destructive font-bold">Error Loading Teachings</h3>
                    <p>The application encountered an error while trying to fetch data.</p>
                    <p className="font-semibold mt-2">Error Details:</p>
                    <p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{teachingsError}</p>
                </CardContent>
            </Card>
        ) : teachings.length > 0 ? (
           teachings.map((item) => <TeachingContentCard key={item.id} item={item} />)
        ) : (
          <div className="col-span-full text-center text-muted-foreground mt-8">
            <p>{user ? 'You have not added any teachings yet.' : 'Please log in to see your teachings.'}</p>
            {user && <p>You can add one by clicking the "Add Teaching" button.</p>}
          </div>
        )}
        </div>

      {detailsModal.teaching && (
        <Dialog open={detailsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setDetailsModal({ isOpen: false, teaching: null })}>
          <DialogContent className="max-w-2xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-3xl font-serif font-bold text-primary">{detailsModal.teaching.category}</DialogTitle>
              <DialogDescription className="pt-2 text-lg">By: {detailsModal.teaching.name}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4">
              <p className="py-4 text-foreground/90 whitespace-pre-wrap">{detailsModal.teaching.description}</p>
            </ScrollArea>
            <div className="pt-4 border-t flex items-center">
              <span className="text-sm text-muted-foreground">React or Comment:</span>
              <div className="flex items-center ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-xs">{(detailsModal.teaching.reactions?.like || 0) + (detailsModal.teaching.reactions?.pray || 0) + (detailsModal.teaching.reactions?.claps || 0)}</span>
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                      <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.teaching!.id, 'like')}>
                              <Heart className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.teaching!.id, 'pray')}>
                              <Hand className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.teaching!.id, 'claps')}>
                              <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.teaching!.id, 'downlike')}>
                              <ThumbsDown className="h-4 w-4" />
                          </Button>
                      </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setCommentsModal({ isOpen: true, teaching: detailsModal.teaching })}>
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">{detailsModal.teaching.comments?.length || 0}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isMobile ? (
        <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, teaching: null })}>
          <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle>Comments on "{commentsModal.teaching?.category}"</SheetTitle>
              <SheetDescription>Read what others are saying.</SheetDescription>
            </SheetHeader>
            {commentsModal.teaching && <CommentArea teaching={commentsModal.teaching} commentForm={commentForm} handleAddComment={handleAddComment} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, teaching: null })}>
          <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments on "{commentsModal.teaching?.category}"</DialogTitle>
              <DialogDescription>Read what others are saying.</DialogDescription>
            </DialogHeader>
             {commentsModal.teaching && <CommentArea teaching={commentsModal.teaching} commentForm={commentForm} handleAddComment={handleAddComment} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

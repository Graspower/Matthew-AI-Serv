
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { formatDistanceToNow } from 'date-fns';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
import { addTestimony, addCommentToTestimony, addReactionToTestimony, type Testimony } from '@/services/testimonies';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, Reactions } from '@/types';

const testimonyFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'A category is required.' }).max(40, { message: 'Category must be 40 characters or less.' }),
});
type TestimonyFormData = z.infer<typeof testimonyFormSchema>;

const commentFormSchema = z.object({
  author: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

const testimonyCategories = ['Salvation', 'Business Breakthrough', 'Marriage Success', 'Job', 'Health', 'Baby', 'Healing', 'Deliverance', 'Financial Provision', 'Academic Success'];

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
  testimony,
  commentForm,
  handleAddComment,
  user,
}: {
  testimony: Testimony;
  commentForm: UseFormReturn<CommentFormData>;
  handleAddComment: (data: CommentFormData) => void;
  user: any;
}) {
  return (
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
            <FormField control={commentForm.control} name="author" render={({ field }) => ( <FormItem> <FormLabel>Your Name</FormLabel> <FormControl><Input placeholder="Your name" {...field} disabled={!!user} /></FormControl> <FormMessage /> </FormItem> )}/>
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

export function TestimoniesSection() {
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [isLoadingTestimonies, setIsLoadingTestimonies] = useState(true);
  const [testimoniesError, setTestimoniesError] = useState<string | null>(null);
  const [isAddTestimonyDialogOpen, setIsAddTestimonyDialogOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState<{isOpen: boolean; testimony: Testimony | null}>({isOpen: false, testimony: null});
  const [detailsModal, setDetailsModal] = useState<{isOpen: boolean; testimony: Testimony | null}>({isOpen: false, testimony: null});

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  const testimonyForm = useForm<TestimonyFormData>({
    resolver: zodResolver(testimonyFormSchema),
    defaultValues: { name: '', description: '', category: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { author: '', text: '' },
  });

  // Pre-fill forms with user's name when dialogs open
  useEffect(() => {
    if (user?.displayName && isAddTestimonyDialogOpen) {
        testimonyForm.setValue('name', user.displayName);
    }
  }, [user, testimonyForm, isAddTestimonyDialogOpen]);
  
  useEffect(() => {
    if (user?.displayName && commentsModal.isOpen) {
        commentForm.setValue('author', user.displayName);
    }
  }, [user, commentForm, commentsModal.isOpen]);


  // Real-time listener for testimonies
  useEffect(() => {
    if (!db) {
      setTestimoniesError("Firebase is not configured.");
      setIsLoadingTestimonies(false);
      return;
    }

    setIsLoadingTestimonies(true);
    const testimoniesCol = collection(db, 'testimonies');
    
    const unsubscribe = onSnapshot(testimoniesCol, (querySnapshot) => {
      const testimonyList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const comments = (data.comments || []).map((c: any) => ({
          ...c,
          createdAt: c.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        }));
        return {
          id: doc.id,
          name: data.name || 'Anonymous',
          description: data.description || '',
          category: data.category || 'Testimony',
          reactions: data.reactions || { like: 0, pray: 0, claps: 0, downlike: 0 },
          comments: comments,
          userId: data.userId,
        } as Testimony;
      }).sort((a, b) => a.name.localeCompare(b.name));

      setTestimonies(testimonyList);
      setTestimoniesError(null);
      setIsLoadingTestimonies(false);
    }, (error) => {
      console.error("Error fetching testimonies in real-time: ", error);
      if (error.code === 'permission-denied') {
        setTestimoniesError("Permission Denied: Your security rules are not set up to allow reading testimonies.");
      } else {
        setTestimoniesError(error.message || "Failed to load testimonies.");
      }
      setIsLoadingTestimonies(false);
    });

    return () => unsubscribe();
  }, []);

  // Keep modals in sync with the real-time testimonies list
  useEffect(() => {
    if (detailsModal.isOpen && detailsModal.testimony) {
      const updatedTestimony = testimonies.find(p => p.id === detailsModal.testimony!.id);
      if (updatedTestimony) {
        if (JSON.stringify(updatedTestimony) !== JSON.stringify(detailsModal.testimony)) {
          setDetailsModal({ isOpen: true, testimony: updatedTestimony });
        }
      } else {
        setDetailsModal({ isOpen: false, testimony: null });
      }
    }
  }, [testimonies, detailsModal]);

  useEffect(() => {
    if (commentsModal.isOpen && commentsModal.testimony) {
      const updatedTestimony = testimonies.find(p => p.id === commentsModal.testimony!.id);
      if (updatedTestimony) {
        if (JSON.stringify(updatedTestimony) !== JSON.stringify(commentsModal.testimony)) {
          setCommentsModal({ isOpen: true, testimony: updatedTestimony });
        }
      } else {
        setCommentsModal({ isOpen: false, testimony: null });
      }
    }
  }, [testimonies, commentsModal]);
  
  async function handleAddTestimony(data: TestimonyFormData) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to add a testimony.', variant: 'destructive' });
        return;
    }
    try {
      await addTestimony(data, user.uid);
      toast({ title: 'Success!', description: 'Testimony added successfully.' });
      setIsAddTestimonyDialogOpen(false);
      testimonyForm.reset({name: user.displayName || '', description: '', category: ''});
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add testimony.', variant: 'destructive' });
    }
  }

  async function handleReaction(testimonyId: string, reactionType: keyof Reactions) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to react.', variant: 'destructive' });
        return;
    }
    try {
        await addReactionToTestimony(testimonyId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
    }
  }

  async function handleAddComment(data: CommentFormData) {
    if (!commentsModal.testimony) return;
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
    
    try {
      await addCommentToTestimony(commentsModal.testimony.id, newComment);
      commentForm.reset({ author: user?.displayName || '', text: '' });
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
    }
  }

  const TestimonyContentCard = ({ item }: { item: Testimony }) => {
    return (
      <Card 
        className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px] bg-card cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl"
        onClick={() => setDetailsModal({isOpen: true, testimony: item})}
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
        <CardFooter className="p-2 border-t justify-end flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  <Heart className="h-4 w-4" />
                  <span>{(item.reactions?.like || 0) + (item.reactions?.pray || 0) + (item.reactions?.claps || 0)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'like')}><Heart className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'pray')}><Hand className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'claps')}><ThumbsUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(item.id, 'downlike')}><ThumbsDown className="h-4 w-4" /></Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); setCommentsModal({isOpen: true, testimony: item}); }}>
              <MessageSquare className="h-4 w-4" />
              <span>{item.comments?.length || 0}</span>
            </Button>
        </CardFooter>
      </Card>
    );
  };
  
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
                            <FormField control={testimonyForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input placeholder="e.g., Abraham" {...field} disabled={!!user} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={testimonyForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Testimony</FormLabel> <FormControl><Textarea placeholder="A detailed description of the testimony" rows={5} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={testimonyForm.control} name="category" render={({ field }) => (
                                <FormItem> 
                                    <FormLabel>Testimony Category</FormLabel> 
                                    <FormControl><Input placeholder="e.g., Father of Nations" {...field} /></FormControl>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {testimonyCategories.map(cat => (
                                            <Button key={cat} type="button" variant="outline" size="sm" onClick={() => testimonyForm.setValue('category', cat, { shouldValidate: true })}>{cat}</Button>
                                        ))}
                                    </div>
                                    <FormMessage /> 
                                </FormItem> 
                            )}/>
                            <Button type="submit" disabled={testimonyForm.formState.isSubmitting}>{testimonyForm.formState.isSubmitting ? 'Submitting...' : 'Submit Testimony'}</Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingTestimonies ? ([...Array(3)].map((_, i) => <ContentCardSkeleton key={i} />))
          : testimoniesError ? (
              <Card className="col-span-full bg-destructive/10 border-destructive/50 text-left">
                  <CardContent className="p-6">
                    <h3 className="text-destructive font-bold">Error Loading Testimonies</h3>
                    <p>The application encountered an error while trying to fetch data.</p>
                    <p className="font-semibold mt-2">Error Details:</p>
                    <p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{testimoniesError}</p>
                  </CardContent>
              </Card>
          ) : testimonies.length > 0 ? (
            testimonies.map((item) => <TestimonyContentCard key={item.id} item={item} />)
          ) : (
            <div className="col-span-full text-center text-muted-foreground mt-8">
              <p>No testimonies have been shared yet.</p>
              {user && <p>Be the first to share one by clicking the "Add Testimony" button!</p>}
            </div>
          )}
        </div>
        
      {detailsModal.testimony && (
        <Dialog open={detailsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setDetailsModal({ isOpen: false, testimony: null })}>
          <DialogContent className="max-w-2xl w-[90vw]">
            <DialogHeader>
              <DialogTitle className="text-3xl font-serif font-bold text-primary">{detailsModal.testimony.category}</DialogTitle>
              <DialogDescription className="pt-2 text-lg">By: {detailsModal.testimony.name}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4">
              <p className="py-4 text-foreground/90 whitespace-pre-wrap">{detailsModal.testimony.description}</p>
            </ScrollArea>
            <div className="pt-4 border-t flex items-center">
              <span className="text-sm text-muted-foreground">React or Comment:</span>
              <div className="flex items-center ml-auto">
                <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-xs">{(detailsModal.testimony.reactions?.like || 0) + (detailsModal.testimony.reactions?.pray || 0) + (detailsModal.testimony.reactions?.claps || 0)}</span>
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                      <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.testimony!.id, 'like')}>
                              <Heart className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.testimony!.id, 'pray')}>
                              <Hand className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.testimony!.id, 'claps')}>
                              <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReaction(detailsModal.testimony!.id, 'downlike')}>
                              <ThumbsDown className="h-4 w-4" />
                          </Button>
                      </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={() => setCommentsModal({ isOpen: true, testimony: detailsModal.testimony })}>
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">{detailsModal.testimony.comments?.length || 0}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isMobile ? (
        <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, testimony: null })}>
          <SheetContent side="bottom" className="max-h-[80vh] flex flex-col">
            <SheetHeader className="text-left">
              <SheetTitle>Comments on "{commentsModal.testimony?.category}"</SheetTitle>
              <SheetDescription>Read what others are saying.</SheetDescription>
            </SheetHeader>
            {commentsModal.testimony && <CommentArea testimony={commentsModal.testimony} commentForm={commentForm} handleAddComment={handleAddComment} user={user} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, testimony: null })}>
          <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Comments on "{commentsModal.testimony?.category}"</DialogTitle>
              <DialogDescription>Read what others are saying.</DialogDescription>
            </DialogHeader>
             {commentsModal.testimony && <CommentArea testimony={commentsModal.testimony} commentForm={commentForm} handleAddComment={handleAddComment} user={user} />}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

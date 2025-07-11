
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
import { Heart, MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { addPrayer, addCommentToPrayer, addReactionToPrayer, type Prayer } from '@/services/prayers';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, Reactions } from '@/types';

const prayerFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).optional(),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'A category is required.' }).max(40, { message: 'Category must be 40 characters or less.' }),
});
type PrayerFormData = z.infer<typeof prayerFormSchema>;

const commentFormSchema = z.object({
  text: z.string().min(1, { message: 'Comment cannot be empty.' }).max(500, { message: 'Comment must be 500 characters or less.'}),
});
type CommentFormData = z.infer<typeof commentFormSchema>;

const prayerCategories = ['Health & Healing', 'Family', 'Guidance', 'Finances', 'Protection', 'Thanksgiving', 'Spiritual Growth', 'World & Leaders', 'Loss & Grief', 'Salvation'];

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
  const sortedComments = (prayer.comments || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <>
      <ScrollArea className="flex-grow pr-6 -mr-6 my-4">
        <div className="space-y-4">
          {sortedComments.length > 0 ? (
            sortedComments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold">{(comment.author || 'A').charAt(0)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{comment.author || 'Anonymous'}</p>
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
    defaultValues: { description: '', category: '' },
  });

  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { text: '' },
  });
  
  const quickCommentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { text: '' },
  });

  useEffect(() => {
    if (!db) {
      setPrayersError("Firebase is not configured.");
      setIsLoadingPrayers(false);
      return;
    }
    setIsLoadingPrayers(true);
    const prayersCol = collection(db, 'prayers');
    const unsubscribe = onSnapshot(prayersCol, (querySnapshot) => {
      const prayerList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const comments = (data.comments || []).map((c: any) => ({
          id: c.id || uuidv4(),
          author: c.author || 'Anonymous',
          text: c.text || '',
          createdAt: c.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        }));
        return {
          id: doc.id,
          name: data.name || 'Anonymous',
          description: data.description || '',
          category: data.category || 'Prayer',
          reactions: data.reactions || { like: 0, pray: 0, claps: 0, downlike: 0 },
          comments: comments,
          userId: data.userId,
        } as Prayer;
      }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setPrayers(prayerList);
      setPrayersError(null);
      setIsLoadingPrayers(false);
    }, (error) => {
      console.error("Error fetching prayers in real-time: ", error);
      setPrayersError(error.message || "Failed to load prayers.");
      setIsLoadingPrayers(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (detailsModal.isOpen && detailsModal.prayer) {
      const updatedPrayer = prayers.find(p => p.id === detailsModal.prayer!.id);
      if (updatedPrayer) {
        if (JSON.stringify(updatedPrayer) !== JSON.stringify(detailsModal.prayer)) {
          setDetailsModal({ isOpen: true, prayer: updatedPrayer });
        }
      } else {
        setDetailsModal({ isOpen: false, prayer: null });
      }
    }
  }, [prayers, detailsModal]);

  useEffect(() => {
    if (commentsModal.isOpen && commentsModal.prayer) {
      const updatedPrayer = prayers.find(p => p.id === commentsModal.prayer!.id);
      if (updatedPrayer) {
        if (JSON.stringify(updatedPrayer) !== JSON.stringify(commentsModal.prayer)) {
          setCommentsModal({ isOpen: true, prayer: updatedPrayer });
        }
      } else {
        setCommentsModal({ isOpen: false, prayer: null });
      }
    }
  }, [prayers, commentsModal]);
  
  async function handleAddPrayer(data: PrayerFormData) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to add a prayer.', variant: 'destructive' });
        return;
    }
    try {
      await addPrayer({ ...data, name: user.displayName || 'Anonymous' }, user.uid);
      toast({ title: 'Success!', description: 'Prayer added successfully.' });
      setIsAddPrayerDialogOpen(false);
      prayerForm.reset({description: '', category: ''});
    } catch (error: any) {
      toast({ title: 'Submission Error', description: error.message || 'Failed to add prayer.', variant: 'destructive' });
    }
  }

  async function handleReaction(prayerId: string, reactionType: keyof Reactions) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to react.', variant: 'destructive' });
        return;
    }
    try {
        await addReactionToPrayer(prayerId, reactionType);
    } catch (error: any) {
        toast({ title: "Reaction Error", description: error.message || "Could not save reaction.", variant: "destructive" });
    }
  }

  async function handleAddComment(data: CommentFormData, prayerId: string, formToReset: UseFormReturn<CommentFormData>) {
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to comment.', variant: 'destructive' });
        return;
    }
    const newComment: Comment = {
      id: uuidv4(),
      author: user.displayName || 'Anonymous',
      text: data.text,
      createdAt: new Date().toISOString(),
    };
    try {
      await addCommentToPrayer(prayerId, newComment);
      formToReset.reset({ text: '' });
    } catch(error: any) {
      toast({ title: 'Comment Error', description: error.message || 'Failed to add comment.', variant: 'destructive' });
    }
  }

  const PrayerContentCard = ({ item }: { item: Prayer }) => (
    <Card 
      className="w-full flex flex-col shadow-lg rounded-xl overflow-hidden min-h-[300px] bg-card cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl"
      onClick={() => setDetailsModal({isOpen: true, prayer: item})}
    >
      <CardContent className="flex-grow flex flex-col p-6 justify-center items-center text-center">
          <h3 className="font-serif font-semibold text-xl text-primary/90 capitalize [text-shadow:0_1px_2px_hsl(var(--primary)/0.2)]">{item.category}</h3>
          <div className="mt-4">
              <p className="font-semibold text-lg">{item.name}</p>
              <p className="text-sm text-muted-foreground font-bold">{truncateText(item.description, 100)}{item.description.length > 100 ? '...' : ''}</p>
          </div>
      </CardContent>
       <CardFooter className="p-2 border-t justify-end flex items-center gap-1">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleReaction(item.id, 'like'); }}>
              <Heart className="h-4 w-4" />
              <span>{item.reactions?.like || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); setCommentsModal({isOpen: true, prayer: item}); }}>
              <MessageSquare className="h-4 w-4" />
              <span>{item.comments?.length || 0}</span>
          </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="w-full text-center">
        <div className="flex justify-between items-center mb-6">
            <div><h2 className="text-2xl font-bold text-left">Prayers</h2><p className="text-muted-foreground text-left">Community prayer requests and praises.</p></div>
            <Dialog open={isAddPrayerDialogOpen} onOpenChange={setIsAddPrayerDialogOpen}><DialogTrigger asChild><Button>Add Prayer</Button></DialogTrigger>
                <DialogContent className="rounded-xl border"><DialogHeader> <DialogTitle>Add a New Prayer</DialogTitle> <DialogDescription>Share a prayer request or praise.</DialogDescription> </DialogHeader>
                    <Form {...prayerForm}><form onSubmit={prayerForm.handleSubmit(handleAddPrayer)} className="space-y-4">
                        <FormField control={prayerForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Prayer Request</FormLabel> <FormControl><Textarea placeholder="A detailed description of your prayer" rows={5} {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={prayerForm.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Prayer Category</FormLabel> <FormControl><Input placeholder="e.g., For Healing" {...field} /></FormControl> <div className="flex flex-wrap gap-2 pt-2">{prayerCategories.map(cat => (<Button key={cat} type="button" variant="outline" size="sm" onClick={() => prayerForm.setValue('category', cat, { shouldValidate: true })}>{cat}</Button>))}</div><FormMessage /> </FormItem> )}/>
                        <Button type="submit" disabled={prayerForm.formState.isSubmitting}>{prayerForm.formState.isSubmitting ? 'Submitting...' : 'Submit Prayer'}</Button>
                    </form></Form>
                </DialogContent>
            </Dialog>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingPrayers ? ([...Array(3)].map((_, i) => <ContentCardSkeleton key={i} />))
          : prayersError ? (<Card className="col-span-full bg-destructive/10 border-destructive/50 text-left"><CardContent className="p-6"><h3 className="text-destructive font-bold">Error Loading Prayers</h3><p>The application encountered an error while trying to fetch data.</p><p className="font-semibold mt-2">Error Details:</p><p className="mt-1 p-2 bg-black/20 rounded-md font-mono text-sm">{prayersError}</p></CardContent></Card>) 
          : prayers.length > 0 ? (prayers.map((item) => <PrayerContentCard key={item.id} item={item} />)) 
          : (<div className="col-span-full text-center text-muted-foreground mt-8"><p>No prayers have been shared yet.</p>{user && <p>Be the first to share one by clicking the "Add Prayer" button!</p>}</div>)}
        </div>
      {detailsModal.prayer && (
        <Dialog open={detailsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setDetailsModal({ isOpen: false, prayer: null })}>
          <DialogContent className="max-w-2xl w-[90vw] rounded-xl border">
            <DialogHeader><DialogTitle className="text-3xl font-serif font-bold text-primary">{detailsModal.prayer.category}</DialogTitle><DialogDescription className="pt-2 text-lg">By: {detailsModal.prayer.name}</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4"><p className="py-4 text-foreground/90 whitespace-pre-wrap">{detailsModal.prayer.description}</p></ScrollArea>
            <div className="pt-4 border-t flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { setDetailsModal({isOpen: false, prayer: null}); setCommentsModal({ isOpen: true, prayer: detailsModal.prayer }); }}>View all {detailsModal.prayer.comments?.length || 0} comments</Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1" onClick={(e) => { e.stopPropagation(); handleReaction(detailsModal.prayer!.id, 'like'); }}>
                        <Heart className="h-4 w-4 text-red-500" /> 
                        <span className="text-xs">{detailsModal.prayer.reactions?.like || 0}</span>
                    </Button>
                </div>
                <Form {...quickCommentForm}><form onSubmit={quickCommentForm.handleSubmit((data) => handleAddComment(data, detailsModal.prayer!.id, quickCommentForm))} className="flex items-start gap-2">
                    <FormField control={quickCommentForm.control} name="text" render={({ field }) => (<FormItem className="flex-grow"><FormControl><Textarea placeholder="Add a comment..." className="min-h-[40px] max-h-[100px] resize-y" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <Button type="submit" size="icon" disabled={quickCommentForm.formState.isSubmitting}><Send className="h-4 w-4" /></Button>
                </form></Form>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {commentsModal.prayer && (
          isMobile ? (
            <Sheet open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, prayer: null })}>
              <SheetContent side="bottom" className="h-[90%] flex flex-col rounded-t-2xl border p-0">
                <div className="mx-auto mt-2 mb-4 h-2 w-20 flex-shrink-0 rounded-full bg-muted" />
                <SheetHeader className="text-left px-6"><SheetTitle>Comments on "{commentsModal.prayer?.category}"</SheetTitle><SheetDescription>Read what others are saying.</SheetDescription></SheetHeader>
                <div className="flex-grow flex flex-col overflow-y-auto px-6">
                    <CommentArea prayer={commentsModal.prayer} commentForm={commentForm} handleAddComment={(data) => handleAddComment(data, commentsModal.prayer!.id, commentForm)} />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={commentsModal.isOpen} onOpenChange={(isOpen) => !isOpen && setCommentsModal({ isOpen: false, prayer: null })}>
              <DialogContent className="max-w-2xl w-[90vw] max-h-[80vh] flex flex-col rounded-xl border">
                <DialogHeader><DialogTitle>Comments on "{commentsModal.prayer?.category}"</DialogTitle><DialogDescription>Read what others are saying.</DialogDescription></DialogHeader>
                 <CommentArea prayer={commentsModal.prayer} commentForm={commentForm} handleAddComment={(data) => handleAddComment(data, commentsModal.prayer!.id, commentForm)} />
              </DialogContent>
            </Dialog>
          )
      )}
    </div>
  );
}

    
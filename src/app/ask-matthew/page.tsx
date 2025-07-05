'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AskMatthewPage() {
  const { toast } = useToast();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Feature is coming soon',
      description: 'The interactive chat is currently under development.',
    });
  };

  return (
    <div className="container mx-auto h-[calc(100vh-4rem-1px)] flex justify-center items-center">
      <Card className="w-full max-w-3xl h-full flex flex-col shadow-2xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Ask Matthew
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col p-0">
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-semibold">Coming Soon!</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              The "Ask Matthew" interactive chat feature is under construction.
              We're working hard to bring you an insightful AI Bible companion. Please check back later.
            </p>
          </div>
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
              />
              <Button type="submit">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

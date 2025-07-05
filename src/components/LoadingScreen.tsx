
import { BookOpenText, Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex items-center space-x-4">
        <BookOpenText className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold">Matthew AI</h1>
      </div>
      <p className="mt-4 text-muted-foreground">Preparing your spiritual companion...</p>
      <Loader2 className="mt-8 h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

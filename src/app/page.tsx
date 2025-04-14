import {SearchForm} from '@/components/SearchForm';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-2">
      <h1 className="text-3xl font-bold color-white mb-4">Matthew AI</h1>
      <SearchForm />
    </div>
  );
}

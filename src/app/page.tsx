import {SearchForm} from '@/components/SearchForm';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-2">
      <h1 className="text-3xl font-bold mb-4">VerseFinder AI</h1>
      <SearchForm />
    </div>
  );
}

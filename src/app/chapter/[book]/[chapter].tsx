import { useLocalSearchParams } from 'expo-router';

import { ChapterScreen } from '@/ui/screens/ChapterScreen';

export default function ChapterRoute() {
  const params = useLocalSearchParams<{ book: string; chapter: string; verse?: string }>();
  const bookId = Number(params.book);
  const chapter = Number(params.chapter);
  const targetVerse = params.verse ? Number(params.verse) : undefined;
  // The key gives each chapter a fresh screen state when navigating between chapters.
  return <ChapterScreen key={`${bookId}:${chapter}`} bookId={bookId} chapter={chapter} targetVerse={targetVerse} />;
}

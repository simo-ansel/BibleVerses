import { useLocalSearchParams } from 'expo-router';

import { BookScreen } from '@/ui/screens/BookScreen';

export default function BookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookScreen bookId={Number(id)} />;
}

import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findBook, provenance } from '@/data/books';
import { Fonts, Space, useColors } from '@/theme';
import { ScreenHeader } from '@/ui/components';

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = findBook(Number(id));
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!book) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Book not found" />
      </View>
    );
  }

  const columns = Math.max(5, Math.floor((width - Space.l * 2) / 64));
  const cell = (width - Space.l * 2) / columns;
  const note = provenance(book);

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScreenHeader title={book.name} subtitle={`${book.chapters.length} chapters${note ? `, ${note}` : ''}`} />
      <ScrollView contentContainerStyle={{ padding: Space.l, paddingBottom: insets.bottom + Space.xl }}>
        <View style={styles.grid}>
          {book.chapters.map((ch) => (
            <Pressable
              key={ch}
              onPress={() =>
                router.push({ pathname: '/chapter/[book]/[chapter]', params: { book: String(book.id), chapter: String(ch) } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Chapter ${ch}`}
              style={({ pressed }) => [
                styles.cell,
                { width: cell, height: cell },
                pressed && { backgroundColor: c.selection },
              ]}>
              <Text style={[styles.num, { color: c.ink }]}>{ch}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  num: { fontFamily: Fonts.fell, fontSize: 24 },
});

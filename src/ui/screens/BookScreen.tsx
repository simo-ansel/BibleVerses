import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findBook } from '@/core/bible/catalog';
import { ScreenHeader } from '@/ui/components/controls';
import { openChapter } from '@/ui/navigation';
import { Fonts, Space, useColors } from '@/ui/theme';

const MIN_CELL_SIZE = 64;

export function BookScreen({ bookId }: { bookId: number }) {
  const book = findBook(bookId);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!book) return <ScreenHeader title="Not found" />;

  const gridWidth = width - Space.l * 2;
  const cell = gridWidth / Math.max(5, Math.floor(gridWidth / MIN_CELL_SIZE));

  return (
    <View style={[styles.fill, { backgroundColor: colors.ground }]}>
      <ScreenHeader title={book.name} />
      <ScrollView contentContainerStyle={{ padding: Space.l, paddingBottom: insets.bottom + Space.xl }}>
        <View style={styles.grid}>
          {book.chapters.map((chapter) => (
            <Pressable
              key={chapter}
              onPress={() => openChapter({ bookId: book.id, chapter })}
              accessibilityRole="button"
              accessibilityLabel={`Chapter ${chapter}`}
              style={({ pressed }) => [
                styles.cell,
                { width: cell, height: cell },
                pressed && { backgroundColor: colors.selection },
              ]}>
              <Text style={[styles.number, { color: colors.ink }]}>{chapter}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  number: { fontFamily: Fonts.display, fontSize: 24 },
});

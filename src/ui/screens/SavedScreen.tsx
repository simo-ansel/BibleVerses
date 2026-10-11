import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SavedVerse } from '@/application/SavedVerses';
import { formatPassage } from '@/core/bible/passage';
import type { PassageText } from '@/core/bible/types';
import { IconButton } from '@/ui/components/controls';
import { useTabBarSpace } from '@/ui/components/TabBar';
import { useShareVerse } from '@/ui/hooks/useShareVerse';
import { useStatusBar } from '@/ui/hooks/useStatusBar';
import { openChapter } from '@/ui/navigation';
import { useObservable, useServices } from '@/ui/services';
import { Fonts, READING_TEXT, Space, useColors } from '@/ui/theme';

type Row = SavedVerse & PassageText;

const rowKey = (row: SavedVerse) => `${row.bookId}:${row.chapter}:${row.verseStart}-${row.verseEnd}`;

export function SavedScreen() {
  const { bible, savedVerses, verseActions } = useServices();
  const saved = useObservable(savedVerses);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const [rows, setRows] = useState<Row[] | null>(null);
  const { share, sharing } = useShareVerse();

  useStatusBar();

  useEffect(() => {
    let active = true;
    Promise.all(saved.map(async (entry) => ({ ...entry, text: await bible.getPassageText(entry) }))).then((loaded) => {
      if (active) setRows(loaded);
    });
    return () => {
      active = false;
    };
  }, [bible, saved]);

  return (
    <FlatList
      data={rows ?? []}
      keyExtractor={rowKey}
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={{ paddingTop: insets.top + Space.l, paddingBottom: bottomSpace + Space.l }}
      ListHeaderComponent={
        <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
          Saved
        </Text>
      }
      ListEmptyComponent={
        rows ? <Text style={[styles.empty, { color: colors.inkSoft }]}>No saved verses yet.</Text> : null
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openChapter(item, item.verseStart)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: colors.rule },
            pressed && { backgroundColor: colors.selection },
          ]}>
          <Text style={[READING_TEXT, { color: colors.ink }]}>{item.text}</Text>
          <View style={styles.meta}>
            <Text style={[styles.reference, { color: colors.ink }]}>{formatPassage(item)}</Text>
            <IconButton
              icon="image"
              label="Share"
              color={colors.inkSoft}
              disabled={sharing}
              onPress={() => share(item)}
            />
            <IconButton
              icon="trash-2"
              label="Remove"
              color={colors.inkSoft}
              onPress={() => verseActions.toggleSaved(item)}
            />
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, paddingHorizontal: Space.l, marginBottom: Space.s },
  empty: { fontFamily: Fonts.ui, fontSize: 15, paddingHorizontal: Space.l, paddingTop: Space.m },
  row: {
    paddingHorizontal: Space.l,
    paddingTop: Space.l,
    paddingBottom: Space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: Space.s },
  reference: { flex: 1, fontFamily: Fonts.displayItalic, fontSize: 18 },
});

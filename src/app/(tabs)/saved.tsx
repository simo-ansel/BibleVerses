import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPassage, getBook, provenance } from '@/data/books';
import { getPassageText } from '@/data/db';
import { useSavedVerses, type SavedVerse } from '@/data/store';
import type { PassageWithText } from '@/data/types';
import { Fonts, Space, useColors, useIsDark } from '@/theme';
import { IconButton, useReaderType } from '@/ui/components';
import { useTabBarSpace } from '@/ui/TabBar';
import { toggleSave, useShareVerse } from '@/verseActions';

type Row = SavedVerse & PassageWithText;

export default function SavedScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const type = useReaderType();
  const saved = useSavedVerses();
  const { share, ready: shareReady } = useShareVerse();
  const [rows, setRows] = useState<Row[] | null>(null);

  useFocusEffect(useCallback(() => setStatusBarStyle(dark ? 'light' : 'dark'), [dark]));

  useEffect(() => {
    let alive = true;
    Promise.all(saved.map(async (s) => ({ ...s, text: await getPassageText(db, s) }))).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [db, saved]);

  return (
    <FlatList
      data={rows ?? []}
      style={{ backgroundColor: c.ground }}
      keyExtractor={(r) => `${r.bookId}-${r.chapter}-${r.verseStart}-${r.verseEnd}`}
      contentContainerStyle={{ paddingTop: insets.top + Space.l, paddingBottom: bottom + Space.l, flexGrow: 1 }}
      ListHeaderComponent={
        <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
          Saved
        </Text>
      }
      ListEmptyComponent={
        rows ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.inkSoft }]}>
              Tap Save under the verse of the day, or tap any verse while reading, to keep it here.
            </Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const note = provenance(getBook(item.bookId));
        return (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/chapter/[book]/[chapter]',
                params: { book: String(item.bookId), chapter: String(item.chapter), v: String(item.verseStart) },
              })
            }
            style={({ pressed }) => [styles.row, { borderBottomColor: c.rule }, pressed && { backgroundColor: c.selection }]}
            accessibilityRole="button">
            <Text style={{ color: c.ink, fontFamily: type.fontFamily, fontSize: type.fontSize, lineHeight: type.lineHeight }}>
              {item.text}
            </Text>
            <View style={styles.meta}>
              <View style={styles.flex}>
                <Text style={[styles.ref, { color: c.ink }]}>{formatPassage(item)}</Text>
                {note ? <Text style={[styles.note, { color: c.inkSoft }]}>{note}</Text> : null}
              </View>
              <IconButton icon="image" label="Share as image" color={c.inkSoft} disabled={!shareReady} onPress={() => share(item)} />
              <IconButton icon="trash-2" label="Remove from saved" color={c.inkSoft} onPress={() => toggleSave(item)} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontFamily: Fonts.fell, fontSize: 40, lineHeight: 46, paddingHorizontal: Space.l, marginBottom: Space.s },
  empty: { paddingHorizontal: Space.l, paddingTop: Space.m },
  emptyText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, maxWidth: 340 },
  row: { paddingHorizontal: Space.l, paddingTop: Space.l, paddingBottom: Space.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: Space.s },
  ref: { fontFamily: Fonts.fellItalic, fontSize: 18 },
  note: { fontFamily: Fonts.sans, fontSize: 13, marginTop: 1 },
});

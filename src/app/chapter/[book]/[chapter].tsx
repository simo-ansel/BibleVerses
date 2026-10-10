import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adjacentChapter, findBook, formatChapter, formatPassage, provenance } from '@/data/books';
import { getChapter } from '@/data/db';
import { isSaved, setLastRead, useSavedVerses } from '@/data/store';
import type { PassageWithText, Verse } from '@/data/types';
import { Fonts, Space, useColors } from '@/theme';
import { ActionButton, IconButton, ScreenHeader, useReaderType } from '@/ui/components';
import { copyVerse, toggleSave, useShareVerse } from '@/verseActions';

const toPassage = (v: Verse): PassageWithText => ({
  bookId: v.bookId,
  chapter: v.chapter,
  verseStart: v.verse,
  verseEnd: v.verse,
  text: v.text,
});

export default function ChapterScreen() {
  const params = useLocalSearchParams<{ book: string; chapter: string; v?: string }>();
  const bookId = Number(params.book);
  const chapter = Number(params.chapter);
  const target = params.v ? Number(params.v) : null;
  const book = findBook(bookId);

  const db = useSQLiteContext();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const type = useReaderType();
  const saved = useSavedVerses();
  const { share, ready: shareReady } = useShareVerse();

  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<Verse | null>(null);
  const [marked, setMarked] = useState<number | null>(target);
  const listRef = useRef<FlatList<Verse>>(null);

  useEffect(() => {
    let alive = true;
    getChapter(db, bookId, chapter).then((rows) => {
      if (!alive) return;
      setVerses(rows);
      if (book) setLastRead({ bookId, chapter });
    });
    return () => {
      alive = false;
    };
  }, [db, bookId, chapter, book]);

  // Bring the verse we came for into view, and let its highlight fade after a moment.
  useEffect(() => {
    if (target === null || verses.length === 0) return;
    const index = verses.findIndex((v) => v.verse === target);
    if (index <= 0) return;
    const t = setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.25, animated: false }), 60);
    return () => clearTimeout(t);
  }, [target, verses]);

  useEffect(() => {
    if (marked === null) return;
    const t = setTimeout(() => setMarked(null), 4000);
    return () => clearTimeout(t);
  }, [marked]);

  const prev = useMemo(() => adjacentChapter(bookId, chapter, -1), [bookId, chapter]);
  const next = useMemo(() => adjacentChapter(bookId, chapter, 1), [bookId, chapter]);

  if (!book) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Chapter not found" />
      </View>
    );
  }

  const goTo = (to: { bookId: number; chapter: number } | null) => {
    if (!to) return;
    router.replace({ pathname: '/chapter/[book]/[chapter]', params: { book: String(to.bookId), chapter: String(to.chapter) } });
  };

  const selectedPassage = selected ? toPassage(selected) : null;
  const selectedSaved = selectedPassage ? isSaved(saved, selectedPassage) : false;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScreenHeader
        title={formatChapter(bookId, chapter)}
        subtitle={provenance(book) ?? undefined}
        right={
          book.chapters.length > 1 ? (
            <IconButton
              icon="grid"
              label="All chapters"
              color={c.inkSoft}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: String(bookId) } })}
            />
          ) : null
        }
      />
      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ paddingHorizontal: Space.l, paddingTop: Space.m, paddingBottom: insets.bottom + 140 }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.25, animated: false }), 120);
        }}
        renderItem={({ item }) => {
          const isSel = selected?.id === item.id;
          const isMarked = marked === item.verse;
          const itemSaved = isSaved(saved, toPassage(item));
          return (
            <Pressable
              onPress={() => setSelected(isSel ? null : item)}
              accessibilityRole="button"
              accessibilityLabel={`Verse ${item.verse}. ${item.text}`}
              style={[
                styles.verseRow,
                isMarked && { backgroundColor: c.highlight },
                isSel && { backgroundColor: c.selection },
              ]}>
              <Text style={{ color: c.ink, fontFamily: type.fontFamily, fontSize: type.fontSize, lineHeight: type.lineHeight }}>
                <Text style={[styles.num, { color: itemSaved ? c.rose : c.ochre, fontSize: Math.round(type.fontSize * 0.62) }]}>
                  {item.verse}
                  {'  '}
                </Text>
                {item.text}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          verses.length > 0 ? (
            <View style={[styles.footer, { borderTopColor: c.rule }]}>
              {prev ? (
                <Pressable onPress={() => goTo(prev)} style={styles.footerBtn} accessibilityRole="button">
                  <Feather name="arrow-left" size={18} color={c.lapis} />
                  <Text style={[styles.footerText, { color: c.lapis }]} numberOfLines={1}>
                    {formatChapter(prev.bookId, prev.chapter)}
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              {next ? (
                <Pressable onPress={() => goTo(next)} style={[styles.footerBtn, styles.footerRight]} accessibilityRole="button">
                  <Text style={[styles.footerText, { color: c.lapis }]} numberOfLines={1}>
                    {formatChapter(next.bookId, next.chapter)}
                  </Text>
                  <Feather name="arrow-right" size={18} color={c.lapis} />
                </Pressable>
              ) : null}
            </View>
          ) : null
        }
      />

      {selectedPassage ? (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(160)}
          style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.rule, paddingBottom: insets.bottom + Space.s }]}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetRef, { color: c.ink }]}>{formatPassage(selectedPassage)}</Text>
            <IconButton icon="x" label="Close" color={c.inkSoft} onPress={() => setSelected(null)} />
          </View>
          <View style={styles.sheetActions}>
            <ActionButton
              icon="heart"
              label={selectedSaved ? 'Saved' : 'Save'}
              color={c.ink}
              active={selectedSaved}
              activeColor={c.rose}
              onPress={() => toggleSave(selectedPassage)}
            />
            <ActionButton icon="image" label="Share" color={c.ink} disabled={!shareReady} onPress={() => share(selectedPassage)} />
            <ActionButton icon="copy" label="Copy" color={c.ink} onPress={() => copyVerse(selectedPassage)} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  verseRow: { paddingVertical: 5, paddingHorizontal: Space.s, marginHorizontal: -Space.s, borderRadius: 8 },
  num: { fontFamily: Fonts.sansMedium },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Space.xl,
    paddingTop: Space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Space.m,
  },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: Space.s, minHeight: 44, flexShrink: 1 },
  footerRight: { justifyContent: 'flex-end' },
  footerText: { fontFamily: Fonts.sans, fontSize: 15, flexShrink: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: Space.l,
    paddingTop: Space.s,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetRef: { fontFamily: Fonts.fellItalic, fontSize: 20 },
  sheetActions: { flexDirection: 'row' },
});

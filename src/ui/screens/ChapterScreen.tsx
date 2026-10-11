import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { adjacentChapter, findBook } from '@/core/bible/catalog';
import { formatChapter, passageOfVerse, samePassage } from '@/core/bible/passage';
import type { ChapterRef, PassageText, Verse } from '@/core/bible/types';
import { IconButton, ScreenHeader } from '@/ui/components/controls';
import { VerseActionSheet } from '@/ui/components/VerseActionSheet';
import { useShareVerse } from '@/ui/hooks/useShareVerse';
import { openBook, replaceChapter } from '@/ui/navigation';
import { useObservable, useServices } from '@/ui/services';
import { Fonts, READING_TEXT, Space, useColors } from '@/ui/theme';

/** How long the verse we navigated to stays highlighted. */
const TARGET_HIGHLIGHT_MS = 4000;
/** Room below the last verse so it can scroll above the action sheet. */
const SHEET_CLEARANCE = 140;

const toPassageText = (verse: Verse): PassageText => ({ ...passageOfVerse(verse), text: verse.text });

export function ChapterScreen({ bookId, chapter, targetVerse }: ChapterRef & { targetVerse?: number }) {
  const { bible, savedVerses, readingProgress, verseActions } = useServices();
  const saved = useObservable(savedVerses);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const book = findBook(bookId);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [selected, setSelected] = useState<PassageText | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(targetVerse ?? null);
  const { share, sharing } = useShareVerse();
  const listRef = useRef<FlatList<Verse>>(null);

  useEffect(() => {
    if (!book?.chapters.includes(chapter)) return;
    let active = true;
    bible.getChapter(bookId, chapter).then((rows) => {
      if (!active) return;
      setVerses(rows);
      readingProgress.markRead({ bookId, chapter });
    });
    return () => {
      active = false;
    };
  }, [bible, readingProgress, book, bookId, chapter]);

  useEffect(() => {
    if (targetVerse === undefined || verses.length === 0) return;
    const index = verses.findIndex((v) => v.verse === targetVerse);
    if (index <= 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.25, animated: false }), 60);
    return () => clearTimeout(timer);
  }, [targetVerse, verses]);

  useEffect(() => {
    if (highlighted === null) return;
    const timer = setTimeout(() => setHighlighted(null), TARGET_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const previous = useMemo(() => (book ? adjacentChapter({ bookId, chapter }, -1) : null), [book, bookId, chapter]);
  const next = useMemo(() => (book ? adjacentChapter({ bookId, chapter }, 1) : null), [book, bookId, chapter]);

  if (!book?.chapters.includes(chapter)) return <ScreenHeader title="Not found" />;

  const isSaved = (passage: PassageText) => saved.some((entry) => samePassage(entry, passage));

  return (
    <View style={[styles.fill, { backgroundColor: colors.ground }]}>
      <ScreenHeader
        title={formatChapter({ bookId, chapter })}
        right={
          book.chapters.length > 1 ? (
            <IconButton icon="grid" label="All chapters" color={colors.inkSoft} onPress={() => openBook(bookId)} />
          ) : null
        }
      />
      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={(verse) => String(verse.id)}
        contentContainerStyle={{
          paddingHorizontal: Space.l,
          paddingTop: Space.m,
          paddingBottom: insets.bottom + SHEET_CLEARANCE,
        }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
        }}
        renderItem={({ item }) => {
          const passage = toPassageText(item);
          const isSelected = selected !== null && samePassage(selected, passage);
          return (
            <Pressable
              onPress={() => setSelected(isSelected ? null : passage)}
              accessibilityRole="button"
              accessibilityLabel={`Verse ${item.verse}. ${item.text}`}
              style={[
                styles.verse,
                highlighted === item.verse && { backgroundColor: colors.highlight },
                isSelected && { backgroundColor: colors.selection },
              ]}>
              <Text style={[READING_TEXT, { color: colors.ink }]}>
                <Text style={[styles.number, { color: isSaved(passage) ? colors.rose : colors.ochre }]}>
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
            <View style={[styles.footer, { borderTopColor: colors.rule }]}>
              {previous ? <ChapterLink target={previous} direction={-1} color={colors.lapis} /> : <View />}
              {next ? <ChapterLink target={next} direction={1} color={colors.lapis} /> : null}
            </View>
          ) : null
        }
      />
      {selected ? (
        <VerseActionSheet
          passage={selected}
          isSaved={isSaved(selected)}
          sharing={sharing}
          onToggleSaved={() => verseActions.toggleSaved(selected)}
          onShare={() => share(selected)}
          onCopy={() => verseActions.copy(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </View>
  );
}

function ChapterLink({ target, direction, color }: { target: ChapterRef; direction: 1 | -1; color: string }) {
  const label = formatChapter(target);
  return (
    <Pressable
      onPress={() => replaceChapter(target)}
      accessibilityRole="button"
      accessibilityLabel={direction === 1 ? `Next: ${label}` : `Previous: ${label}`}
      style={[styles.link, direction === 1 && styles.linkNext]}>
      {direction === -1 ? <Feather name="arrow-left" size={18} color={color} /> : null}
      <Text style={[styles.linkText, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {direction === 1 ? <Feather name="arrow-right" size={18} color={color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  verse: { paddingVertical: 5, paddingHorizontal: Space.s, marginHorizontal: -Space.s, borderRadius: 8 },
  number: { fontFamily: Fonts.uiMedium, fontSize: 12 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Space.m,
    marginTop: Space.xl,
    paddingTop: Space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: Space.s, minHeight: 44, flexShrink: 1 },
  linkNext: { justifyContent: 'flex-end' },
  linkText: { fontFamily: Fonts.ui, fontSize: 15, flexShrink: 1 },
});

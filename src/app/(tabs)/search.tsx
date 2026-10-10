import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPassage, SECTIONS } from '@/data/books';
import { searchVerses, splitMarked, type SearchHit } from '@/data/db';
import { describeReference, parseReference } from '@/data/reference';
import type { SectionId } from '@/data/types';
import { Fonts, Space, useColors, useIsDark } from '@/theme';
import { useReaderType } from '@/ui/components';
import { useTabBarSpace } from '@/ui/TabBar';

const SUGGESTIONS = ['still small voice', 'wisdom', 'light', 'Psalm 23', 'Sirach 43', 'Enoch 1'];

export default function SearchScreen() {
  const db = useSQLiteContext();
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const type = useReaderType();

  const [query, setQuery] = useState('');
  const [section, setSection] = useState<SectionId | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState('');

  useFocusEffect(useCallback(() => setStatusBarStyle(dark ? 'light' : 'dark'), [dark]));

  const reference = useMemo(() => (query.trim() ? parseReference(query) : null), [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // the suggestions show instead of results
    let alive = true;
    const t = setTimeout(async () => {
      const res = await searchVerses(db, q, section);
      if (!alive) return;
      setHits(res.hits);
      setTotal(res.total);
      setSearched(q);
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [db, query, section]);

  const openReference = () => {
    if (!reference) return;
    Keyboard.dismiss();
    if (reference.chapter === undefined) {
      if (reference.book.chapters.length === 1) {
        router.push({
          pathname: '/chapter/[book]/[chapter]',
          params: { book: String(reference.book.id), chapter: String(reference.book.chapters[0]) },
        });
      } else {
        router.push({ pathname: '/book/[id]', params: { id: String(reference.book.id) } });
      }
      return;
    }
    router.push({
      pathname: '/chapter/[book]/[chapter]',
      params: {
        book: String(reference.book.id),
        chapter: String(reference.chapter),
        ...(reference.verseStart ? { v: String(reference.verseStart) } : {}),
      },
    });
  };

  const showEmpty = query.trim().length < 2;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground, paddingTop: insets.top + Space.m }}>
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.rule }]}>
        <Feather name="search" size={19} color={c.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Words or a reference, like John 3:16"
          placeholderTextColor={c.inkSoft}
          style={[styles.input, { color: c.ink }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          onSubmitEditing={() => (reference && /\d/.test(query) ? openReference() : Keyboard.dismiss())}
          accessibilityLabel="Search the Bible"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Feather name="x-circle" size={18} color={c.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled">
        {[{ id: null as SectionId | null, title: 'All books' }, ...SECTIONS].map((s) => {
          const on = section === s.id;
          return (
            <Pressable
              key={s.id ?? 'all'}
              onPress={() => setSection(s.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.chip, { borderColor: on ? c.lapis : c.rule, backgroundColor: on ? c.selection : 'transparent' }]}>
              <Text style={[styles.chipText, { color: on ? c.lapis : c.inkSoft }]}>{s.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {showEmpty ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: c.ink }]}>Search all 82 books</Text>
          <Text style={[styles.emptyText, { color: c.inkSoft }]}>
            Type a few words to find every verse that contains them, or a reference to open it. Try one of these:
          </Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => setQuery(s)} style={[styles.suggestion, { borderColor: c.rule }]} accessibilityRole="button">
                <Text style={[styles.suggestionText, { color: c.ink }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(h) => String(h.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: bottom + Space.l }}
          ListHeaderComponent={
            <View>
              {reference ? (
                <Pressable
                  onPress={openReference}
                  style={({ pressed }) => [styles.refRow, { backgroundColor: pressed ? c.selection : c.surface, borderColor: c.rule }]}
                  accessibilityRole="button">
                  <Feather name="corner-down-right" size={18} color={c.lapis} />
                  <Text style={[styles.refText, { color: c.ink }]}>
                    Open <Text style={{ fontFamily: Fonts.fellItalic, fontSize: 19 }}>{describeReference(reference)}</Text>
                  </Text>
                </Pressable>
              ) : null}
              {searched ? (
                <Text style={[styles.count, { color: c.inkSoft }]}>
                  {total === 0
                    ? `No verses contain “${searched}”${section ? ' in this part of the Bible' : ''}.`
                    : total > hits.length
                      ? `${total} verses, best matches first. Showing ${hits.length}.`
                      : `${total} ${total === 1 ? 'verse' : 'verses'}, best matches first.`}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/chapter/[book]/[chapter]',
                  params: { book: String(item.bookId), chapter: String(item.chapter), v: String(item.verse) },
                })
              }
              style={({ pressed }) => [styles.hit, { borderBottomColor: c.rule }, pressed && { backgroundColor: c.selection }]}
              accessibilityRole="button">
              <Text style={[styles.hitRef, { color: c.inkSoft }]}>
                {formatPassage({ bookId: item.bookId, chapter: item.chapter, verseStart: item.verse, verseEnd: item.verse })}
              </Text>
              <Text style={{ color: c.ink, fontFamily: type.fontFamily, fontSize: type.fontSize - 1, lineHeight: type.lineHeight - 1 }}>
                {splitMarked(item.marked).map((run, i) =>
                  run.match ? (
                    <Text key={i} style={{ backgroundColor: c.highlight }}>
                      {run.text}
                    </Text>
                  ) : (
                    run.text
                  ),
                )}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginHorizontal: Space.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    paddingHorizontal: Space.m,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontFamily: Fonts.sans, fontSize: 17, paddingVertical: 10 },
  chipsScroll: { flexGrow: 0, marginTop: Space.m },
  chips: { paddingHorizontal: Space.l, gap: Space.s },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  chipText: { fontFamily: Fonts.sans, fontSize: 14 },
  empty: { paddingHorizontal: Space.l, paddingTop: Space.xl },
  emptyTitle: { fontFamily: Fonts.fell, fontSize: 28 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, marginTop: Space.s, maxWidth: 360 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.s, marginTop: Space.l },
  suggestion: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  suggestionText: { fontFamily: Fonts.fellItalic, fontSize: 18 },
  refRow: {
    marginHorizontal: Space.l,
    marginTop: Space.m,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    paddingHorizontal: Space.m,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  refText: { fontFamily: Fonts.sans, fontSize: 16 },
  count: { fontFamily: Fonts.sans, fontSize: 13, paddingHorizontal: Space.l, marginTop: Space.m, marginBottom: Space.xs },
  hit: { paddingHorizontal: Space.l, paddingVertical: Space.m, borderBottomWidth: StyleSheet.hairlineWidth },
  hitRef: { fontFamily: Fonts.sans, fontSize: 13, marginBottom: 4 },
});

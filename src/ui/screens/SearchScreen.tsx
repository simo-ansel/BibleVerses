import Feather from '@expo/vector-icons/Feather';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SECTIONS } from '@/core/bible/catalog';
import { formatPassage, passageOfVerse } from '@/core/bible/passage';
import { describeReference, parseReference, type ParsedReference } from '@/core/bible/reference';
import type { SectionId } from '@/core/bible/types';
import type { SearchResult } from '@/core/ports';
import { HighlightedText } from '@/ui/components/HighlightedText';
import { useTabBarSpace } from '@/ui/components/TabBar';
import { useStatusBar } from '@/ui/hooks/useStatusBar';
import { openBook, openChapter } from '@/ui/navigation';
import { useServices } from '@/ui/services';
import { Fonts, READING_TEXT, Space, useColors } from '@/ui/theme';

const RESULT_LIMIT = 150;
const DEBOUNCE_MS = 220;
const MIN_QUERY_LENGTH = 2;

const FILTERS: { id: SectionId | null; title: string }[] = [{ id: null, title: 'All' }, ...SECTIONS];

function openReference(ref: ParsedReference) {
  Keyboard.dismiss();
  if (ref.chapter === undefined) openBook(ref.book.id);
  else openChapter({ bookId: ref.book.id, chapter: ref.chapter }, ref.verseStart);
}

export function SearchScreen() {
  const { bible } = useServices();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();

  const [query, setQuery] = useState('');
  const [section, setSection] = useState<SectionId | null>(null);
  const [result, setResult] = useState<{ query: string; data: SearchResult } | null>(null);

  useStatusBar();

  const trimmed = query.trim();
  const reference = useMemo(() => (trimmed ? parseReference(trimmed) : null), [trimmed]);

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) return;
    let active = true;
    const timer = setTimeout(async () => {
      const data = await bible.search({ text: trimmed, section, limit: RESULT_LIMIT });
      if (active) setResult({ query: trimmed, data });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [bible, trimmed, section]);

  const showResults = trimmed.length >= MIN_QUERY_LENGTH && result !== null;

  return (
    <View style={[styles.fill, { backgroundColor: colors.ground, paddingTop: insets.top + Space.m }]}>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
        <Feather name="search" size={19} color={colors.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Words or a reference"
          placeholderTextColor={colors.inkSoft}
          style={[styles.input, { color: colors.ink }]}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          onSubmitEditing={() => (reference ? openReference(reference) : Keyboard.dismiss())}
          accessibilityLabel="Search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear">
            <Feather name="x-circle" size={18} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filterRow}
        keyboardShouldPersistTaps="handled">
        {FILTERS.map((filter) => {
          const active = section === filter.id;
          return (
            <Pressable
              key={filter.id ?? 'all'}
              onPress={() => setSection(filter.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.lapis : colors.rule,
                  backgroundColor: active ? colors.selection : 'transparent',
                },
              ]}>
              <Text style={[styles.chipText, { color: active ? colors.lapis : colors.inkSoft }]}>{filter.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={showResults ? result.data.hits : []}
        keyExtractor={(hit) => String(hit.verse.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: bottomSpace + Space.l }}
        ListHeaderComponent={
          <View>
            {reference ? (
              <Pressable
                onPress={() => openReference(reference)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.referenceRow,
                  { borderColor: colors.rule, backgroundColor: pressed ? colors.selection : colors.surface },
                ]}>
                <Feather name="corner-down-right" size={18} color={colors.lapis} />
                <Text style={[styles.referenceText, { color: colors.ink }]}>
                  Open <Text style={styles.referenceName}>{describeReference(reference)}</Text>
                </Text>
              </Pressable>
            ) : null}
            {showResults ? (
              <Text style={[styles.count, { color: colors.inkSoft }]}>
                {result.data.total === 0
                  ? 'No verses found.'
                  : result.data.total > result.data.hits.length
                    ? `First ${result.data.hits.length} of ${result.data.total} verses`
                    : `${result.data.total} ${result.data.total === 1 ? 'verse' : 'verses'}`}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openChapter(item.verse, item.verse.verse)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.hit,
              { borderBottomColor: colors.rule },
              pressed && { backgroundColor: colors.selection },
            ]}>
            <Text style={[styles.hitReference, { color: colors.inkSoft }]}>
              {formatPassage(passageOfVerse(item.verse))}
            </Text>
            <HighlightedText
              segments={item.segments}
              style={[READING_TEXT, { color: colors.ink }]}
              highlightColor={colors.highlight}
            />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
  input: { flex: 1, fontFamily: Fonts.ui, fontSize: 17, paddingVertical: 10 },
  filters: { flexGrow: 0, marginTop: Space.m },
  filterRow: { paddingHorizontal: Space.l, gap: Space.s },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipText: { fontFamily: Fonts.ui, fontSize: 14 },
  referenceRow: {
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
  referenceText: { fontFamily: Fonts.ui, fontSize: 16 },
  referenceName: { fontFamily: Fonts.displayItalic, fontSize: 19 },
  count: { fontFamily: Fonts.ui, fontSize: 13, paddingHorizontal: Space.l, marginTop: Space.m, marginBottom: Space.xs },
  hit: { paddingHorizontal: Space.l, paddingVertical: Space.m, borderBottomWidth: StyleSheet.hairlineWidth },
  hitReference: { fontFamily: Fonts.ui, fontSize: 13, marginBottom: 4 },
});

import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOOKS, formatChapter, SECTIONS } from '@/data/books';
import { useLastRead } from '@/data/store';
import type { BookInfo } from '@/data/types';
import { Fonts, Space, useColors, useIsDark } from '@/theme';
import { useTabBarSpace } from '@/ui/TabBar';

const sections = SECTIONS.map((s) => ({ ...s, data: BOOKS.filter((b) => b.section === s.id) }));

export default function ReadScreen() {
  const c = useColors();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const lastRead = useLastRead();

  useFocusEffect(useCallback(() => setStatusBarStyle(dark ? 'light' : 'dark'), [dark]));

  const openBook = (book: BookInfo) => {
    if (book.chapters.length === 1) {
      router.push({ pathname: '/chapter/[book]/[chapter]', params: { book: String(book.id), chapter: String(book.chapters[0]) } });
    } else {
      router.push({ pathname: '/book/[id]', params: { id: String(book.id) } });
    }
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(b) => String(b.id)}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingTop: insets.top + Space.l, paddingBottom: bottom + Space.l }}
      ListHeaderComponent={
        <View style={styles.head}>
          <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
            The Books
          </Text>
          <Text style={[styles.lede, { color: c.inkSoft }]}>
            King James Version with the Apocrypha, and the two books of the Ethiopian canon.
          </Text>
          {lastRead ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/chapter/[book]/[chapter]',
                  params: { book: String(lastRead.bookId), chapter: String(lastRead.chapter) },
                })
              }
              style={({ pressed }) => [styles.resume, { borderColor: c.rule, backgroundColor: pressed ? c.selection : c.surface }]}
              accessibilityRole="button">
              <Feather name="bookmark" size={18} color={c.lapis} />
              <Text style={[styles.resumeText, { color: c.ink }]}>
                Continue with <Text style={{ fontFamily: Fonts.fellItalic }}>{formatChapter(lastRead.bookId, lastRead.chapter)}</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: c.ink }]}>{section.title}</Text>
          {section.note ? <Text style={[styles.sectionNote, { color: c.inkSoft }]}>{section.note}</Text> : null}
          <View style={[styles.rule, { backgroundColor: c.rule }]} />
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openBook(item)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.selection }]}
          accessibilityRole="button"
          accessibilityHint={`${item.chapters.length} chapters`}>
          <Text style={[styles.bookName, { color: c.ink }]}>{item.name}</Text>
          <Text style={[styles.count, { color: c.inkSoft }]}>{item.chapters.length}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: Space.l, marginBottom: Space.m },
  title: { fontFamily: Fonts.fell, fontSize: 40, lineHeight: 46 },
  lede: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, marginTop: Space.s, maxWidth: 340 },
  resume: {
    marginTop: Space.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s + 2,
    paddingHorizontal: Space.m,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resumeText: { fontFamily: Fonts.sans, fontSize: 16 },
  sectionHead: { paddingHorizontal: Space.l, paddingTop: Space.xl, paddingBottom: Space.xs },
  sectionTitle: { fontFamily: Fonts.sansMedium, fontSize: 15 },
  sectionNote: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, marginTop: 2, maxWidth: 320 },
  rule: { height: StyleSheet.hairlineWidth, marginTop: Space.s },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Space.l,
    paddingVertical: 11,
  },
  bookName: { fontFamily: Fonts.fell, fontSize: 22 },
  count: { fontFamily: Fonts.sans, fontSize: 13 },
});

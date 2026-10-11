import Feather from '@expo/vector-icons/Feather';

import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { booksInSection, SECTIONS } from '@/core/bible/catalog';
import { formatChapter } from '@/core/bible/passage';
import { useTabBarSpace } from '@/ui/components/TabBar';
import { useStatusBar } from '@/ui/hooks/useStatusBar';
import { openBook, openChapter } from '@/ui/navigation';
import { useObservable, useServices } from '@/ui/services';
import { Fonts, Space, useColors } from '@/ui/theme';

const sections = SECTIONS.map((section) => ({ ...section, data: booksInSection(section.id) }));

export function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const lastRead = useObservable(useServices().readingProgress);

  useStatusBar();

  return (
    <SectionList
      sections={sections}
      keyExtractor={(book) => String(book.id)}
      stickySectionHeadersEnabled={false}
      style={{ backgroundColor: colors.ground }}
      contentContainerStyle={{ paddingTop: insets.top + Space.l, paddingBottom: bottomSpace + Space.l }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
            Books
          </Text>
          {lastRead ? (
            <Pressable
              onPress={() => openChapter(lastRead)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.resume,
                { borderColor: colors.rule, backgroundColor: pressed ? colors.selection : colors.surface },
              ]}>
              <Feather name="bookmark" size={18} color={colors.lapis} />
              <Text style={[styles.resumeText, { color: colors.ink }]}>
                Continue with <Text style={{ fontFamily: Fonts.displayItalic }}>{formatChapter(lastRead)}</Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { borderBottomColor: colors.rule }]}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => openBook(item.id)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.selection }]}>
          <Text style={[styles.bookName, { color: colors.ink }]}>{item.name}</Text>
          <Text style={[styles.count, { color: colors.inkSoft }]}>{item.chapters.length}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Space.l, marginBottom: Space.s },
  title: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46 },
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
  resumeText: { fontFamily: Fonts.ui, fontSize: 16 },
  sectionHeader: {
    marginHorizontal: Space.l,
    paddingTop: Space.xl,
    paddingBottom: Space.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontFamily: Fonts.uiMedium, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Space.l,
    paddingVertical: 11,
  },
  bookName: { fontFamily: Fonts.display, fontSize: 22 },
  count: { fontFamily: Fonts.ui, fontSize: 13 },
});

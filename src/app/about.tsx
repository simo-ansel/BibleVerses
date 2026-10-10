import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DAILY_POOL_SIZE } from '@/data/books.generated';
import { Fonts, Space, useColors } from '@/theme';
import { ScreenHeader } from '@/ui/components';

export default function AboutScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScreenHeader title="About" />
      <ScrollView contentContainerStyle={{ padding: Space.l, paddingBottom: insets.bottom + Space.xxl }}>
        <H>The texts</H>
        <P>
          The Old and New Testaments and the Apocrypha are the King James Version in its 1769 Oxford edition, the text
          most King James Bibles print today. The Apocrypha are the books the 1611 King James Bible printed between the
          Testaments and most later Protestant Bibles left out: Catholic and Orthodox Bibles still keep most of them.
        </P>
        <P>
          1 Enoch and Jubilees belong to the Bible of the Ethiopian Orthodox Church. They are given here in the English
          translations of R. H. Charles (1917 and 1902). Where Charles printed two versions of a passage side by side,
          the app shows the first; a few verse numbers are skipped where he merged verses.
        </P>
        <P>All of these translations are in the public domain.</P>

        <H>The verse of the day</H>
        <P>
          Each day brings one verse from a hand-picked list of {DAILY_POOL_SIZE}, drawn from every part of the collection,
          with a painting made for that day. Everyone sees the same verse and the same painting on the same date.
        </P>

        <H>Your privacy</H>
        <P>
          BibleVerses has no accounts, no ads and no tracking. It works offline, and your saved verses and settings stay
          on this phone.
        </P>

        <Text style={[styles.small, { color: c.inkSoft }]}>
          Version {version}. Typefaces: IM Fell English by Igino Marini, EB Garamond by Georg Duffner, Jost by Owen Earl,
          all under the SIL Open Font License.
        </Text>
      </ScrollView>
    </View>
  );
}

function P({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.p, { color: c.ink }]}>{children}</Text>;
}

function H({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: Fonts.fell, fontSize: 26, marginTop: Space.l, marginBottom: Space.s },
  p: { fontFamily: Fonts.garamond, fontSize: 18, lineHeight: 27, marginBottom: Space.m, maxWidth: 560 },
  small: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, marginTop: Space.xl },
});

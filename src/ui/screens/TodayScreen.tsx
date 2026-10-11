import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paintingForDate, type DailyVerse } from '@/application/DailyVerseService';
import { cardMetrics } from '@/core/art/cardLayout';
import { formatPassage, samePassage } from '@/core/bible/passage';
import { formatDay } from '@/core/daily/calendar';
import { ActionButton, IconButton } from '@/ui/components/controls';
import { PaintingCanvas } from '@/ui/components/PaintingCanvas';
import { useTabBarSpace } from '@/ui/components/TabBar';
import { useShareVerse } from '@/ui/hooks/useShareVerse';
import { useStatusBar } from '@/ui/hooks/useStatusBar';
import { useToday } from '@/ui/hooks/useToday';
import { openChapter, openSettings } from '@/ui/navigation';
import { useObservable, useServices } from '@/ui/services';
import { Fonts, Space } from '@/ui/theme';

/** Where the verse sits, as a fraction of the screen height (also the centre of the painting's veil). */
const TEXT_CENTER = 0.46;
/** The phone is held closer than a shared story is viewed, so the verse is a little larger here. */
const ON_SCREEN_SCALE = 1.12;

export function TodayScreen() {
  const { dailyVerse, savedVerses, verseActions } = useServices();
  const saved = useObservable(savedVerses);
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const today = useToday();

  const [daily, setDaily] = useState<DailyVerse | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const { share, sharing } = useShareVerse();

  // Depends only on the date, so the painting can start developing before the verse has loaded.
  const recipe = useMemo(() => paintingForDate(today), [today]);
  const ink = recipe.palette.ink;

  useEffect(() => {
    let active = true;
    dailyVerse.forDate(today).then((result) => {
      if (active) setDaily(result);
    });
    return () => {
      active = false;
    };
  }, [dailyVerse, today]);

  useStatusBar(recipe.palette.dark);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current?.width === width && current.height === height ? current : { width, height }));
  };

  const passage = daily?.passage;
  const isSaved = passage ? saved.some((entry) => samePassage(entry, passage)) : false;
  const metrics = cardMetrics(passage?.text.length ?? 100, size?.width ?? 400);
  const verseSize = Math.round(metrics.verseSize * ON_SCREEN_SCALE);

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
        {size ? (
          <PaintingCanvas recipe={recipe} width={size.width} height={size.height} veilY={TEXT_CENTER} veil={0.6} />
        ) : null}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + Space.xs }]}>
        <Text style={[styles.date, { color: ink }]} accessibilityRole="header">
          {formatDay(today)}
        </Text>
        <IconButton icon="settings" label="Settings" color={ink} onPress={openSettings} />
      </View>

      <View style={[styles.body, { paddingBottom: bottomSpace }]}>
        {passage ? (
          <Animated.View
            key={formatPassage(passage)}
            entering={FadeIn.duration(900).delay(250)}
            style={[styles.verseBlock, { marginTop: size ? (TEXT_CENTER - 0.5) * size.height : 0 }]}>
            <Text
              selectable
              style={[
                styles.verse,
                { color: ink, fontSize: verseSize, lineHeight: Math.round(verseSize * metrics.leading) },
              ]}>
              {passage.text}
            </Text>
            <Text style={[styles.reference, { color: ink }]}>{formatPassage(passage)}</Text>
            <View style={styles.actions}>
              <ActionButton
                icon="heart"
                label={isSaved ? 'Saved' : 'Save'}
                color={ink}
                onPress={() => verseActions.toggleSaved(passage)}
              />
              <ActionButton
                icon="share"
                label="Share"
                color={ink}
                disabled={sharing}
                onPress={() => share(passage, recipe)}
              />
              <ActionButton
                icon="book-open"
                label="Read"
                color={ink}
                onPress={() => openChapter(passage, passage.verseStart)}
              />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Space.l,
    paddingRight: Space.s,
  },
  date: { fontFamily: Fonts.ui, fontSize: 15, letterSpacing: 0.2 },
  body: { flex: 1, justifyContent: 'center' },
  verseBlock: { paddingHorizontal: Space.xl },
  verse: { fontFamily: Fonts.display },
  reference: { fontFamily: Fonts.displayItalic, fontSize: 19, marginTop: Space.l },
  actions: { flexDirection: 'row', marginTop: Space.l, marginLeft: -2 },
});

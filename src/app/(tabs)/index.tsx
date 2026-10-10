import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardMetrics } from '@/art/card';
import { recipeForDay } from '@/art/painting';
import { formatPassage, getBook, provenance } from '@/data/books';
import { dailyPosition, dateFromDayNumber, dayNumber, formatDay } from '@/data/daily';
import { getDailyPassage } from '@/data/db';
import { isSaved, setTodayChrome, useSavedVerses } from '@/data/store';
import type { PassageWithText } from '@/data/types';
import { Fonts, Space } from '@/theme';
import { ActionButton, IconButton } from '@/ui/components';
import { PaintingCanvas } from '@/ui/PaintingCanvas';
import { useTabBarSpace } from '@/ui/TabBar';
import { toggleSave, useShareVerse } from '@/verseActions';

/** How far back the day arrows and swipes can go. */
const MAX_DAYS_BACK = 30;
const TEXT_CENTER = 0.46;

export default function TodayScreen() {
  const db = useSQLiteContext();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const saved = useSavedVerses();
  const { share, ready: shareReady } = useShareVerse();

  const [today, setToday] = useState(() => dayNumber(new Date()));
  const [offset, setOffset] = useState(0);
  const day = today + offset;
  const recipe = useMemo(() => recipeForDay(day), [day]);
  const ink = recipe.palette.ink;
  const [passage, setPassage] = useState<PassageWithText | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let alive = true;
    getDailyPassage(db, dailyPosition(day)).then((p) => alive && setPassage(p));
    return () => {
      alive = false;
    };
  }, [db, day]);

  // Pick up a new day if the app stayed open past midnight; match the status bar to the painting.
  useFocusEffect(
    useCallback(() => {
      const now = dayNumber(new Date());
      if (now !== today) {
        setToday(now);
        setOffset(0);
      }
      setStatusBarStyle(recipe.palette.dark ? 'light' : 'dark');
    }, [today, recipe]),
  );

  useEffect(() => {
    setTodayChrome({ ink, dark: recipe.palette.dark });
  }, [ink, recipe]);

  const goBack = () => setOffset((o) => Math.max(o - 1, -MAX_DAYS_BACK));
  const goForward = () => setOffset((o) => Math.min(o + 1, 0));

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationX > 70) goBack();
      else if (e.translationX < -70) goForward();
    });

  const book = passage ? getBook(passage.bookId) : null;
  const metrics = cardMetrics(passage?.text.length ?? 100, width);
  // Slightly larger than the shared image: the phone is held closer than a story is viewed.
  const verseSize = Math.max(22, Math.round(metrics.verseSize * 1.12));
  const saveActive = passage ? isSaved(saved, passage) : false;
  const dateLabel = formatDay(dateFromDayNumber(day));

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.fill}>
        <View
          style={StyleSheet.absoluteFill}
          onLayout={(e) => setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          {canvasSize ? (
            <PaintingCanvas recipe={recipe} width={canvasSize.width} height={canvasSize.height} veilY={TEXT_CENTER} veil={0.6} />
          ) : null}
        </View>

        <View style={[styles.top, { paddingTop: insets.top + Space.xs }]}>
          <IconButton icon="chevron-left" label="Previous day" color={ink} onPress={goBack} disabled={offset <= -MAX_DAYS_BACK} />
          <Text style={[styles.date, { color: ink }]} accessibilityRole="header">
            {dateLabel}
          </Text>
          <IconButton icon="chevron-right" label="Next day" color={ink} onPress={goForward} disabled={offset === 0} />
          <View style={styles.flex} />
          <IconButton icon="settings" label="Settings" color={ink} onPress={() => router.push('/settings')} />
        </View>

        <View style={[styles.body, { paddingBottom: bottomSpace }]}>
          {passage && book ? (
            <Animated.View key={day} entering={FadeIn.duration(900).delay(250)} style={[styles.block, { marginTop: (TEXT_CENTER - 0.5) * height }]}>
              <Text
                style={[styles.verse, { color: ink, fontSize: verseSize, lineHeight: Math.round(verseSize * metrics.leading) }]}
                selectable>
                {passage.text}
              </Text>
              <Text style={[styles.ref, { color: ink }]}>{formatPassage(passage)}</Text>
              {provenance(book) ? <Text style={[styles.provenance, { color: ink }]}>{provenance(book)}</Text> : null}

              <View style={styles.actions}>
                <ActionButton
                  icon="heart"
                  label={saveActive ? 'Saved' : 'Save'}
                  color={ink}
                  active={saveActive}
                  onPress={() => toggleSave(passage)}
                />
                <ActionButton icon="share" label="Share" color={ink} disabled={!shareReady} onPress={() => share(passage, recipe)} />
                <ActionButton
                  icon="book-open"
                  label="Read"
                  color={ink}
                  onPress={() =>
                    router.push({
                      pathname: '/chapter/[book]/[chapter]',
                      params: { book: String(passage.bookId), chapter: String(passage.chapter), v: String(passage.verseStart) },
                    })
                  }
                />
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.s },
  date: { fontFamily: Fonts.sans, fontSize: 15, letterSpacing: 0.2 },
  body: { flex: 1, justifyContent: 'center' },
  block: { paddingHorizontal: Space.xl },
  verse: { fontFamily: Fonts.fell },
  ref: { fontFamily: Fonts.fellItalic, fontSize: 19, marginTop: Space.l },
  provenance: { fontFamily: Fonts.fellItalic, fontSize: 16, marginTop: 2, opacity: 0.8 },
  actions: { flexDirection: 'row', marginTop: Space.l, marginLeft: -2 },
});

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatPassage } from '@/core/bible/passage';
import type { PassageText } from '@/core/bible/types';
import { Fonts, Space, useColors } from '@/ui/theme';

import { ActionButton, IconButton } from './controls';

interface Props {
  passage: PassageText;
  isSaved: boolean;
  sharing: boolean;
  onToggleSaved: () => void;
  onShare: () => void;
  onCopy: () => void;
  onClose: () => void;
}

/** Actions for the verse selected while reading. */
export function VerseActionSheet({ passage, isSaved, sharing, onToggleSaved, onShare, onCopy, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(160)}
      style={[
        styles.sheet,
        { backgroundColor: colors.surface, borderColor: colors.rule, paddingBottom: insets.bottom + Space.s },
      ]}>
      <View style={styles.header}>
        <Text style={[styles.reference, { color: colors.ink }]}>{formatPassage(passage)}</Text>
        <IconButton icon="x" label="Close" color={colors.inkSoft} onPress={onClose} />
      </View>
      <View style={styles.actions}>
        <ActionButton
          icon="heart"
          label={isSaved ? 'Saved' : 'Save'}
          color={isSaved ? colors.rose : colors.ink}
          onPress={onToggleSaved}
        />
        <ActionButton icon="image" label="Share" color={colors.ink} disabled={sharing} onPress={onShare} />
        <ActionButton icon="copy" label="Copy" color={colors.ink} onPress={onCopy} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reference: { fontFamily: Fonts.displayItalic, fontSize: 20 },
  actions: { flexDirection: 'row' },
});

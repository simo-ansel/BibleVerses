import { Text, type StyleProp, type TextStyle } from 'react-native';

import type { TextSegment } from '@/core/ports';

/** Text with search matches marked. */
export function HighlightedText({
  segments,
  style,
  highlightColor,
}: {
  segments: readonly TextSegment[];
  style: StyleProp<TextStyle>;
  highlightColor: string;
}) {
  return (
    <Text style={style}>
      {segments.map((segment, i) =>
        segment.isMatch ? (
          <Text key={i} style={{ backgroundColor: highlightColor }}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        ),
      )}
    </Text>
  );
}

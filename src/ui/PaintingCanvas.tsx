import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { paintingUniforms, type PaintingRecipe } from '@/art/painting';
import { paintingEffect } from '@/art/share';

interface Props {
  recipe: PaintingRecipe;
  width: number;
  height: number;
  /** Centre of the text veil, as a fraction of the height. */
  veilY?: number;
  veil?: number;
  /** Develop from bare paper when the painting changes. */
  animate?: boolean;
}

/** The daily painting, drawn on the GPU. It develops from the paper once, then holds still. */
export function PaintingCanvas({ recipe, width, height, veilY = 0.5, veil = 0.55, animate = true }: Props) {
  const effect = paintingEffect();
  const reduceMotion = useReducedMotion();
  const develop = useSharedValue(animate && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!animate || reduceMotion) {
      develop.value = 1;
      return;
    }
    develop.value = 0;
    develop.value = withTiming(1, { duration: 1900, easing: Easing.out(Easing.cubic) });
  }, [recipe, animate, reduceMotion, develop]);

  const base = useMemo(
    () => paintingUniforms(recipe, width, height, { veilY, veil }),
    [recipe, width, height, veilY, veil],
  );
  const uniforms = useDerivedValue(() => ({ ...base, uDevelop: develop.value }), [base]);

  if (!effect) {
    return <View style={{ width, height, backgroundColor: recipe.palette.c1 }} />;
  }
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={effect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

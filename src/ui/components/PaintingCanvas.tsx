import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { PAINTING_SKSL, paintingUniforms, type PaintingRecipe } from '@/core/art/painting';

const DEVELOP_DURATION_MS = 1900;

const effect = Skia.RuntimeEffect.Make(PAINTING_SKSL);

interface Props {
  recipe: PaintingRecipe;
  width: number;
  height: number;
  /** Centre of the veil behind the text, as a fraction of the height. */
  veilY?: number;
  veil?: number;
}

/** The daily painting, drawn on the GPU. It develops from bare paper once, then holds still. */
export function PaintingCanvas({ recipe, width, height, veilY = 0.5, veil = 0.55 }: Props) {
  const reduceMotion = useReducedMotion();
  const develop = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      develop.value = 1;
      return;
    }
    develop.value = 0;
    develop.value = withTiming(1, { duration: DEVELOP_DURATION_MS, easing: Easing.out(Easing.cubic) });
  }, [recipe, reduceMotion, develop]);

  const base = useMemo(
    () => paintingUniforms(recipe, width, height, { veilY, veil }),
    [recipe, width, height, veilY, veil],
  );
  const uniforms = useDerivedValue(() => ({ ...base, uDevelop: develop.value }), [base]);

  if (!effect) return <View style={{ width, height, backgroundColor: recipe.palette.c1 }} />;
  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={effect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

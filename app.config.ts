/**
 * Build variants on top of app.json (which `eas init` and EAS keep updated).
 * The development build gets its own name and package, so it installs next to the release app.
 * APP_VARIANT is set per build profile in eas.json.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const isDevelopmentBuild = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => {
  const name = config.name ?? 'BibleVerses';
  const slug = config.slug ?? 'bibleverses';
  if (!isDevelopmentBuild) return { ...config, name, slug };
  return {
    ...config,
    name: `${name} Dev`,
    slug,
    scheme: `${config.scheme ?? 'bibleverses'}-dev`,
    android: { ...config.android, package: `${config.android?.package}.dev` },
  };
};

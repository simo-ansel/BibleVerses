// ESLint flat config: Expo's recommended rules plus the architecture's dependency rules.
// See docs/architecture.md for what each layer may import.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** Libraries that talk to the device or the platform. Only infrastructure and composition use them. */
const PLATFORM_LIBRARIES = [
  'react',
  'react-native',
  'react-native-*',
  'expo',
  'expo-*',
  'expo-*/**',
  '@expo/*',
  '@shopify/*',
  '@react-native-community/*',
];

const restrict = (groups, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: groups, message }] }],
});

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*', 'node_modules/*', 'sources/*'],
  },
  {
    files: ['src/core/**'],
    rules: restrict(
      [...PLATFORM_LIBRARIES, '@/application/*', '@/infrastructure/*', '@/ui/*', '@/composition/*', '@/app/*'],
      'src/core is plain TypeScript: it must not depend on frameworks, libraries or other layers.',
    ),
  },
  {
    files: ['src/application/**'],
    rules: restrict(
      [...PLATFORM_LIBRARIES, '@/infrastructure/*', '@/ui/*', '@/composition/*', '@/app/*'],
      'src/application works through the ports in src/core/ports.ts, never through libraries or the UI.',
    ),
  },
  {
    files: ['src/infrastructure/**'],
    rules: restrict(
      ['@/application/*', '@/ui/*', '@/composition/*', '@/app/*'],
      'src/infrastructure implements ports; it must not depend on the application or the UI.',
    ),
  },
  {
    files: ['src/ui/**', 'src/app/**'],
    rules: restrict(
      [
        '@/infrastructure/*',
        'expo-sqlite',
        'expo-sqlite/*',
        'expo-notifications',
        'expo-sharing',
        'expo-file-system',
        'expo-clipboard',
        'expo-haptics',
      ],
      'Screens use services from useServices(); device and storage access belongs in src/infrastructure.',
    ),
  },
]);

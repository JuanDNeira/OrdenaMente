const { execSync } = require('child_process');

const run = (cmd, i, total) => {
  console.log(`\n[${i}/${total}] ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: __dirname });
    console.log(`[${i}] OK`);
  } catch (e) {
    console.error(`[${i}] FAILED`);
    process.exit(1);
  }
};

const groups = [
  // Navigation — versiones compatibles con RN 0.81
  'npm install --legacy-peer-deps @react-navigation/native@6.1.18 @react-navigation/stack@6.4.1 @react-navigation/bottom-tabs@6.6.1',
  // Navigation peer deps — react-native-screens 3.x compatible con RN 0.81
  'npm install --legacy-peer-deps react-native-screens@3.34.0 react-native-safe-area-context@4.12.0',
  // Gesture Handler + Reanimated
  'npm install --legacy-peer-deps react-native-gesture-handler@2.20.2 react-native-reanimated@3.16.7',
  // State + Storage
  'npm install --legacy-peer-deps zustand@5.0.3 @react-native-async-storage/async-storage@2.1.2',
  // Expo SQLite + Image Picker + File System + Sharing
  'npm install --legacy-peer-deps expo-sqlite expo-image-picker expo-file-system expo-sharing',
  // Expo Haptics + Blur + Linear Gradient + Image Manipulator
  'npm install --legacy-peer-deps expo-haptics expo-blur expo-linear-gradient expo-image-manipulator',
  // Splash Screen + Fonts + Lottie
  'npm install --legacy-peer-deps expo-splash-screen @expo-google-fonts/inter lottie-react-native',
  // NativeWind + Tailwind CSS
  'npm install --legacy-peer-deps nativewind@4.1.23 tailwindcss@3.4.17',
  // UUID utility
  'npm install --legacy-peer-deps react-native-uuid@2.0.2',
  // Dev dependencies
  'npm install --save-dev --legacy-peer-deps jest-expo @testing-library/react-native fast-check@3.23.2 babel-plugin-module-resolver@5.0.2',
];

groups.forEach((cmd, i) => run(cmd, i + 1, groups.length));
console.log('\nAll dependencies installed!');

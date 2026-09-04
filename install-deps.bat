@echo off
echo Installing Expo packages...
npx expo install expo-sqlite expo-image-picker expo-file-system expo-sharing expo-haptics expo-blur expo-linear-gradient expo-image-manipulator expo-splash-screen @expo-google-fonts/inter
echo Done with Expo packages.

echo Installing navigation packages...
npm install @react-navigation/native@^6.1.18 @react-navigation/stack@^6.4.1 @react-navigation/bottom-tabs@^6.6.1 react-native-screens@~4.4.0 react-native-safe-area-context@4.12.0
echo Done with navigation.

echo Installing state and animation packages...
npm install zustand@^5.0.3 react-native-reanimated@~3.16.7 react-native-gesture-handler@~2.20.2
echo Done with state and animation.

echo Installing NativeWind and Tailwind...
npm install nativewind@^4.1.23 tailwindcss@^3.4.17
echo Done with NativeWind.

echo Installing utilities...
npm install @react-native-async-storage/async-storage@^2.1.2 react-native-uuid@^2.0.2 lottie-react-native@^7.2.2
echo Done with utilities.

echo Installing dev dependencies...
npm install --save-dev jest-expo@~54.0.0 @testing-library/react-native@^13.2.0 @types/react-test-renderer fast-check@^3.23.2 babel-plugin-module-resolver@^5.0.2
echo Done with dev dependencies.

echo ALL DONE

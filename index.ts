import { registerRootComponent } from 'expo';

// Deshabilitar react-native-screens para compatibilidad con Expo Go nueva arquitectura
import { enableScreens } from 'react-native-screens';
enableScreens(false);

import App from './App';

registerRootComponent(App);

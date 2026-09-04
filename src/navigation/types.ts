/**
 * San Alejo — Tipos de navegación
 * Tipado completo para todas las rutas de la app
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Tab Navigator ────────────────────────────────────────────────────────────
export type TabParamList = {
  Home: undefined;
  Dashboard: undefined;
};

// ─── Stack principal ──────────────────────────────────────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Search: undefined;
  ContainerDetail: { containerId: string };
  SubContainerDetail: { containerId: string; parentName: string };
  CreateContainer: { parentContainerId?: string; locationId?: string };
  EditContainer: { containerId: string };
  CreateItem: { containerId: string };
  EditItem: { itemId: string; containerId: string };
  Locations: undefined;
  Tags: undefined;
  Settings: undefined;
};

// ─── Helpers de tipo para useNavigation ───────────────────────────────────────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

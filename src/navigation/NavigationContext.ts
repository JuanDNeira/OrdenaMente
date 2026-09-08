/**
 * Contexto de navegación — archivo independiente para evitar require cycles.
 * Las pantallas importan desde aquí, NO desde RootNavigator.
 */
import React from 'react';

export type RouteName =
  | 'MainTabs'
  | 'ContainerDetail'
  | 'Search'
  | 'CreateContainer'
  | 'EditContainer'
  | 'CreateItem'
  | 'EditItem'
  | 'Dashboard'
  | 'Settings'
  | 'Tags'
  | 'Locations'
  // ── Módulo Reciclador Inteligente ──────────────────────────────────────────
  | 'EcoHub'         // Pantalla principal del módulo (tab Eco)
  | 'EcoClassify'    // Flujo de clasificación de ítems candidatos a desuso
  | 'EcoItemDetail'  // Detalle y edición de acción ecológica de un ítem
  | 'EcoHistory';    // Historial de acciones ecológicas completadas

export type RouteParams = {
  containerId?: string;
  parentContainerId?: string;
  locationId?: string;
  itemId?: string;
  tagId?: string;
};

export interface NavigationState {
  route: RouteName;
  params?: RouteParams;
}

export interface NavigationContextValue {
  navigate: (route: RouteName, params?: RouteParams) => void;
  goBack: () => void;
  currentRoute: RouteName;
  params?: RouteParams;
}

export const NavigationContext = React.createContext<NavigationContextValue>({
  navigate: () => {},
  goBack: () => {},
  currentRoute: 'MainTabs',
  params: undefined,
});

export function useAppNavigation(): NavigationContextValue {
  return React.useContext(NavigationContext);
}

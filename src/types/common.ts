// Tipos primitivos compartidos entre entidades

export type UnixTimestamp = number;

export type ContainerType =
  | 'box'
  | 'suitcase'
  | 'drawer'
  | 'shelf'
  | 'bag'
  | 'other';

export type ContainerTypeLabel = Record<ContainerType, string>;

export const CONTAINER_TYPE_LABELS: ContainerTypeLabel = {
  box: 'Caja',
  suitcase: 'Maleta',
  drawer: 'Cajón',
  shelf: 'Estante',
  bag: 'Bolsa',
  other: 'Otro',
};

export const CONTAINER_TYPE_ICONS: Record<ContainerType, string> = {
  box: 'cube-outline',
  suitcase: 'briefcase-outline',
  drawer: 'albums-outline',
  shelf: 'layers-outline',
  bag: 'bag-outline',
  other: 'ellipsis-horizontal-outline',
};

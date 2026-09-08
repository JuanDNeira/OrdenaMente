<div align="center">

# 📦 San Alejo

### Organizador Personal de Objetos con Módulo Reciclador Inteligente

*Aplicación móvil nativa para Android — React Native · Expo · TypeScript · SQLite*

---

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB?style=flat-square&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Local%20DB-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-FF6584?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![NativeWind](https://img.shields.io/badge/NativeWind-4.1-38BDF8?style=flat-square)](https://www.nativewind.dev/)

</div>

---

## 📖 Descripción General

**San Alejo** es una aplicación móvil de organización personal que permite al usuario inventariar, clasificar y gestionar todos los objetos físicos de su hogar o espacio de trabajo. Desde cajas y cajones hasta maletas y estantes, San Alejo convierte el caos doméstico en un inventario digital estructurado, accesible y visualmente atractivo.

### ¿Qué problema resuelve?

La mayoría de las personas no sabe exactamente qué objetos tiene ni dónde están guardados. San Alejo resuelve este problema creando un inventario digital jerárquico: cada objeto pertenece a un contenedor, cada contenedor puede estar en una ubicación, y todo es buscable en tiempo real.

### ¿Cómo funciona?

1. El usuario crea **contenedores** (cajas, cajones, maletas, estantes, bolsas)
2. Dentro de cada contenedor agrega **objetos** con nombre, descripción, cantidad e imagen
3. Organiza con **etiquetas de color**, **ubicaciones** y **contenedores anidados**
4. Usa el **módulo Reciclador** para clasificar objetos en desuso con acciones ecológicas
5. Consulta el **dashboard** para ver estadísticas de su inventario en tiempo real

### Inspiración del nombre

*San Alejo* es el santo patrono popular asociado a "alejar" lo que no se necesita. El nombre refleja la filosofía de la app: ayudarte a decidir qué conservar, qué organizar y qué dejar ir de forma responsable.

---

## ✨ Características Principales

| Módulo | Funcionalidad |
|--------|--------------|
| 📦 **Contenedores** | Crear, editar, eliminar y anidar contenedores con tipo, color, imagen y ubicación |
| 🗂 **Objetos** | Gestión completa de ítems con cantidad, imagen, descripción y etiquetas |
| 🔍 **Búsqueda avanzada** | Búsqueda en tiempo real con debounce de 300ms sobre contenedores e ítems |
| ⭐ **Favoritos** | Marcar contenedores e ítems como favoritos con persistencia en SQLite |
| 🏷 **Tags** | Sistema de etiquetas con colores personalizables y filtrado por múltiples tags |
| 📍 **Ubicaciones** | Asignar contenedores a ubicaciones físicas (habitación, garaje, bodega, etc.) |
| 📊 **Dashboard** | Estadísticas animadas: distribución por tipo, top contenedores, métricas eco |
| 🌱 **Módulo Reciclador** | Clasificación ecológica, logros, insights heurísticos e historial de acciones |
| 🏆 **Achievements** | Sistema de 6 logros desbloqueables basados en acciones ecológicas completadas |
| 💾 **Exportación/Importación** | Respaldo completo en JSON con restauración atómica transaccional |
| 🌙 **Tema oscuro** | Interfaz dark-first con paleta premium inspirada en Netflix y Apple |
| ✨ **UX Premium** | Glassmorphism, animaciones con Reanimated, haptics, skeleton loaders |
| 🎬 **Animaciones** | Transiciones de pantalla, contadores animados, barras de progreso fluidas |
| 📱 **Onboarding** | Pantalla de bienvenida con persistencia en AsyncStorage |

---

## 🛠 Tecnologías Utilizadas

### React Native `0.81.5`
Framework principal para construir la interfaz nativa. Permite escribir una sola base de código en JavaScript/TypeScript que se compila a componentes nativos de Android e iOS. San Alejo usa la **Nueva Arquitectura** (`newArchEnabled: true`) para mejor rendimiento con el bridge JSI.

### Expo `~54.0`
Plataforma de desarrollo que simplifica el ciclo de build, testing y distribución. Provee acceso a APIs nativas (cámara, sistema de archivos, haptics, splash screen) sin configuración nativa manual. Se usa Expo Go para desarrollo y pruebas en dispositivo físico.

### TypeScript `~5.9`
Tipado estático en toda la base de código. Cada entidad del dominio (Container, Item, Tag, Location, EcoAchievement) tiene su interfaz TypeScript. Los repositorios y stores están completamente tipados, eliminando errores en tiempo de ejecución.

### expo-sqlite `^55.0`
Base de datos SQLite embebida en el dispositivo. Toda la persistencia es **100% local y offline**. Se usa WAL mode para mejor rendimiento en escrituras concurrentes y foreign keys para integridad referencial. Las migraciones versionadas garantizan actualizaciones seguras del esquema.

### Zustand `^5.0`
Gestión de estado global minimalista. Cada dominio tiene su propio store (`containerStore`, `itemStore`, `ecoStore`, `uiStore`) con acciones tipadas. Se eligió sobre Redux por su API simple, sin boilerplate y con soporte nativo para TypeScript.

### NativeWind `^4.1` + Tailwind CSS `^3.4`
Utilidades de estilo basadas en Tailwind CSS adaptadas para React Native. Permite escribir estilos con clases utilitarias directamente en JSX. Complementa el sistema de tema personalizado de San Alejo.

### React Native Reanimated `^3.16`
Librería de animaciones que ejecuta en el hilo UI nativo (no en el hilo JS). Usada para animaciones de escala en botones, transiciones de pantalla con fade+slide, barras de progreso animadas y contadores numéricos fluidos.

### Expo Haptics `^55.0`
Retroalimentación táctil en interacciones clave: cambio de tab, toggle de favorito, confirmaciones de acciones ecológicas. Mejora significativamente la percepción de calidad de la app.

### Expo Image Picker `^55.0`
Permite al usuario seleccionar imágenes de la galería del dispositivo para asignarlas como portada de contenedores e ítems. Integrado con `expo-image-manipulator` para optimización.

### AsyncStorage `^2.1`
Almacenamiento clave-valor asíncrono para preferencias del usuario: estado del onboarding y preferencia de tema (dark/light). No se usa para datos del inventario (eso es SQLite).

### Expo Blur `^55.0`
Efectos de desenfoque para fondos de modales y overlays, contribuyendo al efecto glassmorphism de la interfaz premium.

### Expo Linear Gradient `^55.0`
Gradientes lineales en cards de estadísticas, hero del módulo Eco, botones de acción y badges de logros.

---

## 🏗 Arquitectura del Proyecto

San Alejo sigue una arquitectura en capas bien definida que separa responsabilidades y facilita el mantenimiento:

```
┌─────────────────────────────────────────────────────────┐
│                      UI Layer                           │
│         Screens · Components · Navigation               │
├─────────────────────────────────────────────────────────┤
│                    State Layer                          │
│         Zustand Stores (containerStore, ecoStore…)      │
├─────────────────────────────────────────────────────────┤
│                  Repository Layer                       │
│   ContainerRepository · ItemRepository · EcoRepository  │
├─────────────────────────────────────────────────────────┤
│                  Database Layer                         │
│         expo-sqlite · Schema · Migrations               │
└─────────────────────────────────────────────────────────┘
```

### Capa de Base de Datos — SQLite + Migraciones

El módulo `src/database/` gestiona toda la persistencia:

- **`db.ts`** — Singleton de conexión SQLite. Inicializa la BD con WAL mode y foreign keys, ejecuta el schema inicial y corre las migraciones pendientes. Siembra la ubicación por defecto "Sin ubicación".
- **`schema.ts`** — Definiciones SQL de todas las tablas: `locations`, `containers`, `items`, `tags`, `container_tags`, `item_tags`, `_migrations`.
- **`migrations.ts`** — Sistema de migraciones versionadas. Cada migración tiene un número de versión y una función `up()`. Se ejecutan en orden y se registran en `_migrations` para no repetirse.

**Versiones de migración implementadas:**
- `v1` — Schema inicial (manejado por `initializeDb`)
- `v2` — Columnas `is_favorite` en containers e items
- `v3` — Índices de rendimiento para búsquedas frecuentes
- `v4` — Campos ecológicos en items + tabla `eco_achievements` + índices eco

### Capa de Repositorios — Repository Pattern

Cada entidad del dominio tiene su repositorio en `src/database/repositories/`:

- **`ContainerRepository`** — CRUD completo, búsqueda por texto, filtrado por tags/ubicación/padre, estadísticas por tipo, top contenedores, conteo recursivo de ítems con CTE SQL.
- **`ItemRepository`** — CRUD, búsqueda, mover entre contenedores, toggle favorito. Exporta `rowToItem()` para reutilización en EcoRepository.
- **`EcoRepository`** — Mutaciones ecológicas (asignar, completar, omitir), consultas filtradas por estado/acción, estadísticas agregadas en una sola query SQL, persistencia de logros, insights heurísticos con 5 queries en paralelo.
- **`TagRepository`** — CRUD de etiquetas con asignación a contenedores e ítems.
- **`LocationRepository`** — CRUD de ubicaciones físicas.

### Capa de Estado — Zustand Stores

Los stores en `src/store/` actúan como intermediarios entre la UI y los repositorios:

- **`containerStore`** — Estado reactivo de contenedores con loading/error granulares. Actualización optimista del estado local tras cada mutación.
- **`itemStore`** — Cache de ítems indexado por `containerId` para evitar re-fetches innecesarios.
- **`ecoStore`** — Estado completo del módulo Reciclador: stats, progreso, listas de ítems por estado, logros, insights. Incluye lógica de desbloqueo automático de achievements.
- **`uiStore`** — Estado de UI transversal: tema, modales, búsqueda activa. Persiste la preferencia de tema en AsyncStorage.

### Capa de Navegación — Custom Navigator

San Alejo implementa su propio sistema de navegación en `src/navigation/` sin depender de React Navigation para la navegación principal:

- **`NavigationContext`** — Context de React con `navigate()` y `goBack()`. Mantiene un historial de rutas como stack (`NavigationState[]`).
- **`RootNavigator`** — Gestiona el stack de navegación y las transiciones animadas (fade + slide de 220ms). Carga pantallas con `require()` lazy para evitar ciclos de importación.
- **`TabNavigator`** — Barra de tabs inferior personalizada con 3 tabs: Inicio, Panel y Eco. Cada tab tiene animación de escala en press y haptic feedback.

> **Nota:** React Navigation se usa únicamente como dependencia de infraestructura para `SafeAreaContext` y `GestureHandler`. La navegación real es el sistema custom descrito arriba.

### Providers y Bootstrap

**`AppProvider`** orquesta el arranque de la app:
1. Previene el hide del splash screen
2. Carga las fuentes Inter (400/500/600/700) con `@expo-google-fonts/inter`
3. Inicializa la base de datos SQLite y corre migraciones
4. Carga la preferencia de tema desde AsyncStorage
5. Oculta el splash screen cuando todo está listo

### Componentes Reutilizables

La librería de componentes en `src/components/ui/` incluye:

| Componente | Descripción |
|-----------|-------------|
| `Button` | Botón con variantes (primary, secondary, ghost, danger) y estados de loading |
| `Card` | Tarjeta con glassmorphism, gradiente y sombras |
| `StatCard` | Card de estadística con gradiente, ícono y valor animado |
| `PremiumInput` | Input con label flotante, ícono y estados de error/focus |
| `TagBadge` | Badge de etiqueta con color personalizable |
| `SkeletonLoader` | Loader de esqueleto animado para estados de carga |
| `EmptyState` | Estado vacío con ícono, título y descripción |
| `FloatingActionButton` | FAB con gradiente y haptic feedback |
| `FavoriteButton` | Botón de favorito con animación de escala |
| `ColorPicker` | Selector de color para tags y contenedores |
| `TypeSelector` | Selector de tipo de contenedor con íconos |
| `ImagePickerButton` | Botón para seleccionar imagen de galería |
| `SectionHeader` | Encabezado de sección con acento de color |
| `Text` | Componente de texto con variantes tipográficas |
| `ScreenContainer` | Contenedor de pantalla con safe area |

### Sistema de Tema

El tema en `src/theme/` define:
- **`colors.ts`** — Paleta completa: fondos, acentos (violeta `#6C63FF`, teal `#00D4AA`, coral `#FF6584`), texto, bordes, estados, gradientes y colores para glassmorphism.
- **`typography.ts`** — Escala tipográfica con la familia Inter en 4 pesos.
- **`spacing.ts`** — Escala de espaciado consistente.
- **`shadows.ts`** — Sombras para elevación de componentes.

---

## 📁 Estructura de Carpetas

```
san-alejo/
├── assets/                        # Recursos estáticos
│   ├── icon.png                   # Ícono de la app
│   ├── splash-icon.png            # Splash screen
│   └── adaptive-icon.png          # Ícono adaptativo Android
│
├── src/
│   ├── components/
│   │   └── ui/                    # Librería de componentes reutilizables
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── StatCard.tsx
│   │       ├── PremiumInput.tsx
│   │       ├── SkeletonLoader.tsx
│   │       ├── TagBadge.tsx
│   │       ├── EmptyState.tsx
│   │       ├── FloatingActionButton.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── TypeSelector.tsx
│   │       └── index.ts           # Barrel export
│   │
│   ├── database/
│   │   ├── db.ts                  # Singleton SQLite + inicialización
│   │   ├── schema.ts              # Definiciones SQL de tablas
│   │   ├── migrations.ts          # Sistema de migraciones versionadas
│   │   └── repositories/
│   │       ├── ContainerRepository.ts
│   │       ├── ItemRepository.ts
│   │       ├── EcoRepository.ts
│   │       ├── TagRepository.ts
│   │       └── LocationRepository.ts
│   │
│   ├── hooks/
│   │   └── useSearch.ts           # Hook de búsqueda con debounce 300ms
│   │
│   ├── navigation/
│   │   ├── NavigationContext.ts   # Context + hook useAppNavigation
│   │   ├── RootNavigator.tsx      # Stack navigator con transiciones
│   │   ├── TabNavigator.tsx       # Barra de tabs personalizada
│   │   └── types.ts               # Tipos de rutas y parámetros
│   │
│   ├── providers/
│   │   └── AppProvider.tsx        # Bootstrap: DB + fuentes + tema
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Lista de contenedores raíz
│   │   ├── ContainerDetailScreen.tsx
│   │   ├── CreateContainerScreen.tsx
│   │   ├── EditContainerScreen.tsx
│   │   ├── CreateItemScreen.tsx
│   │   ├── EditItemScreen.tsx
│   │   ├── SearchScreen.tsx       # Búsqueda global
│   │   ├── DashboardScreen.tsx    # Estadísticas y métricas
│   │   ├── TagsScreen.tsx
│   │   ├── LocationsScreen.tsx
│   │   ├── SettingsScreen.tsx     # Configuración + export/import
│   │   ├── OnboardingScreen.tsx
│   │   ├── EcoHubScreen.tsx       # Dashboard del módulo Reciclador
│   │   ├── EcoClassifyScreen.tsx  # Clasificación de objetos
│   │   ├── EcoItemDetailScreen.tsx
│   │   └── EcoHistoryScreen.tsx   # Historial de acciones ecológicas
│   │
│   ├── store/
│   │   ├── containerStore.ts      # Estado global de contenedores
│   │   ├── itemStore.ts           # Estado global de ítems
│   │   ├── ecoStore.ts            # Estado del módulo Reciclador
│   │   └── uiStore.ts             # Estado de UI (tema, modales)
│   │
│   ├── theme/
│   │   ├── colors.ts              # Paleta de colores premium
│   │   ├── typography.ts          # Escala tipográfica Inter
│   │   ├── spacing.ts             # Escala de espaciado
│   │   ├── shadows.ts             # Sombras de elevación
│   │   └── index.ts               # Barrel export
│   │
│   ├── types/
│   │   ├── Container.ts
│   │   ├── Item.ts                # Incluye tipos EcoAction y EcoStatus
│   │   ├── Eco.ts                 # Logros, stats y constantes eco
│   │   ├── Tag.ts
│   │   ├── Location.ts
│   │   └── common.ts
│   │
│   └── utils/
│       ├── exportImport.ts        # Serialización/restauración JSON
│       ├── dateUtils.ts           # Utilidades de fecha y timestamp
│       ├── uuid.ts                # Generación de UUIDs
│       └── validation.ts          # Validaciones de formularios
│
├── App.tsx                        # Entry point
├── index.ts                       # Registro de la app
├── app.json                       # Configuración Expo
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── global.css                     # Estilos base NativeWind
```

---

## 🚀 Instalación Paso a Paso

### Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

**1. Node.js (versión 18 o superior)**
```bash
# Verificar versión instalada
node --version

# Si no está instalado, descargarlo desde:
# https://nodejs.org/en/download
```

**2. Expo CLI**
```bash
npm install -g expo-cli
```

**3. Expo Go en tu dispositivo Android**

Descarga la app **Expo Go** desde Google Play Store en tu teléfono Android. Esta app permite ejecutar la aplicación en desarrollo sin necesidad de compilar un APK.

---

### Instalación del proyecto

**Paso 1 — Clonar o descargar el repositorio**
```bash
git clone <url-del-repositorio>
cd san-alejo
```

**Paso 2 — Instalar dependencias**
```bash
npm install
```

Este comando instala todas las dependencias listadas en `package.json`, incluyendo React Native, Expo, SQLite, Zustand y el resto de librerías.

**Paso 3 — Iniciar el servidor de desarrollo**
```bash
npm run start
# o equivalentemente:
npx expo start
```

Expo mostrará un código QR en la terminal.

**Paso 4 — Abrir en dispositivo físico**

1. Abre la app **Expo Go** en tu teléfono Android
2. Toca "Scan QR code"
3. Escanea el código QR que aparece en la terminal
4. La app se cargará automáticamente en tu dispositivo

**Paso 5 — Abrir en emulador Android (opcional)**

Si tienes Android Studio instalado con un AVD configurado:
```bash
npm run android
```

---

### Solución de problemas comunes

```bash
# Limpiar caché de Metro si hay errores de módulos
npx expo start --clear

# Reinstalar node_modules si hay conflictos
rm -rf node_modules
npm install

# Verificar que Expo Go esté actualizado en el dispositivo
# La versión de Expo Go debe ser compatible con Expo SDK 54
```

---

## 📜 Scripts Disponibles

```bash
# Iniciar servidor de desarrollo (muestra QR para Expo Go)
npm run start

# Iniciar y abrir directamente en emulador Android
npm run android

# Iniciar y abrir directamente en simulador iOS (requiere macOS)
npm run ios

# Iniciar versión web (experimental)
npm run web
```

---

## 🌱 Módulo Reciclador Inteligente

El **Reciclador Inteligente** es el módulo diferenciador de San Alejo. Permite al usuario tomar decisiones ecológicas sobre los objetos de su inventario, fomentando hábitos de consumo responsable.

### Flujo de clasificación

```
Objeto sin clasificar
        │
        ▼
  EcoClassifyScreen
  (seleccionar acción)
        │
        ├── ♻️  Reciclar   (6 pts)
        ├── 💚  Donar      (8 pts)
        ├── 💰  Vender     (5 pts)
        ├── 🔄  Reutilizar (10 pts)
        ├── 🔧  Reparar    (10 pts)
        └── 🗑  Desechar   (1 pt)
                │
                ▼
         eco_status = 'pending'
                │
                ▼
        EcoItemDetailScreen
        (completar acción)
                │
                ▼
         eco_status = 'completed'
         + puntos acumulados
         + evaluación de logros
```

### Acciones ecológicas

| Acción | Puntos | Descripción |
|--------|--------|-------------|
| ♻️ Reciclar | 6 pts | El objeto va al punto de reciclaje |
| 💚 Donar | 8 pts | Se dona a alguien que lo necesite |
| 💰 Vender | 5 pts | Se vende de segunda mano |
| 🔄 Reutilizar | 10 pts | Se le da un nuevo uso en casa |
| 🔧 Reparar | 10 pts | Se repara para seguir usándolo |
| 🗑 Desechar | 1 pt | Descarte responsable como último recurso |

### Sistema de Logros (Achievements)

Los logros se desbloquean automáticamente al completar acciones ecológicas. Se evalúan tras cada `completeEcoAction()` y se persisten en la tabla `eco_achievements`.

| Logro | Umbral | Descripción |
|-------|--------|-------------|
| 🌱 Primer Rescate | 1 rescatado | Primera acción ecológica completada |
| 🛡 Guardián Verde | 5 rescatados | Compromiso inicial con el medio ambiente |
| 🦸 Eco Héroe | 10 rescatados | Impacto ecológico significativo |
| 🎓 Maestro del Reciclaje | 25 rescatados | Hábito ecológico consolidado |
| 🏅 Leyenda Sostenible | 50 rescatados | Referente de sostenibilidad |
| 🏆 Campeón del Planeta | 100 rescatados | Máximo nivel de impacto ecológico |

> Un objeto se cuenta como "rescatado" cuando su `eco_action` es distinta de `discard` y su `eco_status` es `completed`.

### Dashboard Ecológico (EcoHub)

La pantalla `EcoHubScreen` es el centro de control del módulo:

- **Hero con gradiente** — Muestra el progreso ecológico como ratio rescatados/(rescatados+desechados)
- **4 StatCards** — Rescatados, Puntos Eco, Pendientes, Completados
- **Acciones rápidas** — Acceso directo a Clasificar e Historial
- **Insights heurísticos** — Alertas y consejos generados automáticamente
- **Lista de pendientes** — Ítems con acción asignada pero no completada
- **Logros recientes** — Últimos 3 achievements desbloqueados
- **Banner de logro** — Notificación animada al desbloquear un nuevo logro

### Insights Heurísticos

El `EcoRepository.getInsights()` genera hasta 5 tipos de insights ejecutando queries en paralelo:

| Tipo | Condición | Severidad |
|------|-----------|-----------|
| `forgotten_items` | Ítems sin clasificar con > 90 días de antigüedad | warning / tip |
| `unclassified_excess` | Más de 20 ítems sin clasificar | warning |
| `top_action` | Acción ecológica completada más frecuente | info |
| `recent_streak` | Ítems completados en los últimos 7 días | info |
| `active_container` | Contenedor con más ítems ecológicos pendientes | tip |

### Estadísticas Ecológicas

`EcoRepository.getEcoStats()` calcula todas las métricas en **una sola query SQL** usando `SUM(CASE WHEN ...)` para evitar múltiples round-trips a la base de datos:

```sql
SELECT
  SUM(CASE WHEN eco_status = 'pending'   THEN 1 ELSE 0 END) AS totalPending,
  SUM(CASE WHEN eco_status = 'completed' THEN 1 ELSE 0 END) AS totalCompleted,
  SUM(CASE WHEN eco_status = 'skipped'   THEN 1 ELSE 0 END) AS totalSkipped,
  SUM(CASE WHEN eco_status = 'completed'
           AND eco_action != 'discard'   THEN 1 ELSE 0 END) AS totalRescued,
  SUM(CASE WHEN eco_status = 'completed'
           AND eco_action = 'discard'    THEN 1 ELSE 0 END) AS totalDiscarded,
  SUM(CASE WHEN eco_action = 'reuse'     THEN 10
           WHEN eco_action = 'repair'    THEN 10
           WHEN eco_action = 'donate'    THEN 8
           ...
      END) AS ecoPoints
FROM items;
```

### Historial Ecológico

`EcoHistoryScreen` muestra todos los ítems con `eco_status = 'completed'` ordenados por `eco_completed_at DESC`, con la acción realizada, fecha de completado y puntos obtenidos.

---

## 💾 Sistema de Exportación e Importación

San Alejo incluye un sistema completo de respaldo y restauración de datos, accesible desde `SettingsScreen`.

### Exportación

El proceso de exportación serializa toda la base de datos a un archivo JSON:

```json
{
  "version": 2,
  "exported_at": 1748304000000,
  "locations": [...],
  "tags": [...],
  "containers": [...],
  "items": [...],
  "container_tags": [...],
  "item_tags": [...],
  "eco_achievements": [...]
}
```

El archivo se guarda en el directorio de caché del dispositivo y se comparte mediante el sistema nativo de compartir de Android (`expo-sharing`). El nombre del archivo incluye la fecha: `san-alejo-backup-2026-05-26.json`.

### Importación

La restauración es un proceso **atómico transaccional** que garantiza consistencia:

1. El usuario selecciona el archivo JSON con `expo-document-picker`
2. Se valida la estructura del backup (versión, tablas obligatorias)
3. Se validan las relaciones FK en tablas de unión
4. Los contenedores se ordenan **topológicamente** (padres antes que hijos) para respetar la FK `parent_container_id`
5. Se ejecuta todo dentro de `withExclusiveTransactionAsync()`:
   - Limpieza de datos existentes en orden inverso a las FK
   - Inserción en orden: locations → tags → containers → items → container_tags → item_tags → eco_achievements
6. Si cualquier paso falla, la transacción hace rollback completo

### Persistencia local

Todos los datos viven exclusivamente en el dispositivo:
- **SQLite** — Inventario completo (contenedores, ítems, tags, ubicaciones, logros eco)
- **AsyncStorage** — Preferencias de usuario (tema, onboarding completado)
- **Sin nube** — No hay sincronización remota ni cuentas de usuario

---

## 🎨 Experiencia Visual y UX

### Paleta de colores premium

San Alejo usa una paleta dark-first inspirada en interfaces cinematográficas:

| Token | Color | Uso |
|-------|-------|-----|
| `background` | `#0A0A0F` | Fondo principal — negro profundo con tinte azul |
| `primary` | `#6C63FF` | Violeta premium — acción principal, tab Home |
| `accent` | `#00D4AA` | Verde teal — módulo Eco, acciones ecológicas |
| `secondary` | `#FF6584` | Coral — tags, elementos secundarios |
| `surface` | `#16161F` | Superficie de tarjetas |
| `glass` | `#1E1E2A` | Glassmorphism |

### Glassmorphism

Las tarjetas de acción rápida en EcoHub usan el efecto glassmorphism: fondo semitransparente (`Colors.glass`), borde sutil (`Colors.glassBorder`) y sombras suaves. Esto crea profundidad visual sin sobrecargar la interfaz.

### Animaciones

Todas las animaciones usan `useNativeDriver: true` cuando es posible para ejecutar en el hilo UI nativo:

- **Transiciones de pantalla** — Fade + slide de 220ms al navegar entre rutas
- **Entrada escalonada** — `Animated.stagger()` en EcoHub para animar secciones con delay progresivo
- **Contadores animados** — Los números en StatCards se animan desde 0 hasta el valor real
- **Barras de progreso** — Animación de 700-900ms con easing suave
- **Escala en press** — Spring animation en botones y tarjetas interactivas (toValue: 0.95-0.97)
- **Banner de logro** — Entrada con spring bounce + auto-dismiss a los 3 segundos

### Haptic Feedback

Retroalimentación táctil en momentos clave:
- `Haptics.selectionAsync()` — Cambio de tab, toggle de favorito
- `Haptics.impactAsync(Light)` — Refresh del dashboard
- `Haptics.notificationAsync(Success)` — Exportación/importación exitosa
- `Haptics.notificationAsync(Error)` — Error en importación

### Skeleton Loaders

Los estados de carga usan `SkeletonLoader` con animación de pulso en lugar de spinners, manteniendo el layout estable y mejorando la percepción de velocidad.

### Microinteracciones

- Los tabs de la barra inferior tienen animación de escala en press con spring physics
- El botón de refresh del dashboard gira con animación de loop mientras carga
- El toggle de tema en Settings tiene animación de deslizamiento del thumb
- Las filas de Settings tienen animación de escala sutil en press

---

## 🧠 Decisiones Técnicas Importantes

### ¿Por qué Zustand y no Redux?

Redux requiere una cantidad significativa de boilerplate: actions, reducers, selectors, middleware. Para una app de este tamaño, ese overhead no aporta valor. Zustand ofrece:

- **API minimalista** — Un store se define en ~30 líneas con `create()`
- **TypeScript nativo** — Las interfaces de estado y acciones se infieren automáticamente
- **Sin Provider** — No requiere envolver la app en un `<Provider>`
- **Actualizaciones atómicas** — Un solo `set()` por mutación evita renders intermedios
- **Acceso fuera de componentes** — `useEcoStore.getState()` y `useEcoStore.setState()` permiten acceder al store desde funciones helper sin hooks

La decisión de tener 4 stores separados (container, item, eco, ui) en lugar de uno global sigue el principio de responsabilidad única y evita re-renders innecesarios cuando solo cambia una parte del estado.

### ¿Por qué SQLite y no AsyncStorage o una API remota?

**AsyncStorage** es un almacén clave-valor plano. No soporta queries relacionales, índices ni transacciones. Para un inventario con relaciones entre contenedores, ítems, tags y ubicaciones, AsyncStorage sería inviable.

**Una API remota** requeriría autenticación, conectividad a internet y un backend. San Alejo es una app de uso personal y offline-first. El usuario no debería necesitar internet para consultar su inventario.

**SQLite** ofrece:
- Queries SQL completas con JOINs, CTEs recursivas y agregaciones
- Índices para búsquedas rápidas (`idx_items_name`, `idx_items_eco_action`, etc.)
- Transacciones ACID para operaciones críticas (importación)
- WAL mode para mejor rendimiento en escrituras concurrentes
- Foreign keys para integridad referencial
- Migraciones versionadas para evolucionar el schema sin perder datos

### ¿Por qué un sistema de navegación custom y no React Navigation completo?

React Navigation es excelente para apps complejas con deep linking, modales nativos y navegación anidada profunda. Para San Alejo, el sistema custom ofrece:

- **Control total sobre las transiciones** — Las animaciones de fade+slide están implementadas exactamente como se diseñaron, sin depender de la API de transiciones de React Navigation
- **Carga lazy de pantallas** — `require()` dentro de `renderScreen()` rompe los ciclos de importación que surgían con imports estáticos
- **Stack simple** — El historial es un array de `NavigationState[]`. `navigate()` hace push, `goBack()` hace pop. Sin overhead de configuración de navigators anidados
- **Sin dependencia de contexto de React Navigation** — El `NavigationContext` propio es más ligero y predecible

React Navigation sí se usa para `GestureHandlerRootView` y `SafeAreaProvider`, que son infraestructura necesaria independientemente del sistema de navegación.

### ¿Por qué Repository Pattern?

El Repository Pattern separa la lógica de acceso a datos de la lógica de negocio. Esto aporta:

- **Testabilidad** — Los repositorios pueden mockearse en tests sin tocar SQLite
- **Cohesión** — Toda la lógica SQL de contenedores está en `ContainerRepository`, no dispersa en stores o componentes
- **Reutilización** — `rowToItem()` de `ItemRepository` es reutilizado por `EcoRepository` para mapear filas sin duplicar código
- **Separación de responsabilidades** — Los stores orquestan llamadas a repositorios pero no contienen SQL. Los repositorios no conocen Zustand ni React

Esta separación también facilita la evolución del schema: si cambia la estructura de una tabla, solo hay que actualizar el repositorio correspondiente.

### ¿Por qué la Nueva Arquitectura de React Native?

`newArchEnabled: true` en `app.json` activa el nuevo sistema de renderizado de React Native (Fabric + JSI). Esto mejora:

- **Rendimiento de animaciones** — Reanimated 3 aprovecha JSI para ejecutar animaciones directamente en el hilo UI sin pasar por el bridge
- **Sincronización de layouts** — Menos jank en transiciones y scroll
- **Preparación para el futuro** — La arquitectura antigua será deprecada en versiones futuras de React Native

---

---

## 🗄 Esquema de Base de Datos

```sql
-- Ubicaciones físicas
CREATE TABLE locations (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  icon       TEXT,
  created_at INTEGER NOT NULL
);

-- Contenedores (soporta anidamiento con parent_container_id)
CREATE TABLE containers (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  description          TEXT,
  type                 TEXT NOT NULL CHECK(type IN ('box','suitcase','drawer','shelf','bag','other')),
  location_id          TEXT REFERENCES locations(id) ON DELETE SET NULL,
  parent_container_id  TEXT REFERENCES containers(id) ON DELETE CASCADE,
  cover_image_uri      TEXT,
  color_tag            TEXT,
  is_favorite          INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL,
  last_accessed_at     INTEGER
);

-- Objetos (con campos ecológicos opcionales)
CREATE TABLE items (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  quantity         INTEGER NOT NULL DEFAULT 1,
  container_id     TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  cover_image_uri  TEXT,
  is_favorite      INTEGER NOT NULL DEFAULT 0,
  eco_action       TEXT CHECK(eco_action IN ('recycle','donate','sell','reuse','repair','discard')),
  eco_notes        TEXT,
  eco_completed_at INTEGER,
  eco_status       TEXT CHECK(eco_status IN ('pending','completed','skipped')),
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
);

-- Etiquetas
CREATE TABLE tags (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

-- Relaciones many-to-many
CREATE TABLE container_tags (container_id TEXT, tag_id TEXT, PRIMARY KEY (container_id, tag_id));
CREATE TABLE item_tags      (item_id TEXT,      tag_id TEXT, PRIMARY KEY (item_id, tag_id));

-- Logros ecológicos
CREATE TABLE eco_achievements (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK(type IN (
                'first_rescue','guardian_verde','eco_heroe',
                'maestro_reciclaje','leyenda_sostenible','campeon_planeta'
              )),
  unlocked_at INTEGER NOT NULL,
  metadata    TEXT
);
```

---

## 👤 Autor

<div align="center">

| Campo | Información |
|-------|-------------|
| **Nombre** | *Juan David Neira Meza* |
| **Universidad** | *FESC* |
| **Carrera** | *Ingeniería de software* |
| **Año** | 2026 |
| **Proyecto** | Aplicación móvil — Desarrollo de Software |

</div>

---

<div align="center">

**San Alejo** — Organiza lo que tienes. Cuida lo que desechas.

*Construido con React Native · Expo · TypeScript · SQLite*

</div>

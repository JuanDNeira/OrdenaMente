# Fase A — EAS Build, permisos y migración v5

## Requisitos previos

- Node.js ≥ 18, npm ≥ 10
- EAS CLI ≥ 19: `npm install -g eas-cli`
- Cuenta en [expo.dev](https://expo.dev) con el proyecto "OrdenaMente" creado
- Android Studio + ADB (para instalar el APK de desarrollo en el dispositivo)

---

## 1. Vincular el proyecto a EAS

```bash
# Desde la raíz del repositorio
eas init
```

Esto genera un `projectId` en Expo. Cópialo y reemplaza el valor
`"PENDIENTE-reemplazar-con-id-de-eas-project"` en `app.json` > `extra.eas.projectId`.

---

## 2. Variables de entorno de desarrollo

```bash
# Crea tu archivo local (no se sube al repositorio)
cp .env.example .env.local
```

Edita `.env.local` y añade la clave de Google Cloud Vision restringida:

```
EXPO_PUBLIC_VISION_API_KEY=AIza...tu-clave-aqui
```

### Cómo crear la clave restringida en Google Cloud Console

1. Abre [console.cloud.google.com](https://console.cloud.google.com) > **APIs y servicios** > **Credenciales**.
2. Crea una nueva clave de API.
3. En **Restricciones de aplicación** → selecciona **Aplicaciones Android**.
4. Agrega tu huella SHA-1 de desarrollo:
   ```bash
   eas credentials --platform android
   ```
   Copia el SHA-1 que aparece para el perfil `development`.
5. Añade el nombre de paquete: `com.ordenamente.app`.
6. En **Restricciones de API** → selecciona solo **Cloud Vision API**.
7. Establece una cuota máxima de **100 solicitudes/día** en la consola de cuotas.

> **Nota de producción (Fase E):** En el perfil `production` de `eas.json`,
> `EXPO_PUBLIC_VISION_API_KEY` se deja vacío. Las llamadas pasan por un
> backend/proxy que gestiona la autenticación. Documenta el endpoint en
> `src/services/visionService.ts` (ver sección `PROXY_URL`).

---

## 3. Compilar el development build

### Android (APK, para instalar en dispositivo físico o emulador)

```bash
eas build --profile development --platform android
```

- EAS compila en la nube (~10-15 min primera vez).
- Descarga el APK del enlace que aparece en la terminal.
- Instálalo en el dispositivo:
  ```bash
  adb install OrdenaMente-development.apk
  ```

### Ejecutar el bundler local tras instalar el APK

```bash
npx expo start --dev-client
```

El dispositivo se conecta al bundler vía LAN o túnel.

### iOS (simulador, opcional)

```bash
eas build --profile development --platform ios
# O localmente si tienes Xcode:
npx expo run:ios
```

---

## 4. Verificar que la migración v5 se aplicó sin perder datos

### Método A — Logs del arranque

Al arrancar la app en el development build, `runMigrations()` imprime en
metro/logcat si alguna migración falla. Si no ves errores, v5 se aplicó.

### Método B — Inspección directa con adb + sqlite3

```bash
# Conecta el dispositivo con ADB y abre una shell
adb shell

# Localiza la BD (ajusta el nombre de paquete si cambia)
run-as com.ordenamente.app
ls databases/
# → san-alejo.db

# Copia la BD al almacenamiento externo para acceder desde PC
cp databases/san-alejo.db /sdcard/san-alejo.db
exit
exit

# En tu PC, descarga y abre con sqlite3
adb pull /sdcard/san-alejo.db .
sqlite3 san-alejo.db
```

Dentro de sqlite3:

```sql
-- Verifica versiones aplicadas (debe incluir 2, 3, 4, 5)
SELECT version, datetime(applied_at/1000, 'unixepoch') AS applied
FROM _migrations
ORDER BY version;

-- Verifica que la tabla existe
SELECT * FROM app_settings;
-- Debe mostrar las 4 filas: cv_enabled, cv_consent_given, ble_enabled, ble_simulated_mode

-- Verifica que los datos previos siguen intactos
SELECT COUNT(*) FROM containers;
SELECT COUNT(*) FROM items;
SELECT COUNT(*) FROM eco_achievements;
```

### Método C — Expo Dev Tools (más simple)

En la consola del bundler (`npx expo start --dev-client`), abre la pestaña
**Logs** del dispositivo. Filtra por `[DB]` o `migrations` para ver el log
de `runMigrations()`.

---

## 5. Permisos declarados

| Permiso | Plataforma | Para qué |
|---|---|---|
| `CAMERA` / `NSCameraUsageDescription` | Android + iOS | Foto para CV (Fase B) |
| `READ_MEDIA_IMAGES` / `NSPhotoLibraryUsageDescription` | Android + iOS | Galería para ítems |
| `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` | Android 12+ | Beacons BLE (Fase C) |
| `BLUETOOTH` / `BLUETOOTH_ADMIN` | Android < 12 | Beacons BLE (Fase C) |
| `ACCESS_FINE_LOCATION` | Android | Requisito del sistema para BLE scan |
| `NSBluetoothAlwaysUsageDescription` | iOS | Beacons BLE (Fase C) |
| `NSLocationWhenInUseUsageDescription` | iOS | Requisito del sistema para BLE scan |

> Los permisos de BLE y ubicación **no se solicitan al usuario** hasta la Fase C.
> Se declaran ahora en `app.json` porque el proceso de build nativo los necesita
> en el `AndroidManifest.xml` / `Info.plist` desde el principio.

---

## 6. Archivos modificados en la Fase A

| Archivo | Cambio |
|---|---|
| `app.json` | Package Android/iOS, permisos, plugins, `supportsTablet`, `orientation: default` |
| `eas.json` | Nuevo — perfiles development / preview / production |
| `.env.example` | Nuevo — plantilla de variables de entorno |
| `.gitignore` | Añade `.env`, `.env.local`, `google-play-service-account.json` |
| `package.json` | Añade `expo-secure-store@~14.2.0`, `expo-build-properties@~0.13.x` |
| `src/database/migrations.ts` | Migración v5 — tabla `app_settings` |
| `src/database/repositories/AppSettingsRepository.ts` | Nuevo — CRUD sobre `app_settings` |
| `src/store/appSettingsStore.ts` | Nuevo — store Zustand de preferencias |
| `src/providers/AppProvider.tsx` | Llama a `loadSettings()` en el arranque |

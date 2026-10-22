# Modelos locales de ML Kit

## mobilenet_v3.tflite

**Descargar una sola vez antes de compilar:**

```
URL: https://www.kaggle.com/models/google/mobilenet-v3/TfLite/small-100-224-classification-metadata/1
```

Pasos:
1. Abre el enlace (requiere cuenta gratuita de Kaggle).
2. Descarga el archivo `1.tflite` (≈ 3 MB).
3. Renómbralo a `mobilenet_v3.tflite`.
4. Cópialo aquí: `assets/models/mobilenet_v3.tflite`.
5. Reconstruye el development build: `eas build --profile development --platform android`.

El modelo clasifica imágenes en ~1000 categorías de ImageNet (objetos cotidianos, utensilios,
ropa, electrónica, etc.). No requiere internet una vez instalado.

Licencia: Apache 2.0 — uso libre sin costo.

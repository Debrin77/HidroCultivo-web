# Paso 3 — Capturas para el depósito RPI

**Carpeta destino:** `docs/deposito-rpi/HidroCultivo-RPI-ejemplar-1.0.0/capturas/`

**Requisitos:** PNG (o JPG si el trámite lo admite), misma versión **1.0** que la memoria, datos de ejemplo creíbles (torre o NFT configurada).

---

## 1. Cómo abrir la app para capturar

### Opción A — Navegador (recomendado en PC)

```bash
npm run rpi:serve
```

Abre **http://localhost:5173** en Chrome o Edge.

- Tamaño útil: **F12 → modo dispositivo** → iPhone 12 Pro o **390 × 844** px (vertical).
- Oculta barra de favoritos; captura solo la app (recorte si hace falta).

### Opción B — APK Android

Instala el build que congelaste para v1.0 (`app-debug.apk` o release). Captura con **Volumen − + Power** (o herramienta del fabricante).

### Antes de disparar las 8 capturas

1. Ten **al menos una instalación configurada** (torre con niveles/cestas, o NFT).
2. En **Cultivo e instalación**, asigna **variedad + fecha** en algunas cestas (para que Mediciones/checklist no estén vacíos).
3. Cierra avisos tipo «Entendido» en las pestañas para que no tapen el contenido.
4. Modo claro (tema por defecto) — más legible en PDF impreso.

---

## 2. Las 8 capturas (nombre exacto del archivo)

| Archivo | Dónde ir | Qué debe verse |
|---------|----------|----------------|
| `01-inicio.png` | Pestaña **Inicio** (primera del pie) | Resumen del día, tarjeta de instalación activa, accesos visibles |
| `02-asistente-torre.png` | **Cultivo e instalación** → **Nueva instalación / Reconfigurar** (`abrirSetupNuevaTorre`) → elige **Torre** → paso con **vista previa** (diagrama torre + depósito) | Asistente con sliders niveles/cestas y preview SVG |
| `03-sistema-diagrama.png` | **Cultivo e instalación** | Diagrama SVG de la torre/NFT activa + datos del sistema (no hace falta scroll infinito) |
| `04-checklist-recarga.png` | **Medir** → desplegar **Próxima recarga completa** → **Checklist recarga completa** | Primeros pasos del checklist (lista de tareas marcables) |
| `05-mediciones-historial.png` | **Historial** (última pestaña del pie) → subpestaña **Mediciones** o **Recargas** | Al menos una fila o tarjeta en el listado |
| `06-consejos.png` | **Consejos** | Lista de categorías o un consejo abierto |
| `07-exportar-estado.png` | **Cultivo e instalación** → bloque inferior **Exportar estado** / copia de seguridad | Botones Exportar e Importar visibles |
| `08-ayuda-fragmento.png` | **Ayuda** | FAQ o bloque «Instalar» / recorrido (fragmento claro) |

**Alternativa 02:** si capturas NFT en lugar de torre, guarda como `02-asistente-nft.png` y anota en `capturas/NOTAS.txt`.

---

## 3. Cómo hacer la captura en Windows

1. **Win + Shift + S** → recorte rectangular → guardar en la carpeta `capturas/`.
2. Renombra al instante (`01-inicio.png`, …) para no mezclar.
3. Comprueba que el ancho sea ≥ **360 px** y el texto se lea.

---

## 4. Comprobar que está completo

```bash
npm run rpi:capturas-check
```

Debe listar **8/8 OK**. Si falta alguna, el script indica cuál.

---

## 5. Después del paso 3

Cuando `rpi:capturas-check` pase:

```powershell
Compress-Archive -Path "docs\deposito-rpi\HidroCultivo-RPI-ejemplar-1.0.0" -DestinationPath "docs\deposito-rpi\HidroCultivo-RPI-ejemplar-1.0.0.zip" -Force
```

Sigue con **Paso 4–5** en [RPI-PASOS.md](RPI-PASOS.md) (sede electrónica).

---

## Atajo: abrir carpeta capturas

```bash
npm run rpi:capturas-abrir
```

(o explora manualmente `docs/deposito-rpi/.../capturas/`)

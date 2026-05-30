# ACCEDA — Subida de ejemplar (Programas de Ordenador)

**Error «Faltan ficheros obligatorios»:** el ZIP general **no sustituye** los dos archivos obligatorios en **categorías distintas**. Hay que adjuntar **al menos 2 archivos** con «+ Adjuntar Nuevo Archivo» y elegir el **tipo** correcto en cada uno.

**Expediente (ejemplo):** 00765-03177731 — usa el tuyo en pantalla.

---

## 1. Obligatorio — Totalidad del código fuente (ZIP)

**Archivo a subir:**

```
docs/deposito-rpi/HidroCultivo-RPI-codigo-fuente-1.0.0.zip
```

**Generar / regenerar:**

```bash
npm run rpi:fuente
```

Contiene: `index.html`, `js/`, `css/`, `icons/`, `manifest.json`, `service-worker.js`, `package.json`, `capacitor.config.json`.

En ACCEDA: tipo **«Totalidad del código fuente»** → adjuntar este ZIP (máx. 800 MB).

---

## 2. Obligatorio — Memoria del programa (PDF)

**Archivo a subir (elige uno):**

| Archivo | Cuándo |
|---------|--------|
| `docs/memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0_imprimible.pdf` | Memoria completa (recomendado) |
| `docs/memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf` | Versión corta |
| PDF escaneado **firmado** | Si el trámite exige firma manuscrita en la memoria |

En ACCEDA: tipo **«Memoria del programa»** → adjuntar el **PDF** (máx. 30 MB).  
**No** subas la memoria dentro del ZIP de código como sustituto de este campo.

Las **17 capturas** ya están en el paquete de trabajo; la memoria PDF + capturas en carpeta `capturas/` del ZIP ejemplar sirven de documentación. Si la memoria PDF no incluye capturas embebidas, puedes:

- Añadir al final del PDF un anexo con capturas antes de subir, o  
- Indicar en la memoria que el ejemplar visual se aporta en el depósito complementario (si ACCEDA lo permite en otro campo).

Para el portal ACCEDA, lo crítico es el **PDF de memoria** en su casilla.

---

## 3. Opcional — Ejecutable del programa (ZIP)

**La casilla solo acepta ZIP**, no `.txt` suelto.

**Opción A (recomendada):** deja **vacía** la casilla «Ejecutable». La memoria PDF ya incluye el **Anexo V — Ejecutable** (justificación PWA + Capacitor). Regenera memoria si la subiste antes de este anexo:

```bash
npm run rpi:memoria
```

Vuelve a subir el PDF en **Memoria del programa**.

**Opción B:** si quieres rellenar la casilla, sube este ZIP:

```
docs/deposito-rpi/HidroCultivo-RPI-ejecutable-nota-1.0.0.zip
```

Generar: `npm run rpi:ejecutable` (contiene `LEEME-EJECUTABLE.txt` dentro del ZIP).

---

## Qué NO hacer

| Error | Solución |
|-------|----------|
| Un solo ZIP `HidroCultivoRPIejemplar1.0.zip` en una sola casilla | Subir **código** y **memoria PDF** por separado |
| Memoria solo dentro del ZIP | PDF en casilla **Memoria del programa** |
| Código = ZIP con solo capturas | Usar `HidroCultivo-RPI-codigo-fuente-1.0.0.zip` |

El ZIP `HidroCultivo-RPI-ejemplar-1.0.0.zip` (capturas + documentación) puede quedar como respaldo tuyo; ACCEDA pide el desglose anterior.

---

## Orden recomendado en la web

1. Elimina (X) el adjunto mal clasificado si hace falta.
2. **+ Adjuntar** → **Código fuente** → `HidroCultivo-RPI-codigo-fuente-1.0.0.zip`
3. **+ Adjuntar** → **Memoria del programa** → PDF imprimible (o firmado)
4. (Opcional) **Ejecutable** → nota ZIP o dejar vacío con justificación en memoria
5. **Guardar** → comprobar que no aparece el aviso rojo
6. Descargar justificante

---

## Comandos rápidos

```bash
npm run rpi:fuente      # ZIP código fuente
npm run rpi:memoria     # PDF memoria (si cambiaste datos)
```

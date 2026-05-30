# RPI — Subir el ejemplar identificativo (después de firmar)

> **Portal ACCEDA (Programas de Ordenador):** si sale *«Faltan ficheros obligatorios»*, sigue **[RPI-ACCEDA-SUBIDA.md](RPI-ACCEDA-SUBIDA.md)** (código ZIP + memoria PDF por separado).

---

Tras firmar la solicitud, Cultura pide **aportar una copia digital de la obra**. No es una foto personal: es el **depósito del programa** (tu ZIP).

---

## Qué necesitas tener a mano

| Dato | Dónde lo encuentras |
|------|---------------------|
| **NIF** | 19002112H |
| **Número de expediente** | En el justificante / email tras firmar (cópialo tal cual) |
| **Ámbito / CCAA** | El que elegiste al presentar (p. ej. Comunitat Valenciana) |
| **Archivo a subir** | `HidroCultivo-RPI-ejemplar-1.0.0.zip` |

**Ruta del ZIP:**

```
C:\Users\carua\Downloads\app cultivo\GitHub\HidroCultivo-web\docs\deposito-rpi\HidroCultivo-RPI-ejemplar-1.0.0.zip
```

Si no está: en la raíz del repo → `npm run rpi:zip`

---

## Enlace de subida (público, con tus datos)

https://sede.mcu.gob.es/rpi5/webpages/publicoSeguro/ejemplaresAccesoExt.seam

1. Introduce **NIF**, **número de expediente** y **ámbito** (comunidad).
2. Sube el **ZIP** (o lo que permita el desplegable de tipos de archivo).
3. **Descarga el justificante** de entrega del ejemplar y guárdalo con el del pago.

---

## Portada / identificación en el ejemplar

En la sede piden que la copia digital lleve **nombre del autor y título** en portada. Tu ZIP ya incluye:

- `README-RPI.txt` — título, autor, NIF, versión
- Memorias PDF con identificación
- `capturas/INDICE-CAPTURAS.md`

Si el formulario pide un único PDF de portada, puedes generar:

```bash
npm run rpi:portada
```

y volver a comprimir, o subir además el PDF `PORTADA-EJEMPLAR-RPI.pdf` si el portal permite varios archivos (revisa el enlace de “tipos de archivo” del Ministerio).

---

## Tamaño

El ZIP ronda **2,3 MB**. Suele estar dentro del límite; si falla, consulta en la sede el enlace de **tamaño máximo** que muestra la misma pantalla.

---

## Después de subir

- [ ] Justificante de **ejemplar** guardado
- [ ] Anota **fecha de depósito** → `fechaDeposito` en `scripts/rpi-memoria-data.js` → `npm run rpi:memoria`
- [ ] Conserva expediente + ambos justificantes hasta resolución

---

## Si no puedes subir hoy

Guarda **número de expediente**, **ámbito** y el enlace de arriba; complétalo cuanto antes (el trámite puede quedar incompleto hasta entregar el ejemplar).

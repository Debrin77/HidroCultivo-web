# RPI HidroCultivo — Guía paso a paso (persona física)

Sigue los pasos en orden. Marca cada casilla al terminarlo.

| Paso | Documento | Estado |
|------|-----------|--------|
| **1** | Datos del titular y memoria | 👉 **Ahora** |
| **2** | Regenerar PDF y firmar | |
| **3** | Capturas de pantalla | ✅ 17 PNG + [índice](../deposito-rpi/HidroCultivo-RPI-ejemplar-1.0.0/capturas/INDICE-CAPTURAS.md) |
| **4** | ZIP ejemplar | 👉 `npm run rpi:zip` |
| **5** | Sede electrónica y tasa | |

Referencia general: [RPI-REGISTRO-PREPARACION.md](RPI-REGISTRO-PREPARACION.md)

---

## Paso 1 — Completar datos (tú)

Edita un solo archivo en el repo:

**`scripts/rpi-memoria-data.js`**

| Campo | Estado actual | Acción |
|-------|---------------|--------|
| `autor`, `nif`, `lugar` | Rellenos | Revisa que sigan correctos |
| `fechaObra` | `28/05/2026` | Fecha de la versión que depositas |
| `fechaDeposito` | `null` | Pon `dd/mm/aaaa` **el día** que presentes en la sede |
| `email` | Placeholder | Tu email de contacto |
| `domicilio` | Placeholder | Domicilio postal completo (para tu expediente) |
| `comunidadAutonoma` | Comunitat Valenciana | Confirma si tramitas en sede estatal o territorial |

Cuando hayas guardado el archivo, avisa o pasa al **Paso 2**.

---

## Paso 2 — Regenerar memoria PDF y firmar

En la raíz del proyecto:

```bash
npm run rpi:memoria
```

Genera:

- `docs/memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf`
- `docs/memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0_imprimible.pdf` ← **imprime este**

**Tú:**

- [ ] Abre el PDF imprimible y revisa que no quede `[completar...]` (excepto fecha de depósito si aún no presentas).
- [ ] Imprime, firma a mano en la línea indicada (o según lo que pida el trámite telemático actual).
- [ ] Guarda PDF escaneado firmado como `memoria_tecnica_..._firmada.pdf` en `docs/deposito-rpi/` (opcional, no subir a git público).

---

## Paso 3 — Capturas (tú)

**Guía completa:** [RPI-PASO-03-CAPTURAS.md](RPI-PASO-03-CAPTURAS.md)

```bash
npm run rpi:serve              # http://localhost:5173
npm run rpi:capturas-abrir     # abre la carpeta capturas/
# … guarda los 8 PNG …
npm run rpi:capturas-check     # debe decir 8/8
```

| Archivo | Hecho |
|---------|-------|
| `01-inicio.png` | [ ] |
| `02-asistente-torre.png` (o `02-asistente-nft.png`) | [ ] |
| `03-sistema-diagrama.png` | [ ] |
| `04-checklist-recarga.png` | [ ] |
| `05-mediciones-historial.png` | [ ] |
| `06-consejos.png` | [ ] |
| `07-exportar-estado.png` | [ ] |
| `08-ayuda-fragmento.png` | [ ] |

---

## Paso 4 — Paquete ejemplar (automático + tú)

```bash
npm run rpi:deposito
```

Crea: `docs/deposito-rpi/HidroCultivo-RPI-ejemplar-1.0.0/`

**Tú:**

- [ ] Copia las capturas del Paso 3 a `.../capturas/`
- [ ] Si tienes memoria firmada escaneada, cópiala a la raíz de esa carpeta
- [ ] Comprimir (si el trámite pide un ZIP):

```powershell
Compress-Archive -Path "docs\deposito-rpi\HidroCultivo-RPI-ejemplar-1.0.0" -DestinationPath "docs\deposito-rpi\HidroCultivo-RPI-ejemplar-1.0.0.zip" -Force
```

---

## Paso 5 — Presentar en la sede (tú)

**Textos listos para copiar:** [RPI-FORMULARIO-SEDE.md](RPI-FORMULARIO-SEDE.md)

- [ ] Certificado FNMT, DNIe o Cl@ve firma operativos
- [ ] Entrar: [Primera inscripción RPI](https://servicios-cultura.sede.gob.es/pagina/index/directorio/RePI_Solicitud_de_primera_inscripci_n_en_el_Registro_de_la_Propiedad_Intelectual)
- [ ] Elegir comunidad autónoma correcta
- [ ] Modelo **programa de ordenador / app** (B7 o equivalente vigente en el asistente)
- [ ] Pegar **Anexo I** (descripción resumida) — está al final de la memoria PDF
- [ ] Adjuntar ejemplar (ZIP o lo que indique el formulario)
- [ ] Pagar tasa y guardar **justificante + número de expediente**
- [ ] Actualizar `fechaDeposito` en `rpi-memoria-data.js` y volver a ejecutar `npm run rpi:memoria` para archivo final coherente

---

## Paso 1 — Checklist rápido (ahora)

- [ ] He editado `scripts/rpi-memoria-data.js` (email, domicilio, fechas)
- [ ] He leído la memoria actual en `docs/*.pdf` o ejecutaré Paso 2 enseguida

*Cuando termines el Paso 1, continúa con el Paso 2 en este mismo documento.*

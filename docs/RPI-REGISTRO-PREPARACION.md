# HidroCultivo — Preparación registro RPI (persona física)

Registro de **Propiedad Intelectual** ante el Ministerio de Cultura (modelo **programa de ordenador / aplicación móvil**). Es **voluntario** (prueba de autoría y fecha); no sustituye asesoría fiscal, mercantil ni marca (OEPM).

**Guía operativa paso a paso:** [RPI-PASOS.md](RPI-PASOS.md)  
**Datos editables:** `scripts/rpi-memoria-data.js` → `npm run rpi:memoria` → `npm run rpi:deposito`

---

## Documentos ya en este repositorio

| Archivo | Uso |
|---------|-----|
| [memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf](memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf) | Memoria técnica de la obra (adjuntar o integrar en el expediente según instrucciones vigentes) |
| [memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0_imprimible.pdf](memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0_imprimible.pdf) | Misma memoria, formato imprimible |

Antes de presentar: revisar que la versión descrita coincida con el **ejemplar** que deposites (número de versión, fecha, capturas).

---

## Datos que debes tener claros (titular persona física)

- [ ] **Nombre y apellidos** del autor (tú).
- [ ] **DNI/NIE** y domicilio (comunidad autónoma correcta en la sede — algunas CCAA tramitan en registro territorial).
- [ ] **Título de la obra:** p. ej. *«HidroCultivo — aplicación de gestión de cultivos hidropónicos»* (puede afinarse).
- [ ] **Fecha de creación / primera publicación** (aunque sea beta privada).
- [ ] **Declaración de autoría** (eres autor del código y diseño salvo librerías de terceros — ver sección dependencias).
- [ ] **Certificado electrónico** (FNMT) o **DNIe** / **Cl@ve firma** para la sede electrónica.

Enlaces oficiales:

- [Cómo solicitar el registro (Cultura)](https://www.cultura.gob.es/cultura/areas/propiedadintelectual/mc/rpi/registro-obras/como-registrar.html)
- [Trámite telemático — primera inscripción](https://servicios-cultura.sede.gob.es/pagina/index/directorio/RePI_Solicitud_de_primera_inscripci_n_en_el_Registro_de_la_Propiedad_Intelectual)
- [FAQ RPI](https://www.cultura.gob.es/va/cultura/areas/propiedadintelectual/mc/rpi/pf/pf-rpi.html)

---

## Ejemplar de la obra (depósito)

El registro pide un **ejemplar** representativo. Para una app, suele bastar un paquete ordenado (consulta siempre la guía del **Modelo B7 — programa de ordenador / apps** del trámite activo).

### Contenido recomendado del ZIP `HidroCultivo-RPI-ejemplar-v1.0.zip`

```
HidroCultivo-RPI-ejemplar-v1.0/
  README-RPI.txt              ← título, versión, fecha, autor, hash opcional
  memoria_tecnica_....pdf     ← copia de la memoria del repo
  capturas/                 ← 8–12 PNG (asistente, sistema, recarga, checklist)
  identificacion-app.txt      ← appId es.hidrocultivo.app, plataforma Android/PWA
  fuente-representativa/      ← opcional: no hace falta todo el repo
      index.html
      manifest.json
      lista-modulos-principales.txt   ← índice de js/ con una línea por módulo clave
```

**Capturas mínimas sugeridas:** Inicio; asistente torre o NFT; pestaña Cultivo e instalación con diagrama; checklist recarga; exportar estado; Ayuda (fragmento).

No es obligatorio depositar **todo** el código fuente; sí debe permitir **identificar** la obra. Si depositas código, excluye `node_modules/`, `android/`, claves y `.env`.

### Generar el paquete (PowerShell, desde la raíz del repo)

```powershell
$ver = "1.0.0"
$out = "docs/deposito-rpi/HidroCultivo-RPI-ejemplar-$ver"
New-Item -ItemType Directory -Force -Path "$out/capturas", "$out/fuente-representativa" | Out-Null
Copy-Item docs/memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf "$out/"
# Añade capturas manualmente en $out/capturas/
# Copia index.html y manifest.json a fuente-representativa/
Compress-Archive -Path $out -DestinationPath "docs/deposito-rpi/HidroCultivo-RPI-ejemplar-$ver.zip" -Force
```

Carpeta `docs/deposito-rpi/` puede ir en `.gitignore` si incluyes capturas personales; el ZIP no debe subirse a GitHub con datos privados.

### Plantilla `README-RPI.txt`

```
Título: HidroCultivo — aplicación de gestión de cultivos hidropónicos
Versión del ejemplar: 1.0.0
Fecha de este depósito: [AAAA-MM-DD]
Autor y titular solicitado: [Nombre Apellidos]
Contacto: [email]
Descripción breve: Aplicación web/PWA y Android (Capacitor) para configuración
de instalaciones hidropónicas (torre, NFT, DWC, RDWC, SRF), cálculos orientativos
de volumen y equipos, checklist de recarga e historial local.
Identificador aplicación Android: es.hidrocultivo.app
```

---

## Terceros y licencias (declaración honesta)

En la memoria o anexo, conviene mencionar:

- **Capacitor**, plugins (@capacitor/filesystem, share, biometric), **esbuild** — licencias open source.
- Fuentes **Google Fonts** (Syne, etc.) — uso según sus licencias.
- **OpenStreetMap / Nominatim** para geocodificación inversa (meteo) — política de uso de Nominatim.
- Datos de cultivos y tablas propias — elaboración propia.

No registras las librerías como tuyas; registras **tu** programa como obra derivada de tu estructura, textos, lógica de negocio e interfaz.

---

## Tasas y plazos

- Consulta la **tasa vigente** en la sede al iniciar el trámite (importe según tipo de inscripción).
- Plazo de resolución: variable (semanas); guarda **justificante** y número de expediente.

---

## Orden recomendado con beta y Play

| Fase | Acción |
|------|--------|
| 1 | Congelar versión `1.0.0` (o la que figure en memoria) |
| 2 | Completar ZIP ejemplar + capturas |
| 3 | Presentar RPI (telemático) y pagar tasa |
| 4 | En paralelo: [validación testers](VALIDACION-BETA-TESTERS.md) |
| 5 | Tras feedback: Play internal testing + [one-pager](ONE-PAGER-FABRICANTES.md) si hay tracción |

El RPI **no bloquea** testers ni Play; da tranquilidad antes de asociarte con marcas o publicitar el nombre.

---

## Checklist final antes de pulsar “Enviar”

- [ ] Título y autor coherentes con memoria PDF
- [ ] Ejemplar ZIP o PDF único según instrucciones del modelo B7 actual
- [ ] Versión y fecha alineadas con el build que muestras en capturas
- [ ] Certificado electrónico operativo
- [ ] Justificante de pago guardado
- [ ] Copia local del expediente presentado

---

## Relacionado

- Validación usuarios: [VALIDACION-BETA-TESTERS.md](VALIDACION-BETA-TESTERS.md)
- Fabricantes: [ONE-PAGER-FABRICANTES.md](ONE-PAGER-FABRICANTES.md)
- APK / Capacitor: [CAPACITOR-PRUEBAS-INTERNAS.md](CAPACITOR-PRUEBAS-INTERNAS.md)

*Este documento es guía operativa, no asesoramiento jurídico.*

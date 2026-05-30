# HidroCultivo — Textos para pegar en la sede electrónica (RPI)

**Trámite:** [Primera inscripción en el Registro de la Propiedad Intelectual](https://servicios-cultura.sede.gob.es/pagina/index/directorio/RePI_Solicitud_de_primera_inscripci_n_en_el_Registro_de_la_Propiedad_Intelectual)

**Tipo de obra:** Programa de ordenador / aplicación móvil (modelo B7 o equivalente del asistente).

**Comunidad autónoma al presentar:** Comunitat Valenciana (residencia del titular).

**Ejemplar adjunto:** `docs/deposito-rpi/HidroCultivo-RPI-ejemplar-1.0.0.zip` (~2,3 MB)

---

## 1. Titular / autor (persona física)

| Campo | Texto |
|-------|--------|
| Nombre y apellidos | Jose Caruana Reina |
| NIF | 19002112H |
| Domicilio | C/ Comanda Fadrell, 2, 5º E, 12005 Castellón de la Plana |
| Localidad | Castellón de la Plana |
| Provincia | Castellón / Castelló |
| País | España |
| Email | caruana2001@gmail.com |

---

## 2. Identificación de la obra

| Campo | Texto |
|-------|--------|
| Título | HidroCultivo |
| Título descriptivo (si hay campo largo) | HidroCultivo — aplicación de gestión de cultivos hidropónicos |
| Tipo | Programa de ordenador / aplicación móvil |
| Versión | 1.0 |
| Fecha de creación / versión depositada | 28/05/2026 |
| Lugar de publicación o elaboración | Castellón de la Plana, España |

---

## 3. Descripción resumida (copiar entero)

```
Programa de ordenador denominado HidroCultivo (versión 1.0), desarrollado por Jose Caruana Reina (NIF 19002112H) en JavaScript, HTML y CSS, distribuido como PWA y aplicación Android (Capacitor). Gestión hidropónica: configuración de instalaciones (torre vertical, NFT, DWC, RDWC, SRF), cálculos orientativos de volumen y equipos, diagramas, checklist de recarga, mediciones, historial, calendario, meteo de referencia y recomendaciones contextuales por cultivo/fase/nutriente.
```

---

## 4. Descripción ampliada (si el formulario pide más texto)

```
HidroCultivo es una aplicación para cultivadores hidropónicos que permite configurar el tipo de instalación (torre vertical, NFT, DWC, RDWC o SRF), registrar mediciones de EC, pH y temperatura, seguir un checklist de recarga del depósito, consultar consejos técnicos y visualizar diagramas del sistema. Los datos del usuario se almacenan principalmente en el dispositivo. Incluye asistente de configuración, historial, calendario y referencia meteorológica por ubicación. Distribución: aplicación web progresiva (PWA) y cliente Android (identificador es.hidrocultivo.app). Obra original del autor en cuanto a estructura, interfaz, textos y lógica de negocio integrada.
```

---

## 5. Declaración de autoría (si hay caja de texto libre)

```
Yo, Jose Caruana Reina, con NIF 19002112H, declaro ser autor y titular de los derechos de explotación de la obra software "HidroCultivo", versión 1.0, y solicito su inscripción en el Registro de la Propiedad Intelectual. El ejemplar aportado (archivo ZIP) contiene memoria técnica, fragmentos representativos del código, documentación e interfaz gráfica mediante capturas de pantalla (17 imágenes con índice).
```

---

## 6. Archivos a adjuntar (checklist)

- [ ] **Ejemplar:** `HidroCultivo-RPI-ejemplar-1.0.0.zip` (regenerar: `npm run rpi:zip`)
- [ ] **Memoria técnica firmada** (PDF escaneado), si el trámite lo pide aparte del ZIP
- [ ] Justificante de **pago de tasa** (guardar PDF)

Contenido del ZIP (ya incluido):

- Memorias PDF (normal + imprimible)
- `README-RPI.txt`, `identificacion-app.txt`
- `fuente-representativa/` (módulos clave)
- `capturas/` (17 PNG + `INDICE-CAPTURAS.md`)

---

## 7. Después de presentar

1. Anota **número de expediente** y fecha.
2. En `scripts/rpi-memoria-data.js` pon `fechaDeposito: 'dd/mm/aaaa'` (día real).
3. Ejecuta `npm run rpi:memoria` para archivar PDF coherente.

---

## 8. Enlace y ayuda

- Instrucciones generales: [RPI-PASOS.md](RPI-PASOS.md)
- FAQ Ministerio: https://www.cultura.gob.es/cultura/areas/propiedadintelectual/mc/rpi/pf/pf-rpi.html

*Revisa en la sede los campos exactos del formulario vigente; los nombres pueden variar ligeramente.*

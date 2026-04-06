# Hoja de ruta PWA → app nativa (HidroCultivo)

Objetivo: app usable instalada, copias de seguridad claras y menos fricción en móvil (sobre todo iPhone).

---

## Fase 1 — PWA + backup en navegador (en curso / hecho en repo)

| Ítem | Estado |
|------|--------|
| `manifest.json` | Presente (nombre, iconos, `standalone`, tema). |
| `service-worker.js` | Precache ligero del shell; HTML red primero, fallback offline. Caché versionada (`hidrocultivo-shell-v3`…). |
| Registro del SW | Al cargar la página. |
| Botón **Instalar** | Visible cuando el navegador emite `beforeinstallprompt` (p. ej. Chrome/Android). |
| iPhone sin ese evento | Toast al pulsar Instalar: Safari → Compartir → **Añadir a la pantalla de inicio**. |
| Exportar / importar | JSON local; import con `<label>` + input a tamaño del botón para Safari iOS. |

**Medir fricción en iPhone:** hace falta abrir la app en **Safari** desde una **URL HTTPS** (no basta con “tener el repo en GitHub Desktop”). Opciones típicas:

1. **GitHub Pages** (si el repo es público o Pages en plan que lo permita): Settings → Pages → rama + carpeta → la web queda en `https://<usuario>.github.io/<repo>/` (o dominio custom).
2. Otro hosting estático (Netlify, Cloudflare Pages, Vercel, etc.) con el mismo resultado: **misma origen HTTPS** que sirva `index.html`, `manifest.json`, `service-worker.js` y `css/` / `js/` / `icons/`.

**GitHub Desktop** solo **empuja commits** a GitHub. Para probar en el móvil:

1. Sube los cambios con Desktop (o `git push`).
2. Activa Pages o tu hosting para que exista la URL.
3. En el iPhone: Safari → esa URL → usar **Exportar/Importar** y **Añadir a la pantalla de inicio** → anotar qué pasos molestan.

Checklist rápido de prueba en iPhone:

- [ ] La URL carga sin error y el icono / tema se ven bien.
- [ ] **Añadir a inicio** abre la app en pantalla casi completa.
- [ ] **Exportar estado** deja un `.json` localizable (Archivos / Descargas).
- [ ] **Importar estado** permite elegir ese `.json` y restaura tras confirmar.
- [ ] Tras una actualización del sitio, recargar (o cerrar pestañas) si el SW muestra caché vieja.

---

## Fase 2 — Capacitor (iOS / Android) — cuando la fase 1 no baste

Cuando quieras:

- Guardar / elegir archivos con el **selector nativo** y rutas más predecibles.
- **Compartir** la copia (AirDrop, Drive, correo) desde la app.
- Opcional: publicar en **App Store** / **Google Play** (cuentas de desarrollador, revisión en Apple).

Pasos de alto nivel (sin implementar aquí):

1. Añadir **Capacitor** al proyecto; `webDir` apuntando al build estático (o la carpeta que ya sirves).
2. Plugins típicos: **@capacitor/filesystem**, **@capacitor/share** (y si hace falta **Filesystem** con permisos de documentos).
3. Sustituir o complementar el flujo actual de export/import: mismo JSON (`hidrocultivoBackup` + `main` + `extraKeys`), pero leyendo/escribiendo vía API nativa donde proceda.
4. Mantener **una sola función** de validación/aplicación del backup en JS compartido entre web y shell.

---

## Notas

- Los datos siguen siendo **locales** salvo que tú exportes y copies el archivo tú mismo; ninguna fase sustituye tus propias copias de seguridad.
- Para decidir **Fase 2**, usa el checklist de fricción de la Fase 1 en un **iPhone real** con la URL publicada.

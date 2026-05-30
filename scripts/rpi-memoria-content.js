/**
 * Textos de la memoria técnica (secciones 2–7 y anexos).
 * Compartido por generate-registro-pdf*.js
 */
const D = require('./rpi-memoria-data');

function fechaDepositoTexto() {
  return D.fechaDeposito || '[completar el día de presentación en sede]';
}

function descripcionResumidaFormulario() {
  return (
    `Programa de ordenador denominado ${D.titulo} (versión ${D.version}), desarrollado por ${D.autor} (NIF ${D.nif}) ` +
    'en JavaScript, HTML y CSS, distribuido como PWA y aplicación Android (Capacitor). ' +
    'Gestión hidropónica: configuración de instalaciones (torre vertical, NFT, DWC, RDWC, SRF), ' +
    'cálculos orientativos de volumen y equipos, diagramas, checklist de recarga, mediciones, ' +
    'historial, calendario, meteo de referencia y recomendaciones contextuales por cultivo/fase/nutriente.'
  );
}

const secciones = {
  objeto: [
    `${D.titulo} es una aplicación software orientada a la gestión integral de cultivos hidropónicos, con foco en el seguimiento técnico del sistema, la toma de decisiones operativas y la trazabilidad de tareas de mantenimiento.`,
    'Su finalidad es asistir al usuario en la configuración del sistema de cultivo, control de parámetros de solución nutritiva (EC, pH, temperatura, volumen), planificación de recargas, seguimiento de fases de cultivo y consulta técnica contextualizada, con datos almacenados principalmente en el dispositivo del usuario.',
  ],
  funcional: [
    'Asistente de configuración inicial y por sistema: torre vertical, NFT (incl. mesa multinivel y disposiciones), DWC, RDWC y SRF (raíz flotante).',
    'Gestión de cultivos por posición (cesta, maceta o hueco), con variedad, fechas, notas y fotos locales.',
    'Diagramas e ilustraciones SVG del sistema configurado (depósito, bombeo, aireación, rejilla).',
    'Registro de mediciones (EC, pH, temperatura, volumen) e historial operativo.',
    'Checklist guiado de recarga completa vinculado al sistema activo.',
    'Calendario e historial de eventos; exportación e importación de copia de seguridad del estado.',
    'Motor de recomendaciones por cultivo, fase y nutriente (vegetativo/floración, coherencia y avisos).',
    'Sección de consejos técnicos por categorías; referencia meteorológica por ubicación (servicios en línea cuando el usuario consulta).',
    'Versión Android nativa mediante Capacitor (compartir/importar estado con APIs del sistema).',
  ],
  tecnologias: [
    'JavaScript (lógica de negocio, cálculos y reglas de recomendación).',
    'HTML (estructura de interfaz).',
    'CSS (presentación y diseño visual).',
    'PWA y Service Worker (instalación en navegador y caché de recursos).',
    'Capacitor 6 (empaquetado Android; plugins Filesystem, Share y biometría opcional).',
    'Generación de diagramas e ilustraciones en SVG integradas en la aplicación.',
  ],
  arquitectura:
    'La aplicación sigue una arquitectura frontend modular, con separación por áreas (configuración/sistema, mediciones, historial, calendario, consejos, checklist y asistente de onboarding). El estado operativo del usuario se gestiona de forma local (almacenamiento del navegador o WebView), con sincronización interna entre módulos. Los módulos de diagrama y cálculo hidráulico son específicos por tipo de instalación.',
  originalidad: [
    'La originalidad de la obra se fundamenta en la integración de reglas agronómicas y operativas en flujos de uso práctico (recarga, mediciones, configuración por geometría real del cultivo), y en la coordinación entre asistente, diagrama, calendario y checklist.',
    'La aportación propia incluye avisos contextuales según cultivo, fase y nutriente, trazabilidad explicativa en interfaz, y modelado visual coherente por familia de sistemas hidropónicos (torre, NFT, DWC, RDWC, SRF).',
  ],
  deposito: [
    `Código fuente y recursos de la aplicación (versión ${D.version}).`,
    'Estructura de interfaz, hojas de estilo y lógica funcional integrada.',
    'Módulos de diagramas, asistente de configuración y reglas de recomendación.',
    'Memoria técnica y documentación de apoyo aportada por el autor.',
    'Capturas representativas de la interfaz (ejemplar visual).',
  ],
  declaracionAutoria: `Yo, ${D.autor}, con NIF ${D.nif}, manifiesto ser autor y titular de los derechos de explotación de la obra software "${D.titulo}", versión ${D.version}, aportada a efectos de su inscripción en el Registro de la Propiedad Intelectual.`,
  anexoDocumentos: [
    'Exportación representativa del código y recursos (carpeta fuente-representativa o ZIP).',
    'Capturas de pantalla: Inicio, asistente, Cultivo e instalación, checklist de recarga, mediciones/historial, Consejos.',
    'Memoria técnica firmada (este documento).',
    'Identificación de la versión y del paquete Android (appId) cuando aplique.',
  ],
  anexoTerceros: [
    'Capacitor y plugins oficiales (@capacitor/core, filesystem, share) — licencias open source.',
    'Plugin de biometría (@capgo/capacitor-native-biometric) — licencia del proveedor.',
    'Fuentes tipográficas servidas (Google Fonts) — según sus licencias.',
    'Servicios de geocodificación inversa (Nominatim/OpenStreetMap) y APIs meteorológicas consultadas bajo demanda — no integradas como obra del autor.',
    'El autor declara ser titular de la selección, estructura, textos, reglas de negocio e interfaz propia; las librerías de terceros se usan como componentes auxiliares.',
  ],
  notaVersion: `La versión objeto de depósito corresponde a ${D.titulo} v${D.version} (${D.versionSemver}), identificada por su estado funcional y documental a fecha ${D.fechaObra}.`,
  justificacionEjecutable: [
    'No se aporta un fichero ejecutable autocontenido (.exe ni APK/AAB) como ejemplar separado.',
    `La obra se ejecuta como aplicación web progresiva (PWA) mediante el código fuente depositado (HTML, JavaScript, CSS) y, opcionalmente, como cliente Android (${D.appId}) empaquetado con Capacitor a partir del mismo código.`,
    'El binario Android depende del entorno de compilación del titular; la identificación del programa queda cubierta por el código fuente, la presente memoria y las capturas de la interfaz en funcionamiento.',
  ],
};

module.exports = {
  D,
  fechaDepositoTexto,
  descripcionResumidaFormulario,
  secciones,
};

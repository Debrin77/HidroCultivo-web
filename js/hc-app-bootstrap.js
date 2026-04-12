/**
 * Arranque de la app: config, estado local, backup/import, PIN, onboarding, initApp, navegación (goTab).
 * Debe cargarse después de cultivos-db, state-torre-logic, ui-tabs, meteo-alarm-* y antes de torre-render.js.
 */
// ══════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzhqlYED_glpvCQQC-ZhCHKiwrzcuyvKUYbvfd_F6X8IpVD9x6dmudRcfKWfPs4pPC/exec';

/** Aviso si falla el envío opcional a Google Sheets (datos locales ya guardados). */
function hcSheetsNotifyFailure() {
  try {
    if (typeof showToast === 'function') {
      showToast('Sin conexión o error al enviar a la hoja. Los datos siguen en este dispositivo.', true);
    }
  } catch (_) {}
}

/**
 * POST a Apps Script (no-cors: no se lee respuesta). Offline o fallo de red → toast.
 * @returns {Promise<boolean>} true si se lanzó fetch sin throw
 */
async function hcPostSheets(payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    hcSheetsNotifyFailure();
    return false;
  }
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    return true;
  } catch (e) {
    console.error('HidroCultivo Sheets:', e);
    hcSheetsNotifyFailure();
    return false;
  }
}

const PIN = '2506';
const AUTH_REMEMBER_MIN_KEY = 'hc_auth_remember_min';
const AUTH_TS_KEY = 'hc_auth';
const STORAGE_KEY = 'cultiva_v1';
const APP_BUILD_VERSION = '2026-04-09-riego-horario-hint';
const APP_BUILD_VERSION_KEY = 'hc_app_build_version';
const AUTO_RESTORE_POINT_KEY = 'hc_auto_restore_point_v1';
const AUTO_RESTORE_POINT_TRANSITION_KEY = 'hc_auto_restore_transition_v1';
/** Tutorial contextual “Asignar cultivo” (1 = usuario pidió no volver a mostrar) */
const TUTORIAL_ASIGNAR_LS = 'cultiva_tutorial_asignar_v1';
const TUTORIAL_EDITAR_LS = 'cultiva_tutorial_editar_v1';
/** Bienvenida pestaña Torre (1 = ya no auto-mostrar al entrar en Torre) */
const TUTORIAL_TORRE_TAB_LS = 'cultiva_tutorial_torre_pestana_v1';
/** Ocultar texto “desliza para girar” tras primera interacción con el esquema */
const TORRE_SWIPE_HINT_LS = 'cultiva_torre_swipe_hint_v1';

// Torre: 5 niveles, 5 cestas cada uno
// Niveles activos: 1, 3 y 5 (índice 0, 2, 4)
const NIVELES_ACTIVOS = [0, 2, 4];
const NUM_NIVELES = 5;
const NUM_CESTAS = 5;

// CULTIVOS_DB — ver js/cultivos-db.js
/**
 * Icono en UI = emoji de CULTIVOS_DB. Texto en listas = cultivoNombreLista (abrev · nombre si hay abrev).
 */
function escOptionHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escHtmlUi(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Etiqueta en listas/selects/torre; state.variedad sigue siendo el nombre canónico (sin prefijo). */
function cultivoNombreLista(cultivo, variedadGuardada) {
  if (cultivo && cultivo.abrev) return cultivo.abrev + ' · ' + cultivo.nombre;
  if (cultivo) return cultivo.nombre;
  const v = variedadGuardada != null ? String(variedadGuardada).trim() : '';
  return v || '—';
}

function cultivoEmoji(cultivo) {
  if (!cultivo) return '⚪';
  return cultivo.emoji || '🌱';
}

/** @param {object|null} cultivo fila CULTIVOS_DB; @param {number} [fontRem] tamaño relativo en rem */
function cultivoEmojiHtml(cultivo, fontRem) {
  const em = cultivoEmoji(cultivo);
  if (!fontRem) return '<span class="cultivo-emoji-mark" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.05) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--105" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.35) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--135" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.4) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--140" aria-hidden="true">' + em + '</span>';
  if (fontRem === 1.5) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--150" aria-hidden="true">' + em + '</span>';
  return '<span class="cultivo-emoji-mark" aria-hidden="true" style="--cultivo-emoji-rem:' + fontRem + 'rem">' + em + '</span>';
}

const GRUPO_EMOJI_REP = {
  lechugas: '🥬', hojas: '🌿', asiaticas: '🍃', hierbas: '🌿', fresas: '🍓',
  frutos: '🍅', raices: '🥕', microgreens: '🌱',
};

function grupoEmojiHtml(grupoKey) {
  const em = GRUPO_EMOJI_REP[grupoKey] || '🌱';
  return '<span class="setup-grupo-icon" aria-hidden="true">' + em + '</span>';
}

function refEcPhRowEmojiHtml(row) {
  const s = String(row.cultivo || '');
  const byId = function(id) {
    const c = id ? CULTIVOS_DB.find(x => x.id === id) : null;
    if (!c) return '<span class="cultivo-emoji-mark cultivo-emoji-mark--135" aria-hidden="true">🌱</span>';
    return cultivoEmojiHtml(c, 1.35);
  };
  if (/Tomate/i.test(s)) return byId('tomate');
  if (/Pimiento|berenjena/i.test(s)) return byId('pimiento');
  if (/Pepino/i.test(s)) return byId('pepino');
  if (/Judía|guisante/i.test(s)) return byId('microgreens_mezcla');
  if (/Fresa|fresón/i.test(s)) return byId('fresa');
  if (/Brócoli|coliflor/i.test(s)) return byId('col_rizada');
  if (/Zanahoria|microverdura/i.test(s)) return byId('zanahoria');
  if (/Melón|sandía/i.test(s)) return byId('calabacin');
  /* Flores de corte: icono de flores, no lavanda (💜) */
  if (/Flores/i.test(s)) {
    return '<span class="cultivo-emoji-mark cultivo-emoji-mark--135" aria-hidden="true">🌸</span>';
  }
  if (/Cilantro|eneldo/i.test(s)) return byId('cilantro');
  if (/Albahaca|menta|perejil/i.test(s)) return byId('albahaca');
  if (/Lechuga/i.test(s)) return byId('romana');
  if (/Espinaca|acelga|kale/i.test(s)) return byId('espinaca');
  /* Una sola fila mezcla rúcula + canónigos + mostaza: hoja (🌿), nunca chile */
  if (/Rúcula|canónig|canonigo|mostaza/i.test(s)) return byId('rucula');
  return byId(null);
}

// Grupos con colores y compatibilidad
const GRUPOS_CULTIVO = {
  lechugas:    { nombre:'Lechugas',           color:'#22c55e', ec:'800-1400',   ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='lechugas').map(c=>c.nombre),
    nota:'Perfectamente compatibles entre sí. El cultivo más fácil en hidroponía.' },
  hojas:       { nombre:'Hojas verdes',        color:'#84cc16', ec:'1200-2300',  ph:'6.0-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='hojas').map(c=>c.nombre),
    nota:'Rango EC variable. Espinaca y acelga necesitan EC más alta que rúcula.' },
  asiaticas:   { nombre:'Asiáticas / Mostaza', color:'#60a5fa', ec:'1200-2500',  ph:'5.5-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='asiaticas').map(c=>c.nombre),
    nota:'Mizuna y komatsuna compatibles con lechugas. Pak choi y menta necesitan torre separada.' },
  hierbas:     { nombre:'Hierbas aromáticas',  color:'#f59e0b', ec:'800-2400',   ph:'5.5-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='hierbas').map(c=>c.nombre),
    nota:'Rango EC muy variable. Menta y orégano incompatibles con lechugas. Albahaca sí.' },
  frutos:      { nombre:'Frutos',              color:'#f97316', ec:'1500-3500',  ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='frutos').map(c=>c.nombre),
    nota:'EC incompatible con lechugas. Sistema dedicado obligatorio. Requieren polinización.' },
  fresas:      { nombre:'Fresas',              color:'#f43f5e', ec:'1500-2500',  ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='fresas').map(c=>c.nombre),
    nota:'Compatibles con lechugas en fase vegetativa. EC aumenta en fructificación.' },
  raices:      { nombre:'Raíces',              color:'#a78bfa', ec:'1600-2200',  ph:'6.0-7.0',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='raices').map(c=>c.nombre),
    nota:'Necesitan sustrato profundo. Difíciles en torres verticales estándar.' },
  microgreens: { nombre:'Microgreens',         color:'#2dd4bf', ec:'800-1600',   ph:'5.5-6.5',
    plantas: CULTIVOS_DB.filter(c=>c.grupo==='microgreens').map(c=>c.nombre),
    nota:'Sin nutrientes los primeros días. Cosecha muy rápida (7-14 días).' },
};

// Compatibilidad: grupos que SÍ pueden compartir depósito
const COMPAT_MATRIZ = {
  lechugas:   ['lechugas','asiaticas','hierbas'], // albahaca ok, menta no
  asiaticas:  ['lechugas','asiaticas'],
  hojas:      ['hojas'],
  hierbas:    ['lechugas'],  // solo algunas
  frutos:     ['frutos'],
  fresas:     ['fresas','lechugas'],
  raices:     ['raices'],
  microgreens:['microgreens'],
};

// ALIAS por compatibilidad con código anterior (GRUPOS_CULTIVO keys A,B,C,D)
const GRUPOS_CULTIVO_OLD = {
  A: GRUPOS_CULTIVO.lechugas,
  B: GRUPOS_CULTIVO.asiaticas,
  C: GRUPOS_CULTIVO.hojas,
  D: GRUPOS_CULTIVO.hierbas,
};

// DIAS_COSECHA — definido después de CULTIVOS_DB
const DIAS_COSECHA = Object.fromEntries(
  CULTIVOS_DB.map(c => [c.nombre, c.dias])
);
DIAS_COSECHA['Pak Choi'] = 40;
DIAS_COSECHA['Bok Choy'] = 40;

// Compatibilidad entre grupos (qué mezclar y qué no)
const COMPATIBILIDAD = {
  'A-A': { ok: true,  icono: '✅', texto: 'Perfectamente compatibles' },
  'A-B': { ok: true,  icono: '✅', texto: 'Compatibles — mismo depósito' },
  'A-C': { ok: true,  icono: '⚠️', texto: 'Compatibles pero ajustar EC a 1400' },
  'A-D': { ok: true,  icono: '✅', texto: 'Compatibles — albahaca protege de plagas' },
  'B-B': { ok: true,  icono: '✅', texto: 'Perfectamente compatibles' },
  'B-C': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'B-D': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'C-C': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'C-D': { ok: true,  icono: '✅', texto: 'Compatibles' },
  'D-D': { ok: true,  icono: '⚠️', texto: 'Compatibles — evitar mezclar menta con perejil' },
};

// Número de niveles activos según modo cultivo
const MODOS_CULTIVO = {
  lechuga:   { niveles: [0,2,4], nombre: 'Lechugas (3 niveles)', desc: 'Óptimo para EC 1300-1400 µS/cm' },
  intensivo: { niveles: [0,1,2,3,4], nombre: 'Intensivo (5 niveles)', desc: 'Solo hojas verdes compatibles' },
  mixto:     { niveles: [0,2,4], nombre: 'Mixto (3 niveles)', desc: 'Lechugas + asiáticas + hierbas' },
  mini:      { niveles: [0,2], nombre: 'Compacto (2 niveles)', desc: 'Producción reducida o plántulas' },
};

// ══════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════
// Variables globales — declaradas ANTES de loadState
let currentTab = 'inicio';
let editingCesta = null;
/** 'editar' = abrir ficha · 'asignar' = colocar cultivo en cestas (tras elegirlo) */
let torreInteraccionModo = 'editar';
/** false = por defecto: marcar varias cestas y «Aplicar a selección». true = cada toque aplica ya. */
let torreAsignarInstantaneo = false;
let torreCestasMultiSel = new Set();
let modoActual = 'lechuga';
let state = null; // se inicializa después

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Validar que tiene estructura correcta
      if (!s.torre || !Array.isArray(s.torre)) {
        console.warn('State corrupto — reiniciando');
        return initState();
      }
      // Asegurar que torre tiene la estructura correcta (5 niveles x 5 cestas)
      while (s.torre.length < NUM_NIVELES) {
        s.torre.push(Array(NUM_CESTAS).fill({ variedad:'', fecha:'', notas:'' }));
      }
      s.torre.forEach((nivel, n) => {
        while (nivel.length < NUM_CESTAS) nivel.push({ variedad:'', fecha:'', notas:'' });
      });
      if (s.modo) modoActual = s.modo;
      console.log('Estado cargado:', s.torre.flat().filter(c => c.variedad).length, 'plantas');
      return s;
    }
  } catch(e) { console.error('Error loading state:', e); }
  console.log('Estado nuevo inicializado');
  return initState();
}

// Inicializar state DESPUÉS de declarar todas las variables
state = loadState();

function initState() {
  const torre = [];
  for (let n = 0; n < NUM_NIVELES; n++) {
    torre.push([]);
    for (let c = 0; c < NUM_CESTAS; c++) {
      torre[n].push({ variedad: '', fecha: '', notas: '' });
    }
  }
  return {
    torre,
    modo: 'lechuga',
    ultimaMedicion: null,
    ultimaRecarga: null,
    /** epoch ms — oculta aviso urgente de recarga hasta esa hora */
    recargaSnoozeHasta: null,
    configAgua: 'destilada',
    configSustrato: 'esponja'
  };
}

function saveState() {
  try {
    // Multi-torre: la copia en state.torres[idx] es la que se rehidrata al abrir la app.
    // Sin esto, guardar solo state.torre (p. ej. tras editar una cesta) deja el slot obsoleto
    // y al recargar cargarEstadoTorre() sobrescribe la torre vacía → desaparecen plantas y el Diario.
    if (state && state.torres && state.torres.length > 0) {
      guardarEstadoTorreActual();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Verificar que se guardó correctamente
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) console.error('Error: estado no guardado en localStorage');
  } catch(e) {
    console.error('Error saving state:', e);
    // Si falla por cuota, intentar limpiar datos antiguos
    if (e.name === 'QuotaExceededError') {
      try {
        // Liberar espacio: eliminar base64 pesados del state (las fotos YA están en IndexedDB)
        compactarStateFotos();
        localStorage.removeItem('hc_auth');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch(e2) { console.error('No se pudo guardar:', e2); }
    }
  }
}

function compactarStateFotos() {
  try {
    // Cestas: dejar solo keys (fotoKeys) y máximo 1 thumbnail con data
    for (let n = 0; n < (state.torre || []).length; n++) {
      for (let c = 0; c < (state.torre[n] || []).length; c++) {
        const cesta = state.torre[n][c];
        if (!cesta) continue;
        if (Array.isArray(cesta.fotos) && cesta.fotos.length > 0) {
          // Asegurar fotoKeys
          if (!Array.isArray(cesta.fotoKeys)) cesta.fotoKeys = [];
          cesta.fotos.forEach(f => { if (f?.key && !cesta.fotoKeys.includes(f.key)) cesta.fotoKeys.push(f.key); });
          // Mantener solo la última con data (si existe), el resto sin data
          let lastWithData = null;
          for (let i = cesta.fotos.length - 1; i >= 0; i--) {
            if (cesta.fotos[i]?.data) { lastWithData = cesta.fotos[i]; break; }
          }
          cesta.fotos = lastWithData ? [{ ...lastWithData, data: lastWithData.data }] : [];
        }
      }
    }

    // Registro: eliminar fotoData base64, mantener fotoKey
    if (Array.isArray(state.registro)) {
      state.registro.forEach(e => {
        if (e && e.tipo === 'foto' && e.fotoData) delete e.fotoData;
        if (e && e.tipo === 'foto_sistema' && e.fotoData) delete e.fotoData;
      });
    }
    if (state.fotosSistemaCompleto && Array.isArray(state.fotosSistemaCompleto.fotos)) {
      const arr = state.fotosSistemaCompleto.fotos;
      let lastWithData = null;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i]?.data) {
          lastWithData = arr[i];
          break;
        }
      }
      state.fotosSistemaCompleto.fotos = lastWithData
        ? [{ ...lastWithData, data: lastWithData.data }]
        : [];
    }
  } catch(_) {}
}

/** Claves opcionales de localStorage que acompañan al estado principal */
const LOCALSTORAGE_EXTRA_BACKUP_KEYS = [
  'hc_auth',
  AUTH_REMEMBER_MIN_KEY,
  TUTORIAL_ASIGNAR_LS,
  TUTORIAL_EDITAR_LS,
  TUTORIAL_TORRE_TAB_LS,
  TORRE_SWIPE_HINT_LS,
];

function crearPuntoRestauracionLocal(opts = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length < 2) return false;
    JSON.parse(raw);
    const extraKeys = {};
    LOCALSTORAGE_EXTRA_BACKUP_KEYS.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (v != null && v !== '') extraKeys[k] = v;
      } catch (_) {}
    });
    const snapshot = {
      hidrocultivoAutoRestore: true,
      capturedAt: new Date().toISOString(),
      reason: opts.reason || 'version-change',
      fromVersion: opts.fromVersion || null,
      toVersion: opts.toVersion || APP_BUILD_VERSION,
      main: raw,
      extraKeys,
    };
    localStorage.setItem(AUTO_RESTORE_POINT_KEY, JSON.stringify(snapshot));
    if (opts.fromVersion || opts.toVersion) {
      localStorage.setItem(
        AUTO_RESTORE_POINT_TRANSITION_KEY,
        String((opts.fromVersion || 'none') + '->' + (opts.toVersion || APP_BUILD_VERSION))
      );
    }
    return true;
  } catch (_) {
    return false;
  }
}

function gestionarCambioVersionEnArranque() {
  try {
    const prev = localStorage.getItem(APP_BUILD_VERSION_KEY) || '';
    if (prev === APP_BUILD_VERSION) return;

    const transition = String((prev || 'none') + '->' + APP_BUILD_VERSION);
    const yaGuardada = localStorage.getItem(AUTO_RESTORE_POINT_TRANSITION_KEY) === transition;
    if (!yaGuardada) {
      crearPuntoRestauracionLocal({ reason: 'before-version-upgrade', fromVersion: prev || null, toVersion: APP_BUILD_VERSION });
    }

    localStorage.setItem(APP_BUILD_VERSION_KEY, APP_BUILD_VERSION);
    showToast('ℹ️ Nueva versión detectada. Recomendado: Exportar copia de seguridad ahora.');
  } catch (_) {}
}

async function exportarEstadoHidroCultivo() {
  try {
    if (state && state.torres && state.torres.length > 0) guardarEstadoTorreActual();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length < 2) {
      showToast('No hay datos que exportar', true);
      return;
    }
    JSON.parse(raw);
    const extraKeys = {};
    LOCALSTORAGE_EXTRA_BACKUP_KEYS.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (v != null && v !== '') extraKeys[k] = v;
      } catch (e) {}
    });
    const bundle = {
      hidrocultivoBackup: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'HidroCultivo',
      main: raw,
      extraKeys,
    };
    const json = JSON.stringify(bundle, null, 2);
    const fname = 'hidrocultivo-backup-' + new Date().toISOString().slice(0, 10) + '.json';

    const cap = window.hcCapacitorBackup;
    if (cap && typeof cap.isNative === 'function' && typeof cap.exportAndShare === 'function') {
      try {
        if (await cap.isNative()) {
          await cap.exportAndShare(json, fname);
          showToast('✅ Copia lista (todas las instalaciones) — elige dónde guardarla o compartir');
          return;
        }
      } catch (e) {
        showToast('Compartir (nativo): ' + (e && e.message ? e.message : e) + ' — probando descarga', true);
      }
    }

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = fname;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Copia descargada — incluye todas las instalaciones; guárdala en un lugar seguro');
  } catch (e) {
    showToast('Error al exportar: ' + (e && e.message ? e.message : e), true);
  }
}

function importarEstadoHidroCultivoClick() {
  const el = document.getElementById('inputImportEstado');
  if (!el) return;
  try {
    if (typeof el.showPicker === 'function') {
      el.showPicker();
      return;
    }
  } catch (e) {}
  el.click();
}

async function onImportEstadoFileSelected(ev) {
  const input = ev.target;
  const f = input && input.files && input.files[0];
  if (input) input.value = '';
  if (!f) return;
  try {
    const text = await f.text();
    const parsed = JSON.parse(text);
    let mainStr = null;
    if (parsed && parsed.hidrocultivoBackup === true && typeof parsed.main === 'string') {
      mainStr = parsed.main;
    } else if (parsed && Array.isArray(parsed.torre)) {
      mainStr = JSON.stringify(parsed);
    }
    if (!mainStr) {
      showToast('Archivo no reconocido (usa una copia exportada desde esta app o el JSON completo del estado)', true);
      return;
    }
    JSON.parse(mainStr);
    if (!confirm('Se reemplazará todo el estado actual en este navegador (todas las instalaciones, mediciones y ajustes) por la copia. ¿Continuar?')) return;
    if (!confirm('Segunda confirmación — no se puede deshacer.')) return;
    localStorage.setItem(STORAGE_KEY, mainStr);
    if (parsed.extraKeys && typeof parsed.extraKeys === 'object') {
      Object.keys(parsed.extraKeys).forEach((k) => {
        try {
          const v = parsed.extraKeys[k];
          if (v != null && String(v) !== '') localStorage.setItem(k, String(v));
        } catch (e2) {}
      });
    }
    showToast('✅ Copia importada — recargando…');
    setTimeout(() => { location.reload(); }, 500);
  } catch (e) {
    showToast('Error al importar: ' + (e && e.message ? e.message : e), true);
  }
}

function restaurarPuntoAutomaticoLocal() {
  try {
    const raw = localStorage.getItem(AUTO_RESTORE_POINT_KEY);
    if (!raw) {
      showToast('No hay punto automático disponible en este dispositivo', true);
      return;
    }
    const snap = JSON.parse(raw);
    if (!snap || !snap.main || typeof snap.main !== 'string') {
      showToast('Punto automático inválido', true);
      return;
    }
    JSON.parse(snap.main);
    const fecha = snap.capturedAt ? new Date(snap.capturedAt).toLocaleString() : 'fecha desconocida';
    if (!confirm('Se restaurará el último punto automático local (' + fecha + '). ¿Continuar?')) return;
    if (!confirm('Segunda confirmación — reemplazará el estado actual.')) return;
    localStorage.setItem(STORAGE_KEY, snap.main);
    if (snap.extraKeys && typeof snap.extraKeys === 'object') {
      Object.keys(snap.extraKeys).forEach((k) => {
        try {
          const v = snap.extraKeys[k];
          if (v != null && String(v) !== '') localStorage.setItem(k, String(v));
        } catch (_) {}
      });
    }
    showToast('✅ Punto automático restaurado — recargando…');
    setTimeout(() => location.reload(), 500);
  } catch (e) {
    showToast('No se pudo restaurar el punto automático: ' + (e && e.message ? e.message : e), true);
  }
}

// ══════════════════════════════════════════════════
// PIN
// ══════════════════════════════════════════════════
let pinEntry = '';
let appBootstrapped = false;

function getAuthRememberMinutes() {
  try {
    const raw = localStorage.getItem(AUTH_REMEMBER_MIN_KEY);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  } catch (_) {
    return 0;
  }
}

function onAuthRememberChange(v) {
  const n = Math.max(0, Number(v) || 0);
  try {
    localStorage.setItem(AUTH_REMEMBER_MIN_KEY, String(n));
    if (n === 0) localStorage.removeItem(AUTH_TS_KEY);
  } catch (_) {}
  showToast(n === 0 ? 'Autenticación: siempre al abrir' : `Autenticación: recordar ${n} min`);
}

function forzarReautenticacion() {
  try {
    localStorage.removeItem(AUTH_TS_KEY);
  } catch (_) {}
  showToast('Sesión cerrada. Vuelve a autenticarte.');
  setTimeout(() => location.reload(), 250);
}

function toggleSeguridadAccesoInicio() {
  const p = document.getElementById('panelSeguridadAccesoInicio');
  const b = document.getElementById('btnSeguridadAccesoInicio');
  if (!p || !b) return;
  p.classList.toggle('setup-hidden');
  const isOpen = !p.classList.contains('setup-hidden');
  b.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  p.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function hasValidAuthSession() {
  try {
    const rememberMin = getAuthRememberMinutes();
    if (rememberMin <= 0) return false;
    const authTs = Number(localStorage.getItem(AUTH_TS_KEY) || 0);
    if (!Number.isFinite(authTs) || authTs <= 0) return false;
    const maxAge = rememberMin * 60 * 1000;
    return (Date.now() - authTs) < maxAge;
  } catch (_) {
    return false;
  }
}

function unlockAndInitApp() {
  if (appBootstrapped) return;
  const pinEl = document.getElementById('pinScreen');
  const appEl = document.getElementById('app');
  try {
    a11yDetachFocusTrap(pinEl);
    if (appEl) appEl.inert = false;
    if (pinEl) pinEl.style.display = 'none';
    if (getAuthRememberMinutes() > 0) localStorage.setItem(AUTH_TS_KEY, String(Date.now()));
    else localStorage.removeItem(AUTH_TS_KEY);
    initApp();
    appBootstrapped = true;
  } catch (e) {
    console.error('Error inicializando app tras PIN:', e);
    appBootstrapped = false;
    if (appEl) appEl.inert = true;
    if (pinEl) {
      pinEl.style.display = '';
      a11yAttachFocusTrap(pinEl);
    }
    const pinErr = document.getElementById('pinErr');
    if (pinErr) pinErr.textContent = 'No se pudo abrir la app. Reintenta.';
    showToast('Error al iniciar tras PIN. Reintentando…', true);
  }
}

function lockAppWithPin() {
  const appEl = document.getElementById('app');
  const pinEl = document.getElementById('pinScreen');
  const statusEl = document.getElementById('pinAuthStatus');
  if (appEl) appEl.inert = true;
  if (statusEl) statusEl.textContent = '';
  if (pinEl) {
    pinEl.style.display = '';
    a11yAttachFocusTrap(pinEl);
    requestAnimationFrame(() => {
      try { pinEl.focus(); } catch (_) {}
    });
  }
}

async function tryBiometricUnlock() {
  try {
    const cap = window.Capacitor;
    const statusEl = document.getElementById('pinAuthStatus');
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return false;
    const biom = cap.Plugins && cap.Plugins.NativeBiometric;
    if (!biom) return false;

    const availability = await biom.isAvailable();
    if (!availability || !availability.isAvailable) return false;
    if (statusEl) statusEl.textContent = 'Intentando desbloqueo biométrico…';

    await biom.verifyIdentity({
      reason: 'Desbloquear HidroCultivo',
      title: 'Identificación biométrica',
      subtitle: 'Usa la biometría de tu dispositivo',
      description: 'Si cancelas, podrás entrar con PIN',
    });
    return true;
  } catch (_) {
    return false;
  }
}

function pinPress(d) {
  if (pinEntry.length >= 4) return;
  pinEntry += d;
  updatePinDots();
  if (pinEntry.length === 4) setTimeout(checkPin, 180);
}

function pinDel() {
  pinEntry = pinEntry.slice(0, -1);
  updatePinDots();
  document.getElementById('pinErr').textContent = '';
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById('d' + i);
    d.className = 'pin-dot' + (i < pinEntry.length ? ' on' : '');
  }
}

function checkPin() {
  if (pinEntry === PIN) {
    pinEntry = '';
    updatePinDots();
    unlockAndInitApp();
  } else {
    for (let i = 0; i < 4; i++) document.getElementById('d' + i).className = 'pin-dot err';
    document.getElementById('pinErr').textContent = 'PIN incorrecto';
    setTimeout(() => { pinEntry = ''; updatePinDots(); document.getElementById('pinErr').textContent = ''; }, 1000);
  }
}

// ══════════════════════════════════════════════════
// ONBOARDING — guía primer día + hints de contexto (PRP / revelación progresiva)
// ══════════════════════════════════════════════════
const HC_GUIDE_DISMISS_KEY = 'hc_guia_primer_dia_dismiss';
const HC_ONBOARD_RIEGO_VISIT_KEY = 'hc_onboarding_visit_riego';
const HC_HINT_CTX = { mediciones: 'hc_hint_ctx_med', sistema: 'hc_hint_ctx_sis', riego: 'hc_hint_ctx_riego' };
const HC_BIENVENIDA_KEY = 'hc_bienvenida_v2026_1';

function syncGuiaPrimerosPasosPorPestana() {
  const root = document.getElementById('guiaPrimerosPasos');
  if (!root) return;
  const onInicio = currentTab === 'inicio';
  if (!onInicio) {
    root.setAttribute('hidden', '');
    root.setAttribute('aria-hidden', 'true');
  } else {
    root.removeAttribute('hidden');
    root.setAttribute('aria-hidden', root.classList.contains('setup-hidden') ? 'true' : 'false');
  }
}

function lanzarSetupOChecklistSiCorresponde() {
  const hayConfig = !!state.configTorre;
  const hayPlantas = getNivelesActivos().some(n =>
    state.torre[n] && state.torre[n].some(c => c.variedad)
  );
  const esPrimeraVez = !hayConfig && !state.ultimaRecarga && !state.ultimaMedicion && !hayPlantas;
  if (esPrimeraVez) {
    setTimeout(() => abrirSetup(), 450);
  } else if (hayConfig && !state.ultimaRecarga && !state.ultimaMedicion && !hayPlantas) {
    setTimeout(() => abrirChecklist(true), 450);
  }
}

function mostrarBienvenidaOContinuarArranque() {
  let visto = false;
  try { visto = localStorage.getItem(HC_BIENVENIDA_KEY) === '1'; } catch (_) {}
  if (visto) {
    lanzarSetupOChecklistSiCorresponde();
    return;
  }
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.remove('setup-hidden');
    ov.setAttribute('aria-hidden', 'false');
    try { document.body.classList.add('hc-welcome-open'); } catch (_) {}
    return;
  }
  lanzarSetupOChecklistSiCorresponde();
}

function cerrarBienvenidaPrimeraVez() {
  try { localStorage.setItem(HC_BIENVENIDA_KEY, '1'); } catch (_) {}
  const ov = document.getElementById('welcomeOverlay');
  if (ov) {
    ov.classList.add('setup-hidden');
    ov.setAttribute('aria-hidden', 'true');
  }
  try { document.body.classList.remove('hc-welcome-open'); } catch (_) {}
  lanzarSetupOChecklistSiCorresponde();
}

function dismissGuiaPrimerosPasos() {
  try { localStorage.setItem(HC_GUIDE_DISMISS_KEY, '1'); } catch (_) {}
  const el = document.getElementById('guiaPrimerosPasos');
  if (el) el.classList.add('setup-hidden');
  try { syncGuiaPrimerosPasosPorPestana(); } catch (_) {}
}

function marcarVisitaRiegoOnboarding() {
  try { localStorage.setItem(HC_ONBOARD_RIEGO_VISIT_KEY, '1'); } catch (_) {}
  actualizarGuiaPrimerosPasos();
}

function actualizarGuiaPrimerosPasos() {
  const root = document.getElementById('guiaPrimerosPasos');
  if (!root) return;
  try {
    let dismissed = false;
    try { dismissed = localStorage.getItem(HC_GUIDE_DISMISS_KEY) === '1'; } catch (_) {}
    if (dismissed) {
      root.classList.add('setup-hidden');
      return;
    }
    const hayCfg = !!(state && state.configTorre);
    const hayMed = !!(state && state.ultimaMedicion);
    let visitRiego = false;
    try { visitRiego = localStorage.getItem(HC_ONBOARD_RIEGO_VISIT_KEY) === '1'; } catch (_) {}
    if (hayCfg && hayMed && visitRiego) {
      root.classList.add('setup-hidden');
      return;
    }
    root.classList.remove('setup-hidden');

    const p1 = document.getElementById('guiaPaso1');
    const p2 = document.getElementById('guiaPaso2');
    const p3 = document.getElementById('guiaPaso3');
    if (p1) p1.classList.toggle('hc-guia-step--done', hayCfg);
    if (p2) p2.classList.toggle('hc-guia-step--done', hayMed);
    if (p3) p3.classList.toggle('hc-guia-step--done', visitRiego);

    const b1 = document.getElementById('guiaBtnPaso1');
    if (b1) {
      b1.disabled = hayCfg;
      b1.textContent = hayCfg ? 'Listo' : 'Abrir asistente';
      b1.classList.toggle('btn-primary', !hayCfg);
      b1.classList.toggle('btn-secondary', hayCfg);
    }
    const b2 = document.getElementById('guiaBtnPaso2');
    if (b2) {
      b2.disabled = hayMed;
      b2.textContent = hayMed ? 'Listo' : 'Ir a Medir';
    }
    const b3 = document.getElementById('guiaBtnPaso3');
    if (b3) {
      b3.disabled = visitRiego;
      b3.textContent = visitRiego ? 'Listo' : 'Ir a Riego';
    }
  } finally {
    try { syncGuiaPrimerosPasosPorPestana(); } catch (_) {}
  }
}

function dismissTabContextHint(which) {
  const k = HC_HINT_CTX[which];
  if (k) {
    try { localStorage.setItem(k, '1'); } catch (_) {}
  }
  const id = which === 'mediciones' ? 'tabContextHintMediciones' : which === 'sistema' ? 'tabContextHintSistema' : which === 'riego' ? 'tabContextHintRiego' : null;
  const el = id ? document.getElementById(id) : null;
  if (el) el.classList.add('setup-hidden');
}

function actualizarTabContextHints(tab) {
  const map = {
    mediciones: 'tabContextHintMediciones',
    sistema: 'tabContextHintSistema',
    riego: 'tabContextHintRiego',
  };
  const id = map[tab];
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const key = HC_HINT_CTX[tab];
  let seen = false;
  try { seen = key && localStorage.getItem(key) === '1'; } catch (_) {}
  if (seen) el.classList.add('setup-hidden');
  else el.classList.remove('setup-hidden');
}

function actualizarQuickActionsNoviceMode() {
  const wrap = document.getElementById('quickActionsWrap');
  const more = document.getElementById('quickActionsMore');
  if (!wrap || !more) return;
  const exp = !!(state && state.configTorre && state.ultimaMedicion);
  wrap.classList.toggle('quick-actions-wrap--experienced', exp);
  more.open = exp;
}

// ══════════════════════════════════════════════════
// INIT APP
// ══════════════════════════════════════════════════
function resetApp() {
  if (!confirm('⚠️ ¿Estás seguro? Esta acción borrará TODOS los datos del sistema incluyendo plantas, mediciones y configuración.')) return;
  if (!confirm('⚠️ Segunda confirmación — esta acción NO se puede deshacer. ¿Continuar?')) return;

  // Borrar estado local (incl. sesión PIN para que vuelva a pedirse tras reset)
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('hc_auth');
    localStorage.removeItem(TUTORIAL_ASIGNAR_LS);
    localStorage.removeItem(TUTORIAL_EDITAR_LS);
    localStorage.removeItem(TUTORIAL_TORRE_TAB_LS);
    localStorage.removeItem(TORRE_SWIPE_HINT_LS);
    localStorage.removeItem(HC_GUIDE_DISMISS_KEY);
    localStorage.removeItem(HC_ONBOARD_RIEGO_VISIT_KEY);
    localStorage.removeItem(HC_BIENVENIDA_KEY);
    try {
      Object.values(HC_HINT_CTX).forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
    } catch (_) {}
  } catch(e) {}

  // Reiniciar estado
  state = initState();
  modoActual = 'lechuga';
  clEsPrimeraVez = true;

  // Actualizar UI
  renderTorre();
  updateTorreStats();
  updateDashboard();
  initConfigUI();
  goTab('inicio');

  showToast('🔄 Sistema reseteado');
  setTimeout(() => abrirChecklist(true), 1000);
}

function initApp() {
  updateClock();
  setInterval(updateClock, 30000);
  // Set active modo button
  document.querySelectorAll('.modo-btn').forEach(b => b.classList.remove('active'));
  const modoBtn = document.getElementById('modo-' + modoActual);
  if (modoBtn) modoBtn.classList.add('active');
  const m = MODOS_CULTIVO[modoActual];
  if (m) document.getElementById('modoInfoText').textContent =
    `${m.desc} — Editar ficha o asignar cultivo (barra encima del esquema)`;
  renderTorre();
  updateTorreStats();
  updateDashboard();
  initConfigUI();
  setInterval(updateDashboard, 300000);

  // Inicializar sistema multi-torre
  initTorres();
  reconciliarSlotTorreActivaAntesDeCargar();
  cargarEstadoTorre(state.torreActiva || 0);
  actualizarHeaderTorre();
  actualizarVistaRiegoPorTipoInstalacion();

  // Aplicar configuración de torre si existe
  aplicarConfigTorre();
  mostrarBtnNotificaciones();
  setTimeout(programarRecordatorios, 2000);
  setTimeout(() => { void refrescarAvisosMeteoalarmEnSegundoPlano(); }, 4500);
  // Badges DESPUÉS de cargar config y torre
  setTimeout(actualizarBadgesNutriente, 100);

  // Primera vez: bienvenida (una sola) y luego asistente o checklist si aplica
  setTimeout(() => mostrarBienvenidaOContinuarArranque(), 520);
  // Migrar fotos antiguas de localStorage a IndexedDB (solo la primera vez)
  abrirFotoDB().then(() => migrarFotosAIDB()).catch(e => console.warn('Migración IDB:', e));

  if (!window._a11yEscapeBound) {
    window._a11yEscapeBound = true;
    document.addEventListener('keydown', a11yEscapeTopDialog);
  }
  if (typeof initHidroCultivoTabBarA11y === 'function') initHidroCultivoTabBarA11y();
  if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
  if (typeof initHistorialTabBarA11y === 'function') initHistorialTabBarA11y();
  if (typeof window._hcSyncHistorialTabTabIndex === 'function') window._hcSyncHistorialTabTabIndex();
}
function updateClock() {
  const now = new Date();
  document.getElementById('headerTime').textContent =
    now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ══════════════════════════════════════════════════
// NAVEGACIÓN
// ══════════════════════════════════════════════════
/** Enter/Espacio en elementos role="button" con tabindex */
function a11yKeyActivate(ev, fn) {
  if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    if (typeof fn === 'function') fn();
  }
}

const _a11yDialogFocusReturn = [];

/** Misma lista que el foco inicial del diálogo; filtra nodos realmente visibles. */
const A11Y_FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function a11yCollectFocusables(rootEl) {
  if (!rootEl) return [];
  return Array.from(rootEl.querySelectorAll(A11Y_FOCUSABLE_SELECTOR)).filter(node => {
    if (!(node instanceof HTMLElement)) return false;
    if (node.getAttribute('aria-hidden') === 'true') return false;
    const st = getComputedStyle(node);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  });
}

function a11yAttachFocusTrap(rootEl) {
  if (!rootEl || rootEl._a11yFocusTrapHandler) return;
  const handler = e => {
    if (e.key !== 'Tab') return;
    const list = a11yCollectFocusables(rootEl);
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement;
    if (!rootEl.contains(active)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  rootEl._a11yFocusTrapHandler = handler;
  rootEl.addEventListener('keydown', handler, true);
}

function a11yDetachFocusTrap(rootEl) {
  if (!rootEl || !rootEl._a11yFocusTrapHandler) return;
  rootEl.removeEventListener('keydown', rootEl._a11yFocusTrapHandler, true);
  delete rootEl._a11yFocusTrapHandler;
}

function a11yDialogOpened(rootEl) {
  if (!rootEl || rootEl.dataset.a11yFocusPushed) return;
  rootEl.dataset.a11yFocusPushed = '1';
  _a11yDialogFocusReturn.push(document.activeElement);
  a11yAttachFocusTrap(rootEl);
  requestAnimationFrame(() => {
    const list = a11yCollectFocusables(rootEl);
    const node = list[0];
    if (node) node.focus();
  });
}

function a11yDialogClosed(rootEl) {
  if (!rootEl || !rootEl.dataset.a11yFocusPushed) return;
  a11yDetachFocusTrap(rootEl);
  delete rootEl.dataset.a11yFocusPushed;
  const prev = _a11yDialogFocusReturn.pop();
  if (prev && typeof prev.focus === 'function') {
    try { prev.focus(); } catch (e) {}
  }
}

function cerrarModalAgua(ev) {
  const el = document.getElementById('modalAgua');
  if (!el || !el.classList.contains('open')) return;
  if (ev && ev.currentTarget === el && ev.target !== el) return;
  el.classList.remove('open');
  a11yDialogClosed(el);
}

function a11yEscapeTopDialog(ev) {
  if (ev.key !== 'Escape' || ev.defaultPrevented) return;
  const clr = document.getElementById('checklistRutaRecargaOverlay');
  if (clr) {
    ev.preventDefault();
    cerrarOverlayRutaChecklistRecarga();
    return;
  }
  const cld = document.getElementById('checklistDatosInstalacionOverlay');
  if (cld) {
    ev.preventDefault();
    cerrarOverlayChecklistDatosInstalacion();
    return;
  }
  const clTab = document.getElementById('checklistTablaCultivosOverlay');
  if (clTab) {
    ev.preventDefault();
    cerrarOverlayTablaCultivosChecklist();
    return;
  }
  const order = ['modalConsejosTablaPersonal', 'modalOverlay', 'checklistOverlay', 'setupOverlay', 'modalTorres', 'modalAgua'];
  for (const id of order) {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open')) {
      if (id === 'checklistOverlay' && typeof clEsPrimeraVez !== 'undefined' && clEsPrimeraVez) return;
      ev.preventDefault();
      if (id === 'modalConsejosTablaPersonal') {
        cerrarModalConsejosTablaPersonal();
      } else if (id === 'modalOverlay') {
        document.getElementById('modalOverlay').classList.remove('open');
        editingCesta = null;
        a11yDialogClosed(el);
      } else if (id === 'checklistOverlay') {
        cerrarChecklist();
      } else if (id === 'setupOverlay') {
        cerrarSetup();
      } else if (id === 'modalTorres') {
        el.classList.remove('open');
        a11yDialogClosed(el);
      } else if (id === 'modalAgua') {
        cerrarModalAgua();
      }
      return;
    }
  }
}

function activarNotificacionesDesdeInicio(ev) {
  const el = ev.currentTarget;
  pedirPermisoNotificaciones().then(ok => {
    if (ok) {
      showToast('🔔 Notificaciones activadas (recarga, medición, cosecha, MeteoAlarm si afecta a tu zona)');
      el.style.display = 'none';
    } else {
      showToast('Actívalas en Ajustes del navegador', true);
    }
  });
}

/** Centra la pestaña activa en la barra inferior cuando hay scroll horizontal (móviles estrechos). */
function scrollTabBarToActive(btn) {
  if (!btn) return;
  const bar = btn.closest('.tab-bar');
  if (!bar || bar.scrollWidth <= bar.clientWidth + 2) return;
  requestAnimationFrame(() => {
    const instant = typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    btn.scrollIntoView({
      behavior: instant ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  });
}

function goTab(tab) {
  // Guardar estado torre antes de navegar
  guardarEstadoTorreActual();
  saveState();
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + tab);
  if (panel) {
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
  }
  const activeBtn = document.getElementById('btn-' + tab);
  if (activeBtn) activeBtn.classList.add('active');
  scrollTabBarToActive(activeBtn);
  ['inicio','mediciones','sistema','calendario','riego','meteo','historial','consejos'].forEach(t => {
    const b = document.getElementById('btn-' + t);
    if (b) b.setAttribute('aria-selected', t === tab ? 'true' : 'false');
  });
  currentTab = tab;
  try {
    actualizarTabContextHints(tab);
    if (tab === 'riego') marcarVisitaRiegoOnboarding();
  } catch (_) {}
  if (tab === 'mediciones') { cargarUltimaMedicion(); initConfigUI(); }
  if (tab === 'inicio') updateDashboard();
  if (tab === 'meteo') { cargarMeteo(); window._meteoObsoleto = false; }
  if (tab === 'calendario') { calFecha = new Date(); calDiaSeleccionado = null; renderCalendario(); }
  if (tab === 'sistema') {
    renderTorre();
    renderCompatGrid();
    calcularRotacion();
    setTimeout(() => abrirTutorialTorrePestanaSiPrimeraVez(), 520);
  }
  if (tab === 'historial') { histDatos = null; cargarHistorial(); }
  if (tab === 'consejos') renderConsejos();
  if (tab === 'riego') {
    // Sincronizar inputs con la torre activa y calcular
    sincronizarInputsRiego();
    initDiaRiego();
    actualizarVistaRiegoPorTipoInstalacion();
    try { refreshUbicacionInstalacionUI(); } catch (_) {}
    /* Siempre pedir datos nuevos al abrir la pestaña: el nocturno depende de la serie horaria; sin forceRefresh se reutilizaba caché ~1 min y podía parecer “valor fijo”. */
    calcularRiego({ forceRefresh: true });
    window._riegoObsoleto = false;
  }
  if (typeof window._hcSyncMainTabTabIndex === 'function') window._hcSyncMainTabTabIndex();
  try { syncGuiaPrimerosPasosPorPestana(); } catch (_) {}
}

function irMedirMunicipioClima() {
  goTab('mediciones');
  setTimeout(() => {
    const panel = document.getElementById('panelLocalidadMeteo');
    const inp = document.getElementById('inputLocalidadMeteo');
    try {
      panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      panel?.scrollIntoView();
    }
    try {
      inp?.focus();
    } catch (_) {}
  }, 120);
}


/** Consejos — datos y render. Tras hc-setup-historial-tabs.js. */
// ══════════════════════════════════════════════════
// CONSEJOS — LÓGICA
// ══════════════════════════════════════════════════

const CONSEJOS_DATA = {
  cultivo: {
    nombre: '🌿 Cultivo', color: '#15803d', bg: 'rgba(22,163,74,0.1)',
    consejos: [
      { icono:'🌱', titulo:'Plántulas — primeros días',
        texto:'Las primeras 48h son críticas. Mantén la esponja siempre húmeda pero no encharcada. El sistema de cascada debe estar activo desde el primer momento. <strong>No expongas las raíces al aire.</strong>',
        alerta:{ tipo:'info', txt:'ℹ️ Las plántulas nuevas pueden necesitar 2-3 días para adaptarse al sistema hidropónico si vienen de semillero en tierra.' } },
      { icono:'🏪', titulo:'Origen en ficha: plántula de vivero',
        texto:'Si compras en vivero o garden center, suele venir sustrato (coco, turba, plug de semillero) en el pan de raíces. En hidroponía conviene <strong>retirar con suavidad lo suelto</strong> o seguir las indicaciones del proveedor, para no arrastrar tierra o materia orgánica al depósito. En la ficha elige <strong>Plántula de vivero</strong> y la <strong>fecha en que entra al sistema</strong> (NFT, DWC o torre).',
        alerta:{ tipo:'info', txt:'ℹ️ El origen es orientativo para ti y para el registro; el contador de días del calendario sigue basado en la fecha de trasplante al sistema.' } },
      { icono:'🫘', titulo:'Origen en ficha: germinación propia',
        texto:'Desde semilla en sustrato hidropónico: bandeja a <strong>oscuras</strong> hasta que asome la radícula (suelen ser unos 2–4 días según especie y temperatura), luego <strong>luz de crecimiento</strong> (14–18 h/día, suave al inicio) hasta 2–3 hojas reales y buen desarrollo radicular; entonces <strong>trasplanta al circuito</strong>. En la ficha marca <strong>Germinación propia</strong> y usa como fecha el <strong>día del traslado al sistema</strong> (no el de la siembra), para que el progreso y el riego coincidan con la planta en hidroponía.',
        alerta:{ tipo:'ok', txt:'✅ En modo «Asignar cultivo» verás los mismos pasos al elegir germinación propia; los tiempos exactos dependen de la variedad y del sobre del semillero.' } },
      { icono:'⚗️', titulo:'pH inestable tras trasplantar plántulas',
        texto:'Es completamente normal que el pH suba 1-2 unidades en las primeras 24-72h tras añadir plántulas nuevas al sistema. Las raíces jóvenes absorben más aniones (nitratos) que cationes y liberan OH⁻ al agua, subiendo el pH. Con agua destilada este efecto es más pronunciado porque no hay carbonatos que amortigüen. <strong>No es un problema — es fisiología normal.</strong>',
        alerta:{ tipo:'warn', txt:'⚠️ Primera semana con plántulas nuevas: mide el pH cada 6-8h y ajusta con pH- si supera 7.0. A partir del día 4-5 el pH se estabiliza solo. Si el pH sube DE NOCHE también, puede indicar actividad bacteriana — revisar raíces.' } },
      { icono:'🥬', titulo:'Señales de lechuga sana',
        texto:'Hojas turgentes y brillantes, color verde intenso o rojizo según variedad, crecimiento visible día a día. Las raíces deben ser blancas o ligeramente crema, nunca marrones o con mal olor.',
        alerta:{ tipo:'ok', txt:'✅ Una lechuga sana puede crecer 2-3 cm al día en condiciones óptimas.' } },
      { icono:'✂️', titulo:'Cuándo y cómo cosechar',
        texto:'Cosecha cuando la lechuga tenga 15-20cm de diámetro o empiece a compactar el centro. <strong>Corta a 2cm de la base</strong> — muchas variedades rebrotan. Cosechar por la mañana temprano cuando están más hidratadas.',
        alerta:{ tipo:'warn', txt:'⚠️ Si aparece un tallo central alargado (espigado) la lechuga está a punto de florecer y se volverá amarga. Cosechar inmediatamente.' } },
      { icono:'🔃', titulo:'Rotación escalonada (torre por niveles)',
        texto:'Sobre todo en <strong>torre vertical</strong> con varios niveles: rota cada 12-15 días (cosecha abajo → subes plantas → plántulas arriba). Así mantienes producción continua con un solo depósito. En NFT/DWC el ritmo es distinto; usa fechas en fichas y calendario.',
        alerta:{ tipo:'info', txt:'ℹ️ Al rotar, ajusta la EC del depósito al estado del cultivo predominante.' } },
      { icono:'⏱️', titulo:'NFT vs torre: ¿mismos días de cultivo?',
        texto:'En estudios y guías técnicas (p. ej. comparativas NFT / DWC / torre con lechuga) lo que más se documenta son <strong>rendimiento, biomasa y uso de agua</strong>, no un calendario fijo distinto “por sistema”. Los <strong>días hasta cosecha</strong> los marcan sobre todo la <strong>variedad</strong>, la <strong>luz</strong>, <strong>temperatura</strong>, <strong>EC/pH</strong> y la calidad de la plántula. Un NFT con película inestable o una torre con sombra desigual puede alargar el ciclo; no es que NFT o torre tengan por sí solos otro “cronómetro” en webs serias.',
        alerta:{ tipo:'info', txt:'ℹ️ Usa las fechas en la app y la ficha de la variedad; el tipo de montaje cambia la ingeniería del agua, no el genotipo.' } },
      { icono:'📅', titulo:'Fecha de trasplante en la ficha',
        texto:'Cada hueco, maceta o cesta debe llevar <strong>variedad + fecha</strong> desde que plantas o trasplantas. Sin fecha, el riego automático, las medias de edad y el calendario no reflejan lo que hay en la instalación activa: puedes regar como si fueran plántulas cuando ya van por la mitad del ciclo (o al revés).',
        alerta:{ tipo:'ok', txt:'✅ Un momento al trasplantar: abre la ficha, elige cultivo y fecha. Así fotos, registro y cálculo de riego quedan alineados con tus plantas reales.' } },
      { icono:'🧩', titulo:'Cultivos compatibles o no (y por qué)',
        texto:'En un sistema con <strong>un solo depósito</strong> (torre, NFT o DWC) todas las plantas comparten la <strong>misma agua</strong>: misma EC y mismo pH. Por eso solo conviene mezclar grupos con necesidades parecidas. <strong>Lechugas entre sí</strong> y con muchas <strong>asiáticas</strong> de hoja (p. ej. mizuna, komatsuna) suele funcionar si ajustas la EC con cuidado. Las <strong>hojas verdes</strong> más exigentes (espinaca, acelga) suelen pedir <strong>más nutrientes</strong> que un circuito solo lechuga. Los <strong>frutos</strong> (tomate, pepino, pimiento…) y varias <strong>hierbas de EC alta</strong> (menta, orégano, cebollino) descompensan a las lechugas: mejor <strong>otra instalación u otro depósito</strong>. Además del agua, piensa en la <strong>luz</strong>: una planta muy grande puede dejar a las demás a la sombra.',
        alerta:{ tipo:'info', txt:'ℹ️ En <strong>Sistema → Compatibilidad de cultivos</strong> la app te avisa si mezclas grupos poco recomendables en el mismo depósito.' } },
    ]
  },
  agua: {
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)',
    consejos: [
      { icono:'⚡', titulo:'Entender la EC',
        texto:'La EC mide la concentración de nutrientes. El rango objetivo depende del <strong>cultivo</strong> y de la <strong>marca</strong> que tengas en la <strong>instalación activa</strong> (véase checklist y medición). Si baja mucho hay hambre de nutrientes; si sube demasiado, estrés osmótico.',
        alerta:{ tipo:'info', txt:'ℹ️ La EC sube cuando las plantas transpiran más agua que nutrientes. En verano controla más a menudo.' } },
      { icono:'🟤', titulo:'Agua coloreada en el depósito',
        texto:'Tonos ámbar o rojizos suelen venir de la oxidación del <strong>hierro quelado</strong> u otros compuestos de la solución — es habitual en muchas líneas <strong>A+B</strong>. Suele ser normal tras varios días e indica que conviene plantear <strong>recarga</strong>. Cubrir el depósito opaco a la luz reduce algas.',
        alerta:{ tipo:'warn', txt:'⚠️ El depósito debe estar opaco a la luz; filtraciones de luz aceleran algas y degradación.' } },
    ]
  },
  ecph: {
    nombre: '📊 EC / pH', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
    soloTabla: true,
    consejos: []
  },
  nft: {
    nombre: '🪴 NFT', color: '#0d9488', bg: 'rgba(13,148,136,0.1)',
    consejos: [],
    soloNftDoc: true,
  },
  dwc: {
    nombre: '🌊 DWC', color: '#0891b2', bg: 'rgba(8,145,178,0.12)',
    consejos: [],
    soloDwcDoc: true,
  },
  clima: {
    nombre: '🌡️ Clima', color: '#b45309', bg: 'rgba(217,119,6,0.1)',
    consejos: [
      { icono:'☀️', titulo:'Ola de calor (> 30°C)',
        texto:'Despliega el toldo antes de las 10h. Aumenta la frecuencia de riego — el atajo lo calcula automáticamente con VPD alto. <strong>Riesgo de espigado</strong> en lechugas con temperaturas sostenidas > 28°C.',
        alerta:{ tipo:'warn', txt:'⚠️ Si las lechugas se ponen lacias a mediodía y no se recuperan al atardecer, hay estrés hídrico real. Añadir ciclo extra de riego.' } },
      { icono:'🥶', titulo:'Noches frías (< 5°C)',
        texto:'El calentador del depósito es esencial. Por debajo de 14°C en el agua el crecimiento casi se detiene. <strong>Objetivo siempre 20°C</strong> en el agua del depósito.',
        alerta:{ tipo:'info', txt:'ℹ️ En Castelló las heladas son raras pero en enero-febrero pueden darse temperaturas de 2-4°C por las noches.' } },
      { icono:'💨', titulo:'Viento fuerte (> 30 km/h)',
        texto:'El viento aumenta la transpiración y el estrés hídrico. El sistema calcula esto automáticamente aumentando el riego. <strong>Protege las plántulas</strong> del nivel superior si el viento es muy fuerte.',
        alerta:{ tipo:'ok', txt:'✅ El viento moderado (10-25 km/h) es beneficioso — aumenta la transpiración y reduce el riesgo de tipburn por mejor circulación de calcio.' } },
      { icono:'🌧️', titulo:'Días de lluvia',
        texto:'La lluvia suele mojar el follaje pero <strong>no sustituye</strong> la solución del depósito ni el riego del circuito. Sigue haciendo falta tu programa. Con alta humedad ambiental la app puede <strong>reducir ciclos</strong> automáticamente.',
        alerta:{ tipo:'info', txt:'ℹ️ Con probabilidad de lluvia > 50% el VPD baja y el atajo reduce el riego automáticamente. No es necesario ajuste manual.' } },
    ]
  },
  problemas: {
    nombre: '🔍 Problemas', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',
    consejos: [
      { icono:'🟡', titulo:'Hojas amarillas',
        texto:'Amarillo uniforme en hojas viejas: deficiencia de nitrógeno — subir EC ligeramente. Amarillo entre nervios en hojas jóvenes: deficiencia de hierro o manganeso — bajar pH a 5.8-6.0. Amarillo con manchas: puede ser enfermedad fúngica.',
        alerta:{ tipo:'warn', txt:'⚠️ El pH fuera de 5.5-6.5 bloquea la absorción de micronutrientes aunque estén presentes en la solución.' } },
      { icono:'🟤', titulo:'Puntas marrones (tipburn)',
        texto:'Deficiencia de calcio en las hojas jóvenes por baja transpiración. <strong>Causas:</strong> humedad muy alta, poco viento, EC muy alta o temperatura agua baja. Aplicar spray foliar de calcio 2 veces por semana.',
        alerta:{ tipo:'ok', txt:'✅ El tipburn es estético — no afecta al sabor ni a la salud de la planta. Pero indica que hay que mejorar la circulación de aire.' } },
      { icono:'🐛', titulo:'Plagas comunes',
        texto:'<strong>Pulgones:</strong> chorro de agua a presión + jabón potásico diluido. <strong>Mosca blanca:</strong> trampas amarillas adhesivas + neem. <strong>Orugas:</strong> retirar manualmente. La <strong>albahaca</strong> como compañera repele pulgones de forma natural.',
        alerta:{ tipo:'warn', txt:'⚠️ Inspecciona el envés de las hojas semanalmente. Los pulgones se multiplican muy rápido en primavera.' } },
      { icono:'🦠', titulo:'Raíces marrones o con mal olor',
        texto:'Señal de Pythium u otra infección fúngica. <strong>Causas principales:</strong> agua > 24°C, falta de oxígeno, EC muy alta. Solución: vaciar y limpiar depósito con agua oxigenada, bajar temperatura agua, aumentar aireación.',
        alerta:{ tipo:'warn', txt:'⚠️ El difusor de aire encendido 24h es la mejor prevención contra Pythium. El oxígeno disuelto es esencial.' } },
    ]
  },
  variedades: {
    nombre: '🌱 Variedades', color: '#047857', bg: 'rgba(5,150,105,0.08)',
    consejos: [
      { icono:'🥬', titulo:'Mejores lechugas para Castelló',
        texto:'<strong>Primavera/Otoño:</strong> Romana, Trocadero, Batavia — crecimiento rápido y sabor excelente. <strong>Verano:</strong> Lolo Rosso, Hoja Roble Rojo — más resistentes al calor. <strong>Invierno:</strong> Maravilla, Mantecosa — toleran temperaturas bajas.',
        alerta:{ tipo:'ok', txt:'✅ La Romana es la más productiva y versátil para hidropónica — buena elección para empezar.' } },
      { icono:'🌿', titulo:'Mizuna — la más fácil',
        texto:'La Mizuna es la variedad asiática más recomendada para principiantes en hidropónica. Crece en 35-40 días, tolera tanto el calor como el frío moderado, y produce hojas delicadas de sabor suave-picante. <strong>Muy productiva.</strong>',
        alerta:{ tipo:'info', txt:'ℹ️ La Komatsuna es similar pero con hojas más grandes y sabor más suave. Ambas son perfectas mezcladas con lechugas.' } },
      { icono:'🌿', titulo:'Albahaca — compañera perfecta',
        texto:'Aunque necesita más calor (mínimo 18°C), la albahaca bien situada tiene una función extra: <strong>repele pulgones y mosca blanca</strong>. Ponla donde reciba más sol (arriba en torre, borde soleado en NFT/DWC). EC compatible con lechugas.',
        alerta:{ tipo:'warn', txt:'⚠️ La albahaca no tolera temperaturas < 10°C. Solo usarla de mayo a octubre en Castelló.' } },
      { icono:'❌', titulo:'Qué NO mezclar en el mismo depósito',
        texto:'<strong>Tomates, pepinos, pimientos:</strong> necesitan EC 1800-2500 y soporte físico — mal compañeros de lechuga en un solo tanque. <strong>Fresas:</strong> pueden funcionar pero compiten por EC. <strong>Plantas muy altas:</strong> sombrean al resto (en torre, sobre todo niveles bajos).',
        alerta:{ tipo:'warn', txt:'⚠️ Mezclar frutales con lechugas en el mismo depósito provoca deficiencias en unas u otras inevitablemente.' } },
    ]
  },
};

// ── Diagnóstico por síntomas — árbol de decisión ─────────────────────────────
const DIAGNOSTICO = [
  {
    sintoma: '🟡 Hojas amarillas uniformes en hojas viejas',
    causa: 'Deficiencia de Nitrógeno',
    solucion: 'EC demasiado baja. Añadir nutrientes A+B hasta llegar a 1300-1400 µS/cm.',
    urgencia: 'warn'
  },
  {
    sintoma: '🟡 Amarillo entre nervios en hojas jóvenes',
    causa: 'Deficiencia de Hierro o Manganeso',
    solucion: 'pH fuera de rango. Bajar pH a 5.8-6.0 para mejorar absorción de micronutrientes.',
    urgencia: 'warn'
  },
  {
    sintoma: '🟤 Puntas y bordes marrones (tipburn)',
    causa: 'Deficiencia de Calcio en tejidos jóvenes',
    solucion: 'Aumentar ventilación y circulación de aire. Reducir EC ligeramente. El CalMag ayuda.',
    urgencia: 'warn'
  },
  {
    sintoma: '🔴 Raíces marrones y blandas con mal olor',
    causa: 'Pythium — infección fúngica',
    solucion: 'Vaciar depósito urgente. Limpiar con H₂O₂ 3% (15ml/5L). Bajar temperatura agua a <22°C. Añadir difusor 24h.',
    urgencia: 'bad'
  },
  {
    sintoma: '🌿 Tallo central alargado y hojas más pequeñas',
    causa: 'Bolting — espigado por calor',
    solucion: 'Temperatura > 24°C. Cosechar inmediatamente — la lechuga estará amarga. Instalar toldo.',
    urgencia: 'bad'
  },
  {
    sintoma: '💧 Plantas lacias al mediodía pero se recuperan por la tarde',
    causa: 'Estrés hídrico puntual — VPD alto',
    solucion: 'Normal en días muy calurosos. Añadir ciclo extra de riego a las 13h. Verificar que la bomba funciona.',
    urgencia: 'warn'
  },
  {
    sintoma: '💧 Plantas lacias sin recuperarse por la tarde',
    causa: 'Estrés hídrico severo o EC demasiado alta',
    solucion: 'Verificar bomba y caudal. Si EC > 1600 diluir con agua destilada. Temperatura agua < 22°C.',
    urgencia: 'bad'
  },
  {
    sintoma: '🟤 Manchas marrones con halo amarillo en hojas',
    causa: 'Botritis o mildiu — hongos foliares',
    solucion: 'Humedad > 85%. Mejorar ventilación urgente. Retirar hojas afectadas. Reducir ciclos nocturnos.',
    urgencia: 'bad'
  },
  {
    sintoma: '🐛 Puntitos blancos en el envés de las hojas',
    causa: 'Araña roja — ácaro',
    solucion: 'Humedad muy baja + calor. Lavar con jabón potásico diluido. Aumentar humedad ambiental.',
    urgencia: 'warn'
  },
  {
    sintoma: '🐛 Colonias verdes o negras en tallos y hojas',
    causa: 'Pulgones',
    solucion: 'Chorro de agua a presión + jabón potásico. Revisar plantas semanalmente. La albahaca los repele.',
    urgencia: 'warn'
  },
  {
    sintoma: '🫧 Espuma en el depósito',
    causa: 'Materia orgánica en descomposición o primera vez con CalMag',
    solucion: 'Añadir 5-8ml H₂O₂ 3%. Revisar raíces — si están blancas no es Pythium. Cosechar plantas maduras.',
    urgencia: 'warn'
  },
  {
    sintoma: '📈 pH sube constantemente',
    causa: 'Plántulas nuevas absorbiendo nitratos (normal) o actividad bacteriana',
    solucion: 'Primeros 5 días: normal. No intervenir si pH < 7.0. Si hay espuma también → revisar raíces.',
    urgencia: 'info'
  },
];

let diagnosticoFiltro = '';

function renderDiagnostico() {
  const el = document.getElementById('diagnosticoLista');
  if (!el) return;
  const filtro = diagnosticoFiltro.toLowerCase();
  const filtrados = filtro
    ? DIAGNOSTICO.filter(d => d.sintoma.toLowerCase().includes(filtro) || d.causa.toLowerCase().includes(filtro))
    : DIAGNOSTICO;

  const colores = {
    bad:  { bg:'#fff5f5', border:'#fca5a5', color:'#b91c1c' },
    warn: { bg:'#fffbeb', border:'#fcd34d', color:'#92400e' },
    info: { bg:'#eff6ff', border:'#93c5fd', color:'#1d4ed8' },
  };

  el.innerHTML = filtrados.map(d => {
    const c = colores[d.urgencia] || colores.info;
    return `<div class="diag-card" style="--diag-bg:${c.bg};--diag-bd:${c.border};--diag-fg:${c.color}">
      <div class="diag-card-title">${d.sintoma}</div>
      <div class="diag-card-cause">
        📌 ${d.causa}
      </div>
      <div class="diag-card-sol">
        💊 ${d.solucion}
      </div>
    </div>`;
  }).join('');
}

let consejoCatActiva = 'cultivo';

/** µS/cm y pH orientativos (bibliografía / manuales de hidroponía) — ajustar por nutriente, agua y fase */
const REF_CULTIVOS_EC_PH = [
  { cultivo: 'Lechuga / lechuguinas', ec: '900–1600', ph: '5,5–6,5', nota: 'Rango app lechuga ~1300–1400' },
  { cultivo: 'Espinaca / acelga / kale', ec: '1200–2000', ph: '5,5–6,5', nota: 'Mayor necesidad nitro' },
  { cultivo: 'Rúcula / canónigos / mostaza', ec: '1000–1600', ph: '5,5–6,4', nota: 'Similar lechuga' },
  { cultivo: 'Albahaca / menta / perejil', ec: '1000–1800', ph: '5,5–6,5', nota: 'Albahaca algo más EC en pleno sol' },
  { cultivo: 'Cilantro / eneldo', ec: '1200–1800', ph: '5,5–6,2', nota: '' },
  { cultivo: 'Tomate — vegetativo', ec: '1400–2400', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Tomate — floración / fruto', ec: '2200–3200', ph: '5,5–6,2', nota: 'Subir EC de forma gradual' },
  { cultivo: 'Pimiento / berenjena', ec: '1600–2600', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Pepino', ec: '1400–2200', ph: '5,5–6,2', nota: '' },
  { cultivo: 'Judía verde / guisante (brotes)', ec: '1400–2400', ph: '6,0–6,5', nota: '' },
  { cultivo: 'Fresa / fresón', ec: '1200–2000', ph: '5,5–6,2', nota: 'Plántulas más bajo EC' },
  { cultivo: 'Brócoli / coliflor', ec: '1700–2600', ph: '6,0–6,8', nota: '' },
  { cultivo: 'Zanahoria (hojas) / microverduras', ec: '1200–2000', ph: '5,5–6,5', nota: '' },
  { cultivo: 'Melón / sandía', ec: '1600–3000', ph: '5,5–6,2', nota: 'Fructificación arriba del rango' },
  { cultivo: 'Flores de corte (p. ej. rosa)', ec: '1200–2200', ph: '5,5–6,2', nota: '' },
];

/** Nombre instalación + NFT | DWC | Torre vertical (para títulos de tablas EC/pH). */
function consejosTituloInstalacionSistemaLinea() {
  const cfg = state.configTorre || {};
  const sys =
    typeof etiquetaSistemaHidroponicoBreve === 'function' ? etiquetaSistemaHidroponicoBreve(cfg) : 'Torre vertical';
  let nombre = '';
  try {
    const ta = typeof getTorreActiva === 'function' ? getTorreActiva() : null;
    if (ta && ta.nombre) nombre = String(ta.nombre).trim();
  } catch (e) {}
  return nombre !== '' ? meteoEscHtml(nombre) + ' · ' + meteoEscHtml(sys) : meteoEscHtml(sys);
}

function buildHtmlTablaEcPh(opts) {
  const omitId = opts && opts.omitAnchorId;
  const wrapAttr = omitId ? 'class="consejo-ecph-wrap"' : 'class="consejo-ecph-wrap" id="consejos-resumen-ec-ph"';
  const rows = REF_CULTIVOS_EC_PH.map(r => `
    <tr>
      <td class="consejo-ecph-icon-cell" aria-hidden="true">${refEcPhRowEmojiHtml(r)}</td>
      <td>${meteoEscHtml(r.cultivo)}</td>
      <td>${meteoEscHtml(r.ec)}</td>
      <td>${meteoEscHtml(r.ph)}</td>
      <td class="consejo-ecph-nota-cell">${meteoEscHtml(r.nota || '—')}</td>
    </tr>
  `).join('');
  return `
    <div ${wrapAttr}>
      <div class="consejo-titulo consejo-titulo--mb8">Referencia rápida hidroponía</div>
      <div class="consejo-ecph-note">
        Valores medios habituales en bibliografía y tablas de cultivos (EC en <strong>µS/cm</strong> como en esta app; pH de la solución).
        Varía según <strong>marca de abono</strong>, agua base, temperatura y fase (plántula → vegetativo → flor/fruto). Úsalo como guía, no como dogma.
      </div>
      <table class="consejo-ecph-table">
        <thead><tr>
          <th class="consejo-ecph-icon-cell" scope="col"><span class="visually-hidden">Icono tipo</span></th>
          <th>Cultivo</th>
          <th>EC µS/cm</th>
          <th>pH</th>
          <th>Nota</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/** Consejos EC/pH: referencia por fabricante (ml/L → totales al volumen). CalMag en blanda escala desde dosis 18 L de la app. */
const REF_DOSIS_LITROS_TABLA = VOL_OBJETIVO;

/**
 * REF dosis: cada valor es ml/L (o g/L en polvo) de **esa botella/parte**.
 * Líneas A+B habituales en Europa: la ficha da la **misma ml/L para A y para B** (no son “ml/L totales” a repartir 50/50 salvo que el envase lo indique así).
 */
const REF_DOSIS_FABRICANTE = {
  canna_aqua: {
    fuente: 'Canna Aqua Vega: **2 ml/L de botella A y 2 ml/L de botella B** en referencia vegetativo (misma dosis en cada parte; no sumar como una sola cifra para partir). Rango fabricante hasta ~4 ml/L c/u en otros contextos.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'CalMag: de 0 ml hasta la dosis blanda según dureza; medir conductividad del grifo antes de mezclar.',
  },
  canna_substra_soft: {
    fuente: 'Canna Substra Vega Soft Water: tabla suele ir de ~2,5 a 4 ml/L **de A** y la **misma ml/L de B** (ej. 25–40 ml de cada una en 10 L). La app usa **2,5 ml/L** por parte como dosis media veg; subir hasta 4 ml/L c/u en plena vegetación si la EC lo pide.',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'Línea SOFT para agua blanda/ósmosis. Grifo muy duro: valorar la gama Hard del fabricante.',
  },
  advanced_ph_perfect: {
    fuente: 'Advanced Nutrients pH Perfect GMB: vegetativo típico ~4 ml/L Micro, Grow y Bloom cada uno.',
    mlPorLitro: [4, 4, 4],
    calmagGrifoNota: 'Sin CalMag extra (Ca/Mg en Micro). Ajustar solo si el fabricante lo indica para tu agua.',
  },
  ghe_flora: {
    fuente: 'GHE Flora Series: proporción lechuga vegetativo de esta app — Micro 2,6 + Gro 1,3 + Bloom 1,3 ml/L.',
    mlPorLitro: [2.6, 1.3, 1.3],
    calmagGrifoNota: 'CalMag: reducir u omitir si el grifo aporta minerales; medir tras mezclar.',
  },
  plagron_hydro: {
    fuente: 'Plagron Hydro A+B: **2,5 ml/L de Hydro A y 2,5 ml/L de Hydro B** (partes iguales; dilución 1:400). No es “2,5 ml/L total” repartidos: son **2,5 + 2,5** por litro de agua de riego.',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'CalMag: menos o ninguno si el agua es dura; contrastar con EC base.',
  },
  hesi_tnt: {
    fuente: 'Hesi TNT Complex: plena vegetación orientativa ~5 ml/L (plántulas menos).',
    mlPorLitro: [5],
    calmagGrifoNota: 'CalMag: suele reducirse con grifo duro; parte siempre de la EC del agua base.',
  },
  biobizz: {
    fuente: 'BioBizz Fish·Mix + Alg·A·Mic: **dos botellas distintas** — no es A=B. Referencia veg suave **2 ml/L Fish·Mix + 1 ml/L Alg·A·Mic** (subir Fish hasta ~4 ml/L y Alg hasta ~2 ml/L según fase y envase).',
    mlPorLitro: [2, 1],
    calmagGrifoNota: 'Orgánico: EC baja; CalMag solo si hay carencias y según etiqueta.',
  },
  campeador: {
    fuente: 'Campeador Solución Hoja (ficha tienda): ~1 ml/L de cada parte A y B (madres diluidas).',
    mlPorLitro: [1, 1],
    calmagGrifoNota: 'CalMag: como con cualquier base — menos si el grifo aporta dureza.',
  },
  canna_hydro_vega: {
    fuente: 'Canna Hydro Vega (run-to-waste): orientación 4–5 ml/L por parte; tabla app 4 ml/L A y B.',
    mlPorLitro: [4, 4],
    calmagGrifoNota: 'Grifo: a menos CalMag; subir A+B según EC base.',
  },
  atami_bcuzz_hydro: {
    fuente: "Atami B'cuzz Hydro A+B: 1–3 ml/L por parte; referencia media 2 ml/L.",
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'CalMag según conductividad del grifo.',
  },
  hypro_hydro_ab: {
    fuente: 'Hy-Pro Hydro A+B: referencia vegetativo ~2,5 ml/L por parte (ajustar por EC).',
    mlPorLitro: [2.5, 2.5],
    calmagGrifoNota: 'Reducir suplemento Ca/Mg con agua dura.',
  },
  vitalink_hydro_max: {
    fuente: 'VitaLink Hydro Max Grow: vegetativo ~3 ml/L A y B (tablas tienda).',
    mlPorLitro: [3, 3],
    calmagGrifoNota: 'CalMag opcional según dureza.',
  },
  mills_basis_ab: {
    fuente: 'Mills Basis A/B: **misma cantidad en A y en B**. Carta Mills — las 2 primeras semanas **1 ml/L de A y 1 ml/L de B**; después en veg típico **2 ml/L de cada parte**. La app usa **2 ml/L** como referencia de vegetativo ya iniciado; en plantas muy jóvenes bajar a 1 ml/L c/u.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Seguir carta fabricante en floración (más ml/L).',
  },
  green_planet_hydro_fuel: {
    fuente: 'Green Planet Hydro Fuel Grow A+B: fabricante indica **1–3 ml/L por parte** (añadir A, remover, luego B; misma banda en cada botella). Referencia veg media **2 ml/L A y 2 ml/L B**.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Medir tras mezcla; grifo duro = menos CalMag.',
  },
  ionic_grow_hydro: {
    fuente: 'Ionic Grow (una botella): orientación ~4 ml/L en blanda.',
    mlPorLitro: [4],
    calmagGrifoNota: 'Una parte; ajustar por EC del grifo.',
  },
  biobizz_bio_grow: {
    fuente: 'BioBizz Bio-Grow orgánico: ~3 ml/L referencia media.',
    mlPorLitro: [3],
    calmagGrifoNota: 'Orgánico — EC más baja; CalMag prudente.',
  },
  hesi_hidro: {
    fuente: 'Hesi Hidro Crecimiento: orientación ~4,5 ml/L (línea hidro, no TNT).',
    mlPorLitro: [4.5],
    calmagGrifoNota: 'CalMag proporcional a dureza.',
  },
  hortalan: {
    fuente: 'Hortalan: orientativa ~4 ml/L; confirmar envase.',
    mlPorLitro: [4],
    calmagGrifoNota: 'Medir EC base del grifo.',
  },
  fox_farm_grow_big: {
    fuente: 'Fox Farm Grow Big: orientación ~3 ml/L (trío / solo Grow Big).',
    mlPorLitro: [3],
    calmagGrifoNota: 'Muy concentrado; subir con cuidado.',
  },
  campeador_hidro: {
    fuente: 'Campeador Hidro A+B (web fabricante): 1–3 ml/L por parte; ejemplo 18 L con EC 1100–1200 µS ≈ 18 ml A + 18 ml B (~1 ml/L). La app usa 1 ml/L como base checklist (subir hasta 3 ml/L si EC queda baja).',
    mlPorLitro: [1, 1],
    calmagGrifoNota: 'Distinto de línea Hoja; grifo: misma ml/L tras medir EC base.',
  },
  masterblend_41838: {
    fuente: 'Masterblend 4-18-38 + receta típica Ca(NO₃)₂ + MgSO₄: gramos/L orient. 1,9 g/L total sales disueltas (no ml).',
    mlPorLitro: [1.9],
    calmagGrifoNota: 'Polvo: no usar tabla ml; grifo = ajustar sales y medir.',
  },
  otro: {
    fuente: 'Referencia genérica A+B 2 ml/L por parte hasta consultar el envase.',
    mlPorLitro: [2, 2],
    calmagGrifoNota: 'Seguir siempre la etiqueta y la EC del agua base.',
  },
};

function getRefDosisFabricante(nutId) {
  return REF_DOSIS_FABRICANTE[nutId] || REF_DOSIS_FABRICANTE.otro;
}

function dosisSufijoNutriente(nut) {
  return nut && nut.tipoDosis === 'polvo' ? ' g' : ' ml';
}

/** ml (o g si tipoDosis polvo) de la parte `partIndex` según tabla fabricante y volumen. */
function mlNutrientePorParte(nutId, partIndex, volLitros) {
  const ref = getRefDosisFabricante(nutId);
  const arr = ref.mlPorLitro;
  const idx = Math.min(Math.max(0, partIndex), arr.length - 1);
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.max(0.1, Math.round(arr[idx] * v * 10) / 10);
}

/**
 * EC (µS/cm) que ya lleva el agua o la solución **antes** del abono principal (CalMag en blanda, o EC del grifo).
 */
function getEcBaseAguaPreAbonoMicroS(volLitros, nut, modoSoft, usarCalMag) {
  if (modoSoft && nut.calmagNecesario && usarCalMag) {
    const mlCM = mlCalMagParaAguaBlanda(volLitros);
    return mlCM > 0 ? estimarEcCalMagMicroS(mlCM, volLitros) : 0;
  }
  if (!modoSoft) {
    const g = Number(state.configAguaEC);
    if (Number.isFinite(g) && g >= 0) return Math.round(g);
    return Math.round(CONFIG_AGUA.grifo?.ecBase || 0);
  }
  return 0;
}

/**
 * ml (o g) por parte: **misma regla** en checklist y Consejos (A+B simétricos y 1 parte = dinámico por EC meta;
 * resto = tabla fabricante × volumen). `ctx`: { modoSoft, usarCalMag }.
 */
function mlAbonoParteDinamica(nut, partIndex, volLitros, ecMetaMicroS, ctx) {
  if (!nut) return 0.1;
  const modoSoft = ctx.modoSoft !== false;
  const usarCalMag = !!ctx.usarCalMag;
  const mlTab = mlNutrientePorParte(nut.id, partIndex, volLitros);
  const ref = getRefDosisFabricante(nut.id);
  const arr = ref.mlPorLitro || [];

  if (nut.tipoDosis === 'polvo' || nut.partes === 3) return mlTab;

  const ecBase = getEcBaseAguaPreAbonoMicroS(volLitros, nut, modoSoft, usarCalMag);
  let pendiente = ecMetaMicroS - ecBase;
  if (!Number.isFinite(pendiente)) pendiente = ecMetaMicroS;
  pendiente = Math.max(50, pendiente);

  if (nut.partes === 2 && arr.length >= 2 && Math.abs(arr[0] - arr[1]) < 1e-6) {
    const slope = ecSubePorMlParABEnVolumen(nut, volLitros);
    if (slope > 0) {
      let mlEc = pendiente / slope;
      mlEc = Math.round(mlEc * 10) / 10;
      const tope = Math.max(mlTab * 1.55, mlTab + 5);
      return Math.min(tope, Math.max(0.5, mlEc));
    }
  }

  if (nut.partes === 1 && arr.length >= 1) {
    const slope = ecSubePorMlParABEnVolumen(nut, volLitros);
    if (slope > 0) {
      let mlEc = pendiente / slope;
      mlEc = Math.round(mlEc * 10) / 10;
      const tope = Math.max(mlTab * 1.55, mlTab + 5);
      return Math.min(tope, Math.max(0.5, mlEc));
    }
  }

  return mlTab;
}

function calcularMlParteNutriente(partIndex) {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};
  const volObj = getVolumenMezclaLitros(cfg);
  const aguaGrifo = (cfg.agua || state.configAgua || 'destilada') === 'grifo';
  return mlAbonoParteDinamica(nut, partIndex, volObj, getRecargaEcMetaMicroS(), {
    modoSoft: !aguaGrifo,
    usarCalMag: !!(nut.calmagNecesario && usarCalMagEnRecarga()),
  });
}

/** Compatibilidad: primera parte; el checklist usa calcularMlParteNutriente por índice. */
function calcularMlAB() {
  return calcularMlParteNutriente(0);
}

/** EC (µS/cm) aportada por CalMag a volumen V, calibrado como CALMAG_POR_ML en 18 L. */
function estimarEcCalMagMicroS(mlCM, volLitros) {
  if (!mlCM || mlCM <= 0) return 0;
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  return Math.round(CALMAG_POR_ML * mlCM * (VOL_OBJETIVO / v));
}

/**
 * Pendiente EC del abono tras CalMag y pendiente «meta de recarga», para pendientes de corrección.
 * Para 2 partes / 1 parte: µS/cm por ml de esa parte (asumiendo proporción fabricante).
 * Para 3 partes: µS/cm por «1 ml en cada botella» a la vez (aprox.).
 */
function ecSubePorMlCorreccion(nut, volLitros) {
  const v = volLitros > 0 ? volLitros : VOL_OBJETIVO;
  const ref = getRefDosisFabricante(nut.id);
  const ecMeta = getRecargaEcMetaMicroS();
  const mlCM = nut.calmagNecesario && usarCalMagEnRecarga() ? calcularMlCalMag() : 0;
  const ecCal = estimarEcCalMagMicroS(mlCM, v);
  const ecN = Math.max(60, ecMeta - ecCal);
  const p = nut.partes || 2;
  const sumMl = ref.mlPorLitro.reduce((s, x) => s + x * v, 0);
  if (sumMl <= 0 || ecN <= 0) return nut.ecPorMl || 25;
  if (p === 1) return ecN / (ref.mlPorLitro[0] * v);
  if (p === 2) return ecN / (ref.mlPorLitro[0] * v);
  return (ecN * 3) / sumMl;
}

function mlCorreccionEcBaja(nut, volLitros, deficitMicroS) {
  const slope = ecSubePorMlCorreccion(nut, volLitros);
  if (!slope || slope <= 0) return 1;
  return Math.max(1, Math.ceil(deficitMicroS / slope));
}

function fmtMlConsejo(v) {
  if (v == null || isNaN(v)) return '0';
  const r = Math.round(v * 10) / 10;
  return Math.abs(r - Math.round(r)) < 1e-6 ? String(Math.round(r)) : r.toFixed(1);
}

/**
 * @param {'soft'|'grifo'} modo — soft = destilada u ósmosis (EC ~0). Mismas reglas dinámicas que el checklist (volumen, EC meta, CalMag / base grifo).
 */
function buildLineasCeldaDosis(ref, nut, volL, modo) {
  const lines = [];
  const orden = nut.orden || [];
  const nPartes = ref.mlPorLitro.length;
  const ecMeta = getRecargaEcMetaMicroS();
  const usarCMFila = modo === 'soft' && usarCalMagConsejosFilaBlanda(nut);

  if (modo === 'soft') {
    if (nut.calmagNecesario) {
      if (usarCMFila) {
        const cmSoft = mlCalMagParaAguaBlanda(volL);
        lines.push(`<span class="consejo-dosis18-k">CalMag</span> ${fmtMlConsejo(cmSoft)} ml → ~${EC_CALMAG_BASE} µS/cm`);
      } else {
        lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-muted82">omitido (pref. checklist / agua blanda sin CalMag)</span>`);
      }
    } else {
      lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-muted72">no necesario</span>`);
    }
  } else {
    lines.push(`<span class="consejo-dosis18-k">CalMag</span> <span class="consejo-calmag-nota-grifo">${meteoEscHtml(ref.calmagGrifoNota)}</span>`);
  }

  const suf = dosisSufijoNutriente(nut);
  const usarCM = modo === 'soft' && usarCMFila;
  for (let i = 0; i < nPartes; i++) {
    const label = orden[i] || ('Parte ' + String.fromCharCode(65 + i));
    const mlVal = mlAbonoParteDinamica(nut, i, volL, ecMeta, {
      modoSoft: modo === 'soft',
      usarCalMag: usarCM,
    });
    lines.push(`<span class="consejo-dosis18-k">${meteoEscHtml(label)}</span> ${fmtMlConsejo(mlVal)}${suf}`);
  }

  return lines.join('<br>');
}

function buildHtmlTablaPreparacionFabricante18L() {
  const cfg = state.configTorre || {};
  const Vraw = getVolumenMezclaLitros(cfg);
  const V = Math.round(Vraw * 10) / 10;
  const vCap = getVolumenDepositoMaxLitros(cfg);
  const capNota = V < vCap - 0.05
    ? ' Capacidad máx. del depósito: <strong>' + vCap + ' L</strong> (esta tabla usa <strong>' + V + ' L</strong> de mezcla).'
    : '';
  const ecUsada = getRecargaEcMetaMicroS();
  const aguaK = cfg.agua || state.configAgua || 'destilada';
  const aguaNom = aguaK === 'grifo' ? 'Grifo' : aguaK === 'osmosis' ? 'Ósmosis' : 'Destilada';
  const ecManual = cfg.checklistEcObjetivoUs;
  const ecOrigen = (Number.isFinite(ecManual) && ecManual >= 200 && ecManual <= 6000)
    ? 'objetivo manual (checklist paso 6)'
    : 'óptimo automático (cultivos / nutriente activo)';
  const prefCM = usarPreferenciaCalMagRecargaGlobal();
  const leyendaBlanda = aguaK === 'grifo'
    ? `Columnas destilada/ósmosis = guía si mezclas con <strong>agua blanca</strong> (con CalMag en filas que lo requieren). Tu tipo de agua en Mediciones: <strong>${aguaNom}</strong>.`
    : `Tipo de agua (instalación activa / Mediciones): <strong>${aguaNom}</strong>. CalMag en esas columnas: <strong>${prefCM ? 'sí' : 'no'}</strong> (pref. checklist).`;

  const nutActivo = getNutrienteTorre();
  const ref = getRefDosisFabricante(nutActivo.id);
  const cSoft = buildLineasCeldaDosis(ref, nutActivo, V, 'soft');
  const cGrifo = buildLineasCeldaDosis(ref, nutActivo, V, 'grifo');
  const rows = `
      <tr>
        <td>${meteoEscHtml(nutActivo.bandera || '')} ${meteoEscHtml(nutActivo.nombre)}
          <div class="consejo-dosis18-fuente">${meteoEscHtml(ref.fuente)}</div>
        </td>
        <td class="consejo-dosis18-cell">${cSoft}</td>
        <td class="consejo-dosis18-cell">${cSoft}</td>
        <td class="consejo-dosis18-cell">${cGrifo}</td>
      </tr>`;

  return `
    <div class="consejo-dosis18-wrap" id="consejos-tabla-dosis-18l">
      <div class="consejo-titulo consejo-titulo--mb8">Mezcla dinámica · <strong>${meteoEscHtml(nutActivo.nombre)}</strong> · <strong>${V} L</strong> · EC <strong>${ecUsada} µS/cm</strong> <span class="consejo-ec-meta">(${ecOrigen})</span></div>
      <div class="consejo-ecph-note consejo-ecph-note--mb">
        Solo el <strong>nutriente activo</strong> de la instalación (cámbialo en la pestaña Sistema o en la configuración). Misma regla que el checklist: litros de mezcla (o capacidad máx. si no indicas margen), EC objetivo y <code>ecPorMl</code>.${capNota} ${leyendaBlanda}
        Columna <strong>grifo</strong>: pendiente hacia la misma EC restando la <strong>EC base</strong> del agua (Mediciones). La ficha bajo el nombre resume la orientación del fabricante.
        <strong>A+B simétricos</strong> y <strong>1 parte</strong>: cálculo EC. <strong>3 botellas</strong> y <strong>A+B distintas</strong>: tabla × volumen. Comprueba con el <strong>medidor</strong>.
      </div>
      <table class="consejo-dosis18-table">
        <thead>
          <tr>
            <th>Nutriente</th>
            <th>Destilada<br>${V} L</th>
            <th>Ósmosis<br>${V} L</th>
            <th>Grifo<br>${V} L</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="consejo-ecph-note consejo-ecph-note--mt0">
        Líneas <strong>3 partes</strong>: totales = tabla × volumen (orden <strong>${meteoEscHtml('Micro → Grow → Bloom')}</strong> o equivalente). <strong>1 parte</strong> líquido: dinámico como en checklist si aplica modelo EC; polvo = gramos tabla.
      </div>
    </div>
  `;
}

function buildHtmlTablaConsejosPersonal() {
  const t = state.consejosTablaPersonal;
  if (!t || t.volL == null || !t.nutrienteId) {
    return `
      <div class="consejo-dosis18-wrap consejo-dosis18-miTorre consejo-dosis18-wrap--mt">
        <div class="consejo-titulo consejo-titulo--mb6">Tu tabla (volumen a medida)</div>
        <div class="consejo-ecph-note">
          Al <strong>completar el checklist de recarga</strong> (no es la primera configuración), puedes guardar aquí el nutriente y los litros del depósito.
          Verás la <strong>misma tabla</strong> que arriba (solo tu marca) pero <strong>escalada</strong> a ese volumen, para el <strong>sistema activo</strong> (Torre, NFT o DWC) en la pestaña Sistema.
        </div>
      </div>`;
  }
  const nut = NUTRIENTES_DB.find(n => n.id === t.nutrienteId);
  if (!nut) return '';
  const ref = getRefDosisFabricante(t.nutrienteId);
  const vol = Number(t.volL);
  const cSoft = buildLineasCeldaDosis(ref, nut, vol, 'soft');
  const cGrifo = buildLineasCeldaDosis(ref, nut, vol, 'grifo');
  let fecha = '';
  try {
    fecha = t.updated ? new Date(t.updated).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '';
  } catch (e) { fecha = ''; }

  return `
    <div class="consejo-dosis18-wrap consejo-dosis18-miTorre consejo-dosis18-wrap--mt" id="consejos-tabla-personal">
      <div class="consejo-titulo consejo-titulo--mb8">${consejosTituloInstalacionSistemaLinea()} · ${meteoEscHtml(nut.nombre)} · ${fmtMlConsejo(vol)} L</div>
      <div class="consejo-ecph-note consejo-ecph-note--mb">
        Misma lógica dinámica que la tabla general (EC objetivo recarga, CalMag/blanca, grifo con EC base). Actualizado: ${meteoEscHtml(fecha || '—')}
      </div>
      <table class="consejo-dosis18-table">
        <thead><tr><th>Agua base</th><th>Preparación (ml)</th></tr></thead>
        <tbody>
          <tr><td>Destilada (EC ≈ 0)</td><td class="consejo-dosis18-cell">${cSoft}</td></tr>
          <tr><td>Ósmosis (EC ≈ 0)</td><td class="consejo-dosis18-cell">${cSoft}</td></tr>
          <tr><td>Grifo</td><td class="consejo-dosis18-cell">${cGrifo}</td></tr>
        </tbody>
      </table>
      <button type="button" class="btn btn-ghost consejo-quitar-tabla-btn" onclick="borrarConsejosTablaPersonal()">Quitar tabla guardada</button>
    </div>`;
}

function ensureCtpNutrienteOptions() {
  const sel = document.getElementById('ctpNutrienteId');
  if (!sel || sel.dataset.filled === '1') return;
  sel.dataset.filled = '1';
  sel.innerHTML = NUTRIENTES_DB.map(n =>
    `<option value="${n.id}">${meteoEscHtml(n.nombre)}</option>`
  ).join('');
}

function abrirModalConsejosTablaPersonal(volSugerido) {
  const m = document.getElementById('modalConsejosTablaPersonal');
  if (!m) return;
  ensureCtpNutrienteOptions();
  const cfg = state.configTorre || {};
  const vIn = document.getElementById('ctpVolLitros');
  const sel = document.getElementById('ctpNutrienteId');
  const vs = parseFloat(volSugerido);
  if (vIn) {
    const defL = getVolumenMezclaLitros(cfg);
    vIn.value = (!isNaN(vs) && vs > 0) ? String(vs) : String(defL);
  }
  if (sel) {
    try {
      const nut = getNutrienteTorre();
      sel.value = nut.id;
    } catch (e) {
      sel.selectedIndex = 0;
    }
  }
  m.classList.add('open');
  a11yDialogOpened(m);
}

function cerrarModalConsejosTablaPersonal(ev) {
  const m = document.getElementById('modalConsejosTablaPersonal');
  if (!m || !m.classList.contains('open')) return;
  if (ev && ev.currentTarget === m && ev.target !== m) return;
  m.classList.remove('open');
  a11yDialogClosed(m);
}

function guardarConsejosTablaPersonal() {
  const vIn = document.getElementById('ctpVolLitros');
  const sel = document.getElementById('ctpNutrienteId');
  const vol = parseFloat(vIn && vIn.value);
  if (!vol || isNaN(vol) || vol < 1 || vol > 500) {
    showToast('Indica un volumen válido (1–500 L)', true);
    return;
  }
  const nid = sel && sel.value;
  if (!nid) {
    showToast('Elige un nutriente', true);
    return;
  }
  state.consejosTablaPersonal = {
    volL: Math.round(vol * 10) / 10,
    nutrienteId: nid,
    updated: new Date().toISOString(),
  };
  saveState();
  cerrarModalConsejosTablaPersonal();
  showToast('📋 Tabla guardada en Consejos (EC / pH)');
  if (typeof consejoCatActiva !== 'undefined' && consejoCatActiva === 'ecph') renderConsejosLista();
}

function borrarConsejosTablaPersonal() {
  delete state.consejosTablaPersonal;
  saveState();
  showToast('Tabla personal eliminada');
  if (typeof consejoCatActiva !== 'undefined' && consejoCatActiva === 'ecph') renderConsejosLista();
}

function mostrarTabConsejos(tab) {
  const panelC = document.getElementById('panelConsejos');
  const panelD = document.getElementById('panelDiagnostico');
  const btnC   = document.getElementById('btnTabConsejos');
  const btnD   = document.getElementById('btnTabDiag');
  if (tab === 'consejos') {
    panelC.style.display = 'block';
    panelD.style.display = 'none';
    btnC.style.background = '#f0fdf4'; btnC.style.borderColor = '#16a34a'; btnC.style.color = '#15803d';
    btnD.style.background = '#fff';    btnD.style.borderColor = '#e5e7eb'; btnD.style.color = '#374151';
  } else {
    panelC.style.display = 'none';
    panelD.style.display = 'block';
    btnD.style.background = '#f0fdf4'; btnD.style.borderColor = '#16a34a'; btnD.style.color = '#15803d';
    btnC.style.background = '#fff';    btnC.style.borderColor = '#e5e7eb'; btnC.style.color = '#374151';
    renderDiagnostico();
  }
}

function a11yConsejosTablistKeydown(ev) {
  const tabs = [...document.querySelectorAll('#consejosCats [role="tab"]')];
  if (!tabs.length) return;
  const i = tabs.indexOf(document.activeElement);
  if (i < 0 && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'Home' || ev.key === 'End')) {
    tabs[0].focus();
    ev.preventDefault();
    return;
  }
  if (i < 0) return;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
    ev.preventDefault();
    tabs[(i + 1) % tabs.length].focus();
  } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    tabs[(i - 1 + tabs.length) % tabs.length].focus();
  } else if (ev.key === 'Home') {
    ev.preventDefault();
    tabs[0].focus();
  } else if (ev.key === 'End') {
    ev.preventDefault();
    tabs[tabs.length - 1].focus();
  }
}

/** Refresca la pestaña Consejos si está visible (EC, volumen, agua, checklist). */
function refreshConsejosSiVisible() {
  const p = document.getElementById('tab-consejos');
  if (p && p.classList.contains('active')) renderConsejos();
}

function renderConsejos() {
  const cats = document.getElementById('consejosCats');
  const lista = document.getElementById('consejosLista');
  cats.setAttribute('role', 'tablist');
  cats.setAttribute('aria-label', 'Categorías de consejos');

  if (!cats.dataset.a11yKeyNavBound) {
    cats.dataset.a11yKeyNavBound = '1';
    cats.addEventListener('keydown', a11yConsejosTablistKeydown);
  }

  cats.innerHTML = Object.entries(CONSEJOS_DATA).map(([key, cat]) => `
    <button type="button" class="consejo-cat-btn ${key === consejoCatActiva ? 'active' : ''}"
      role="tab"
      aria-selected="${key === consejoCatActiva ? 'true' : 'false'}"
      id="catBtn-${key}"
      onclick="selConsejoCat('${key}')"
      aria-label="Consejos: ${cat.nombre}"
      ${key === consejoCatActiva ? `style="--consejo-tab-accent:${cat.color}"` : ''}>
      ${cat.nombre}
    </button>
  `).join('');

  lista.setAttribute('role', 'tabpanel');
  lista.setAttribute('aria-labelledby', 'catBtn-' + consejoCatActiva);

  renderConsejosLista();
}

function selConsejoCat(key) {
  consejoCatActiva = key;
  renderConsejos();
  document.getElementById('consejosLista').scrollTop = 0;
}

function htmlConsejoCard(cat, c) {
  return `
    <div class="consejo-card">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-texto">${c.texto}</div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

/** Bloque visible: mismos criterios que el checklist de recarga para la instalación activa. */
function buildConsejosNutrienteChecklistResumenHtml(nut, cfg) {
  const t = typeof tipoInstalacionNormalizado === 'function' ? tipoInstalacionNormalizado(cfg) : 'torre';
  const sysLargo =
    t === 'nft' ? 'NFT — canales en recirculación' : t === 'dwc' ? 'DWC — raíces en el depósito' : 'Torre vertical';
  const sysBreve =
    typeof etiquetaSistemaHidroponicoBreve === 'function' ? etiquetaSistemaHidroponicoBreve(cfg) : t === 'nft' ? 'NFT' : t === 'dwc' ? 'DWC' : 'Torre';

  let nombreInst = '';
  try {
    const ta = typeof getTorreActiva === 'function' ? getTorreActiva() : null;
    if (ta && ta.nombre) nombreInst = String(ta.nombre).trim();
  } catch (e) {}

  let objTxt = '—';
  try {
    if (t === 'dwc' && typeof dwcGetObjetivoSpec === 'function' && typeof dwcGetObjetivoCultivo === 'function') {
      const s = dwcGetObjetivoSpec(dwcGetObjetivoCultivo(cfg));
      objTxt = meteoEscHtml(s.label) + ' · ' + meteoEscHtml(s.densidadTxt);
    } else if (t === 'nft' && typeof nftGetObjetivoSpec === 'function' && typeof nftGetObjetivoCultivo === 'function') {
      const s = nftGetObjetivoSpec(nftGetObjetivoCultivo(cfg));
      objTxt = meteoEscHtml(s.label) + ' · ' + meteoEscHtml(s.densidadTxt);
    } else if (t === 'torre' && typeof torreGetObjetivoSpec === 'function' && typeof torreGetObjetivoCultivo === 'function') {
      const s = torreGetObjetivoSpec(torreGetObjetivoCultivo(cfg));
      objTxt = meteoEscHtml(s.label) + ' · ' + meteoEscHtml(s.densidadTxt);
    }
  } catch (e) {}

  const ecOpt = typeof getECOptimaTorre === 'function' ? getECOptimaTorre() : { min: 900, max: 1400 };
  const ecMeta = typeof getRecargaEcMetaMicroS === 'function' ? getRecargaEcMetaMicroS() : 1100;
  const pHR =
    typeof torreGetPhRangoObjetivo === 'function' ? torreGetPhRangoObjetivo(nut, cfg) : nut && nut.pHRango ? nut.pHRango : [5.5, 6.5];
  const phTxt = meteoEscHtml(String(pHR[0])) + ' – ' + meteoEscHtml(String(pHR[1]));

  const volMax = typeof getVolumenDepositoMaxLitros === 'function' ? getVolumenDepositoMaxLitros(cfg) : 0;
  const volObj = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(cfg) : 0;
  let volTxt = '';
  if (volObj > 0) {
    volTxt =
      volMax > 0 && volObj < volMax - 0.05
        ? '<strong>' + meteoEscHtml(String(volObj)) + ' L</strong> de mezcla (depósito hasta <strong>' + meteoEscHtml(String(volMax)) + ' L</strong>)'
        : '<strong>' + meteoEscHtml(String(volObj)) + ' L</strong>';
  } else {
    volTxt = 'Configura capacidad y litros de mezcla en la pestaña <strong>Sistema</strong>.';
  }

  const manualEc = cfg && cfg.checklistEcObjetivoUs;
  const metaFuente =
    Number.isFinite(manualEc) && manualEc >= 200 && manualEc <= 6000
      ? '<span class="consejo-checklist-resumen-note">Meta EC <strong>fijada a mano</strong> en el checklist.</span>'
      : '<span class="consejo-checklist-resumen-note">Meta EC = punto medio del rango orientativo' +
        (t === 'torre' || t === 'dwc' ? ' (ajustado por <strong>objetivo de cultivo</strong> en ' + meteoEscHtml(sysBreve) + ')' : '') +
        '; puede atenuarse si hay <strong>plántulas</strong> recién trasplantadas.</span>';

  const fa = typeof getFactorArranquePlantulaHidro === 'function' ? getFactorArranquePlantulaHidro() : 1;
  const plantulaExtra =
    fa < 1 && !(Number.isFinite(manualEc) && manualEc >= 200 && manualEc <= 6000)
      ? '<p class="consejo-checklist-resumen-foot">Atenuación de arranque en hidro (~' +
        Math.round((1 - fa) * 100) +
        '%): las mezclas del checklist van algo más suaves en las primeras ~2 semanas tras el trasplante.</p>'
      : '';

  const instLine =
    nombreInst !== ''
      ? '<p class="consejo-checklist-resumen-inst"><strong>' + meteoEscHtml(nombreInst) + '</strong> · ' + meteoEscHtml(sysBreve) + '</p>'
      : '<p class="consejo-checklist-resumen-inst">Instalación activa · <strong>' + meteoEscHtml(sysBreve) + '</strong></p>';

  return (
    '<div class="consejo-checklist-resumen" role="region" aria-label="Valores para el checklist según el sistema seleccionado">' +
    '<div class="consejo-checklist-resumen-kicker">📋 Valores para el checklist (recarga)</div>' +
    instLine +
    '<p class="consejo-checklist-resumen-decl"><strong>Sistema configurado:</strong> ' +
    meteoEscHtml(sysLargo) +
    '. Lo siguiente es lo que usa la app en el <strong>checklist de recarga</strong> para <em>esta</em> instalación y nutriente seleccionado.</p>' +
    '<dl class="consejo-checklist-resumen-dl">' +
    '<dt>Objetivo de cultivo</dt><dd>' +
    objTxt +
    '</dd>' +
    '<dt>Rango EC orientativo</dt><dd><strong>' +
    ecOpt.min +
    ' – ' +
    ecOpt.max +
    '</strong> µS/cm</dd>' +
    '<dt>EC meta (checklist)</dt><dd><strong>' +
    ecMeta +
    '</strong> µS/cm · ' +
    metaFuente +
    '</dd>' +
    '<dt>pH orientativo</dt><dd><strong>' +
    phTxt +
    '</strong></dd>' +
    '<dt>Volumen de mezcla</dt><dd>' +
    volTxt +
    '</dd>' +
    '</dl>' +
    plantulaExtra +
    '</div>'
  );
}

/** Protocolo y reposición en Consejos → Agua y EC: según nutriente de la instalación activa. */
function buildConsejosAguaNutrienteDinamico() {
  const nut = getNutrienteTorre();
  const cfg = state.configTorre || {};
  const volMax = getVolumenDepositoMaxLitros(cfg);
  const volObj = getVolumenMezclaLitros(cfg);
  const ecOpt = getECOptimaTorre();
  const ecMin = ecOpt.min;
  const bloqueChecklist = buildConsejosNutrienteChecklistResumenHtml(nut, cfg);
  const pasos = (nut.protocolo || []).map(p =>
    '<li class="consejo-proto-li">' + meteoEscHtml(p) + '</li>'
  ).join('');
  const listaProto = pasos
    ? '<ol class="consejo-proto-ol">' + pasos + '</ol>'
    : '<p class="consejo-proto-fallback">Consulta el envase y el checklist de recarga de la app.</p>';

  let ordenWarn = '';
  if (nut.partes === 2 && nut.orden && nut.orden.length >= 2) {
    ordenWarn = '<strong>No mezclar concentrados</strong>: añade <strong>' + meteoEscHtml(nut.orden[0]) +
      '</strong> y <strong>' + meteoEscHtml(nut.orden[1]) + '</strong> en el orden del fabricante, bien diluidos.';
  } else if (nut.partes === 3 && nut.orden && nut.orden.length >= 3) {
    ordenWarn = 'Respeta el orden del fabricante: ' + nut.orden.map(o => '<strong>' + meteoEscHtml(o) + '</strong>').join(' → ') +
      '. No mezcles los concentrados entre sí.';
  } else if (nut.partes === 1 && nut.orden && nut.orden[0]) {
    ordenWarn = 'Una sola base: <strong>' + meteoEscHtml(nut.orden[0]) + '</strong>.';
  }

  const calmagOk = nut.calmagNecesario
    ? 'Con agua blanda / destilada suele necesitarse <strong>CalMag</strong> (o el suplemento Ca/Mg que indique la marca).'
    : 'Esta línea suele llevar Ca/Mg integrado: <strong>no añadas CalMag</strong> salvo que el fabricante lo indique.';

  const phOk = nut.pHBuffer
    ? 'Esta marca tiene <strong>buffers de pH</strong>: al mezclar, sigue las mismas precauciones que en el checklist (no exceder corrector al inicio).'
    : 'Ajusta el pH al rango <strong>' + nut.pHRango[0] + '–' + nut.pHRango[1] + '</strong> indicado para ' + meteoEscHtml(nut.nombre) + '.';

  const mlCM = calcularMlCalMag();
  const ref = getRefDosisFabricante(nut.id);
  const cmPL = volObj > 0 ? mlCM / volObj : 0;
  const rnd = x => Math.round(x * 100) / 100;

  const partesRepos = [];
  if (usarCalMagEnRecarga() && cmPL > 0) {
    partesRepos.push(rnd(cmPL) + ' ml CalMag');
  }
  if (nut.partes === 1 && nut.orden && nut.orden[0]) {
    partesRepos.push(rnd(ref.mlPorLitro[0]) + ' ml ' + nut.orden[0]);
  } else if (nut.partes === 2 && nut.orden && nut.orden.length >= 2) {
    partesRepos.push(rnd(ref.mlPorLitro[0]) + ' ml ' + nut.orden[0]);
    partesRepos.push(rnd(ref.mlPorLitro[1]) + ' ml ' + nut.orden[1]);
  } else if (nut.partes >= 3 && nut.orden) {
    nut.orden.slice(0, nut.partes).forEach((o, i) => {
      partesRepos.push(rnd(ref.mlPorLitro[i] || 0) + ' ml ' + o);
    });
  }

  const bloqueDosis = partesRepos.length
    ? 'Si la <strong>EC ha bajado</strong> respecto al objetivo del cultivo, como guía <strong>por cada litro</strong> repuesto: ' +
      partesRepos.map(p => meteoEscHtml(p)).join(' + ') + '. Remueve, espera unos minutos con difusor o bomba y mide de nuevo EC y pH.'
    : 'Si la EC ha bajado, usa la misma proporción que en tu última recarga completa o el checklist de la app.';

  const volRefHtml = volObj < volMax - 0.05
    ? 'mezcla de <strong>' + volObj + ' L</strong> (depósito hasta <strong>' + volMax + ' L</strong>)'
    : '<strong>' + volObj + ' L</strong>';
  const textoRepos =
    'Volumen de referencia en la app: ' + volRefHtml + '. Repone con la <strong>misma calidad de agua</strong> que usas en recargas (según tu configuración). ' +
    '<strong>Si la EC sigue en rango</strong> para tus plantas, añade solo agua. ' + bloqueDosis;

  return htmlConsejoCard({
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)'
  }, {
    icono:'🧪',
    titulo:'Protocolo de nutrientes — ' + meteoEscHtml(nut.nombre),
    texto:
      bloqueChecklist +
      '<p class="consejo-p consejo-p--tight">Pasos orientativos del fabricante para <strong>' +
      meteoEscHtml(nut.nombre) +
      '</strong>. El orden coincide con el checklist de recarga.</p>' +
      listaProto +
      (ordenWarn ? '<p class="consejo-orden-warn">' + ordenWarn + '</p>' : ''),
    alerta:{ tipo:'ok', txt:'✅ ' + calmagOk + ' ' + phOk }
  }) + htmlConsejoCard({
    nombre: '💧 Agua y EC', color: '#1d4ed8', bg: 'rgba(37,99,235,0.1)'
  }, {
    icono:'💧',
    titulo:'Reposición de agua — ' + meteoEscHtml(nut.nombre),
    texto: textoRepos,
    alerta:{ tipo:'info', txt:'ℹ️ EC orientativa para valorar si hace falta nutriente: por debajo del rango (~' + ecMin +
      ' µS/cm como referencia baja del sistema). En verano el nivel puede bajar más rápido; revisa cada 2–3 días.' }
  });
}

function cultivoEstadoChipHtml(estado) {
  const k = estado === 'bad' ? 'bad' : estado === 'warn' ? 'warn' : 'ok';
  const txt = k === 'ok' ? 'OK' : k === 'warn' ? 'Ajustar' : 'No recomendado';
  return '<span class="cultivo-status-chip cultivo-status-chip--' + k + '">' + txt + '</span>';
}

function buildConsejoObjetivoTorreCultivo() {
  const cfg = state.configTorre || {};
  if (cfg.tipoInstalacion !== 'torre') return '';
  if (typeof torreGetObjetivoSpec !== 'function' || typeof torreGetObjetivoCultivo !== 'function') return '';
  const sp = torreGetObjetivoSpec(torreGetObjetivoCultivo(cfg));
  return htmlConsejoCard(CONSEJOS_DATA.cultivo, {
    icono: '🧭',
    titulo: 'Objetivo de cosecha en torre vertical',
    texto:
      'Objetivo activo: <strong>' +
      meteoEscHtml(sp.label) +
      '</strong>. Densidad orientativa <strong>' +
      meteoEscHtml(sp.densidadTxt) +
      '</strong> · ' +
      meteoEscHtml(sp.cicloTxt) +
      '.',
    alerta: { tipo: 'info', txt: 'ℹ️ Puedes cambiarlo en Sistema → Objetivo en torre vertical.' },
  });
}

/** Tabla de tiempos orientativos de germinación por cada cultivo del catálogo. */
function buildConsejoTablaGerminacionCultivos() {
  if (typeof getGerminacionSpecPorVariedad !== 'function' || typeof CULTIVOS_DB === 'undefined') return '';
  const grupoOrder = {
    lechugas: 0,
    hojas: 1,
    asiaticas: 2,
    hierbas: 3,
    frutos: 4,
    fresas: 5,
    raices: 6,
    microgreens: 7,
  };
  const sorted = CULTIVOS_DB.slice().sort((a, b) => {
    const ga = grupoOrder[a.grupo] != null ? grupoOrder[a.grupo] : 9;
    const gb = grupoOrder[b.grupo] != null ? grupoOrder[b.grupo] : 9;
    if (ga !== gb) return ga - gb;
    return String(a.nombre).localeCompare(b.nombre, 'es');
  });
  const rows = sorted
    .map(c => {
      const s = getGerminacionSpecPorVariedad(c.nombre);
      return (
        '<tr><td>' +
        cultivoEmojiHtml(c, 1) +
        ' ' +
        meteoEscHtml(c.nombre) +
        '</td><td>' +
        meteoEscHtml(s.osc) +
        '</td><td>' +
        meteoEscHtml(s.emerg) +
        '</td><td>' +
        meteoEscHtml(s.planton) +
        '</td></tr>'
      );
    })
    .join('');
  const tableInner =
    '<div class="hc-germ-table-scroll">' +
    '<table class="hc-germ-table">' +
    '<thead><tr><th scope="col">Cultivo</th><th scope="col">Oscuro / uniformidad</th><th scope="col">Hasta emergencia</th><th scope="col">Hasta plantón</th></tr></thead>' +
    '<tbody>' +
    rows +
    '</tbody></table></div>';
  const tableBlock =
    typeof hcWrapOrigenDetails === 'function'
      ? hcWrapOrigenDetails(tableInner, 'Tabla completa por cultivo (desplegar)', false)
      : tableInner;
  return htmlConsejoCard(CONSEJOS_DATA.cultivo, {
    icono: '📆',
    titulo: 'Germinación en semillero — tabla por cultivo',
    texto:
      '<p class="consejo-germ-intro">Rangos <strong>orientativos</strong> (bandeja, Tª moderada). El sobre del semillero y tu invernadero marcan el ritmo real.</p>' +
      tableBlock +
      '<p class="consejo-germ-foot">En <strong>Torre → Asignar cultivo</strong>, si eliges <strong>Germinación propia</strong>, la guía va en un <strong>desplegable</strong> y se actualiza al cambiar la variedad.</p>',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ “Hasta plantón” es cuando suele irse al NFT/DWC/torre; la fecha en la ficha debe ser el <strong>traslado al sistema</strong>.',
    },
  });
}

function buildConsejosNftHidraulica() {
  const cat = CONSEJOS_DATA.nft;
  const cfg = state.configTorre || {};
  const resumenTxt = cfg.tipoInstalacion === 'nft' ? nftTextoResumenInstalacion(cfg) : '';
  const recoNft = cfg.tipoInstalacion === 'nft' && typeof nftRecomendacionCultivoDesdeConfig === 'function'
    ? nftRecomendacionCultivoDesdeConfig(cfg)
    : null;
  const b = cfg.tipoInstalacion === 'nft' ? getNftBombaDesdeConfig(cfg) : null;
  let dyn;
  if (b) {
    const vDepCfg = parseFloat(String(cfg.volDeposito ?? '').replace(',', '.'));
    const vDepAct = Number.isFinite(vDepCfg) && vDepCfg > 0 ? Math.round(vDepCfg) : null;
    dyn = htmlInnerConsejoCard(cat, {
      icono: '⚡',
      titulo: 'Tu instalación NFT — cumplimiento orientativo',
      html:
        (resumenTxt
          ? '<p class="consejo-p consejo-p--lead">' + escHtmlUi(resumenTxt) + '</p>'
          : '') +
        '<p class="consejo-p consejo-p--mb10">Lo importante aquí es si el <strong>depósito</strong> y la <strong>bomba</strong> encajan con un criterio práctico (24 h, película fina, pérdidas típicas). Los números detallados van en el desplegable. Contrasta siempre con la <strong>curva Q–H</strong> del fabricante.</p>' +
        nftDepositoVeredictoBloqueHtml(b, vDepAct) +
        nftWrapDetalleTecnicoSummary(nftBombaDetalleTecnicoHtml(b), 'Bomba, caudal y geometría (detalle)'),
    });
  } else {
    dyn = htmlInnerConsejoCard(cat, {
      icono: 'ℹ️',
      titulo: 'Configuración NFT',
      html:
        '<p class="consejo-p consejo-p--flush">Elige en <strong>Sistema</strong> instalación <strong>NFT</strong> y completa canal, lámina y longitud en el checklist (N·ref) o en el asistente para ver aquí el criterio orientativo de tu caso.</p>',
    });
  }
  const formula = htmlConsejoCard(cat, {
    icono: '📐',
    titulo: 'Cómo se estima el caudal (orientativo)',
    texto:
      'Se aproxima el <strong>área</strong> de la lámina en el fondo del canal: en tubo redondo, una <em>cuerda</em> del arco inundado; en perfil rectangular, <strong>ancho útil × altura de lámina</strong>. Con velocidad de película ~0,08–0,12 m/s (según pendiente) se obtiene L/h por canal. La app <strong>combina</strong> este resultado con un modelo empírico y adopta el caudal más exigente. No sustituye medición in situ ni el catálogo de la bomba.',
    alerta: { tipo: 'info', txt: 'ℹ️ Lámina habitual ~2–4 mm (~3 mm); si sube mucho, suele haber exceso de caudal o pendiente insuficiente.' },
  });
  const cultivo = recoNft
    ? htmlConsejoCard(cat, {
        icono: '🧭',
        titulo: 'Diseño del canal según cultivo objetivo',
        // Modo compacto: conservar decisión principal sin saturar texto.
        texto:
          '<strong>' +
          meteoEscHtml(recoNft.perfil.etiqueta) +
          '</strong> · canal <strong>Ø' +
          recoNft.perfil.canalMinMm +
          '–' +
          recoNft.perfil.canalMaxMm +
          ' mm</strong> · cesta <strong>' +
          meteoEscHtml(recoNft.perfil.cestaTxt) +
          '</strong> · separación <strong>' +
          meteoEscHtml(recoNft.perfil.sepTxt) +
          '</strong>.<br>Canal (Ø actual): <strong>' +
          (recoNft.diamActualMm != null ? 'Ø' + recoNft.diamActualMm + ' mm' : '—') +
          '</strong> · ' +
          cultivoEstadoChipHtml(recoNft.estado) +
          '.',
        alerta: {
          tipo: recoNft.estado === 'bad' ? 'warn' : recoNft.estado === 'warn' ? 'warn' : 'ok',
          txt:
            recoNft.estado === 'bad'
              ? '⚠️ Mejor otro sistema o NFT de frutos dedicado.'
              : recoNft.estado === 'warn'
                ? '⚠️ Ajusta diámetro de canal para mejorar el encaje.'
                : '✅ Configuración alineada con el cultivo objetivo.',
        },
      })
    : '';
  const docWrap =
    '<div class="consejo-card"><div class="consejo-texto consejo-texto--flush">' +
    nftTuberiaReferenciaDocHtml({ forChecklist: true }) +
    '</div></div>';
  return dyn + cultivo + formula + docWrap;
}

function buildConsejosDwcDifusorBloque() {
  const cat = CONSEJOS_DATA.dwc;
  const rec =
    (state.configTorre || {}).tipoInstalacion === 'dwc'
      ? dwcRecomendacionDifusorCompletaDesdeConfig(state.configTorre)
      : null;
  let dyn = '';
  if (rec) {
    dyn =
      '<div class="consejo-dwc-rec-box">' +
      '<div class="consejo-dwc-rec-kicker">Según litros de mezcla y cestas (mismo criterio que checklist y Sistema)</div>' +
      dwcFormatHtmlRecomendacionDifusorCore(rec) +
      '</div>';
  } else {
    dyn =
      '<p class="consejo-p consejo-p--tight">Activa una instalación <strong>DWC</strong> y revisa volumen y rejilla en <strong>Sistema</strong> para ver aquí la recomendación de bomba y difusores.</p>';
  }
  return htmlInnerConsejoCard(cat, {
    icono: '💨',
    titulo: 'Bomba de aire y difusor según litros',
    html:
      '<p class="consejo-p">La solución nutritiva se oxigena con <strong>bomba de aire</strong> + <strong>difusor</strong> en el fondo. En webs y tiendas de hidroponía lo habitual son <strong>piedras porosas planas</strong> o barras (burbujeo repartido en horizontal), <strong>discos</strong>, <strong>bolas</strong> y cilindros microporosos: elige según el fondo de tu cubo y que el aire <strong>no quede solo en un rincón</strong>.</p>' +
      '<p class="consejo-p consejo-p--tight">Burbujas <strong>más finas</strong> suelen intercambiar mejor oxígeno con el agua, pero tapan antes el poro; la bomba debe ser capaz de <strong>vencer la profundidad</strong> del líquido (altura de agua / manguera).</p>' +
      dyn +
      '<p class="consejo-footnote">Orientativo; temperatura, número de plantas y forma del depósito cambian lo que necesitas. Si huele mal o las raíces se ablandan, sube aeración o limpia/sustituye el difusor.</p>',
    alerta: {
      tipo: 'warn',
      txt: '⚠️ No sustituye el dato del fabricante de la bomba ni un medidor de oxígeno disuelto.',
    },
  });
}

function buildConsejosDwc() {
  const cat = CONSEJOS_DATA.dwc;
  const cfg = state.configTorre || {};
  const objKey =
    typeof dwcGetObjetivoCultivo === 'function' ? dwcGetObjetivoCultivo(cfg) : 'final';
  const objSpec =
    typeof dwcGetObjetivoSpec === 'function'
      ? dwcGetObjetivoSpec(objKey)
      : { label: 'Planta adulta (tamaño completo)', litrosTxt: '3–5 L/planta', ccTxt: '15–25 cm' };
  const recoCultivo =
    cfg.tipoInstalacion === 'dwc' && typeof dwcRecomendacionCultivoDesdeConfig === 'function'
      ? dwcRecomendacionCultivoDesdeConfig(cfg)
      : null;
  const intro = htmlConsejoCard(cat, {
    icono: '🌊',
    titulo: 'DWC en esta app',
    texto:
      'En <strong>Deep Water Culture</strong> las raíces cuelgan en un depósito con la <strong>misma solución</strong> para todas las plantas. La tapa se modela con rejilla <strong>filas × cestas</strong> (prismático o cilíndrico en planta); el diagrama usa esa cuadrícula. Las medidas del depósito sirven para <strong>capacidad en litros</strong>, difusión y el contexto visual.',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Misma EC y mismo pH en todo el depósito: mezcla solo cultivos compatibles (véase compatibilidad de cultivos en torre).',
    },
  });
  const vol = htmlConsejoCard(cat, {
    icono: '💧',
    titulo: 'Litros y dosis',
    texto:
      'Según la forma del depósito: <strong>prismático</strong> L×A×P; <strong>cilíndrico</strong> Ø interior × profundidad/altura útil del líquido; <strong>troncopiramidal</strong> litros útiles medidos. Si indicas <strong>litros de mezcla</strong> por debajo del máximo, checklist y <strong>Consejos → Agua y EC</strong> escalan nutrientes con ese volumen. Si lo dejas vacío, la app usa la capacidad calculada o un valor orientativo interno.',
    alerta: {
      tipo: 'ok',
      txt: '✅ En Sistema y asistente verás litros útiles al completar las medidas del depósito (o el volumen manual en tronco).',
    },
  });
  const densidad = htmlConsejoCard(cat, {
    icono: '🧭',
    titulo: 'Objetivo de densidad activo',
    texto:
      'En esta instalación está activo <strong>' +
      meteoEscHtml(objSpec.label) +
      '</strong>. Como referencia de diseño: <strong>' +
      meteoEscHtml(objSpec.litrosTxt) +
      '</strong> y separación <strong>' +
      meteoEscHtml(objSpec.ccTxt) +
      '</strong> centro a centro.' +
      (recoCultivo
        ? '<br>Grupo detectado: <strong>' +
          meteoEscHtml(recoCultivo.perfil.etiqueta) +
          '</strong> · cesta recomendada <strong>' +
          meteoEscHtml(recoCultivo.perfil.cestaTxt) +
          '</strong> · actual <strong>' +
          (recoCultivo.rimActualMm != null ? recoCultivo.rimActualMm + ' mm' : '—') +
          '</strong> · ' +
          cultivoEstadoChipHtml(recoCultivo.estado) +
          '.'
        : ''),
    alerta: {
      tipo:
        recoCultivo && recoCultivo.estado === 'bad'
          ? 'warn'
          : recoCultivo && recoCultivo.estado === 'warn'
            ? 'warn'
            : 'info',
      txt:
        recoCultivo
          ? (recoCultivo.estado === 'ok'
              ? '✅ Configuración alineada con el cultivo objetivo.'
              : recoCultivo.estado === 'warn'
                ? '⚠️ Ajusta diámetro de cesta u objetivo para mejorar el encaje.'
                : '⚠️ Grupo poco recomendable en DWC estándar; mejor sistema dedicado.')
          : 'ℹ️ Puedes cambiarlo en Sistema o en el asistente DWC.',
    },
  });
  const panelLlenDw =
    typeof dwcHtmlDistanciaLlenadoTiempoReal === 'function'
      ? dwcHtmlDistanciaLlenadoTiempoReal(state.configTorre)
      : '';
  const nivelDep = htmlConsejoCard(cat, {
    icono: '📏',
    titulo: 'Llenado: distancia al sustrato (DWC)',
    texto:
      panelLlenDw +
      '<p style="margin:12px 0 0;line-height:1.45;font-size:12px">Modelo para <strong>cultivos de hoja</strong> (lechuga, asiáticas, hojas, hierbas). EC, pH y volumen en <strong>Mediciones</strong> y recargas.</p>',
    alerta: {
      tipo: 'info',
      txt: 'ℹ️ Cálculo en vivo desde sustrato en Sistema + variedad y fecha en cada cesta. Ajusta según observación y temperatura.',
    },
  });
  const difusor = buildConsejosDwcDifusorBloque();
  const med = htmlConsejoCard(cat, {
    icono: '📐',
    titulo: 'Qué es cada medida en Sistema',
    texto:
      '<strong>Prismático:</strong> L, A y P (profundidad/altura <em>útil</em> del líquido, cm) → volumen ≈ L×A×P÷1000. <strong>Cilíndrico:</strong> Ø interior y misma P → volumen ≈ π×(Ø/2)²×P÷1000. <strong>Troncopiramidal:</strong> litros útiles medidos (sin P en el cálculo). <strong>Diám. cesta</strong> = aro en la tapa (mm); <strong>alt. cesta</strong> para el llenado seguro bajo el sustrato. <strong>Marco</strong> y <strong>hueco</strong> entre cestas en el <strong>asistente DWC</strong>; si no los guardaste, el aviso de rejilla usa marco 0 y 4 mm.',
    alerta: { tipo: 'warn', txt: '⚠️ Comprobación orientativa: contrasta con tu tapa real y el diámetro nominal del fabricante.' },
  });
  const extras = htmlConsejoCard(cat, {
    icono: '🫧',
    titulo: 'Cúpulas y entrada de aire',
    texto:
      'Las casillas <strong>cúpulas / humedad</strong> y <strong>entrada de aire</strong> documentan tu montaje para el registro; no sustituyen el cálculo hidráulico detallado (como en NFT).',
    alerta: null,
  });
  const tabla =
    '<div class="consejo-card">' +
    '<div class="consejo-header">' +
    '<div class="consejo-icon" style="--consejo-icon-bg:' +
    cat.bg +
    '">📋</div>' +
    '<div><div class="consejo-titulo">Tamaños de cesta (referencia)</div></div>' +
    '</div>' +
    '<div class="consejo-texto consejo-texto--pt4">' +
    '<div id="mountDwcCestasGuiaConsejos"></div>' +
    '</div>' +
    '</div>';
  return intro + vol + densidad + nivelDep + difusor + med + extras + tabla;
}

/** Tarjeta de consejo con cuerpo HTML controlado (no escapar dos veces). */
function htmlInnerConsejoCard(cat, c) {
  return `
    <div class="consejo-card">
      <div class="consejo-header">
        <div class="consejo-icon" style="--consejo-icon-bg:${cat.bg}">
          ${c.icono}
        </div>
        <div>
          <div class="consejo-titulo">${c.titulo}</div>
        </div>
      </div>
      <div class="consejo-texto">${c.html}</div>
      ${c.alerta ? `
        <div class="consejo-alerta ${c.alerta.tipo}">
          <span>${c.alerta.txt}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderConsejosLista() {
  const cat = CONSEJOS_DATA[consejoCatActiva];
  const lista = document.getElementById('consejosLista');

  if (cat.soloTabla) {
    lista.innerHTML = buildHtmlTablaEcPh() + buildHtmlTablaPreparacionFabricante18L() + buildHtmlTablaConsejosPersonal();
    return;
  }

  if (consejoCatActiva === 'nft') {
    lista.innerHTML = buildConsejosNftHidraulica();
    return;
  }

  if (consejoCatActiva === 'dwc') {
    lista.innerHTML = buildConsejosDwc();
    mountDwcCestasGuiaEnPanelConsejos();
    return;
  }

  if (consejoCatActiva === 'agua') {
    const [cEc, cColor] = cat.consejos;
    lista.innerHTML = htmlConsejoCard(cat, cEc) + buildConsejosAguaNutrienteDinamico() + htmlConsejoCard(cat, cColor);
    return;
  }

  if (consejoCatActiva === 'cultivo') {
    lista.innerHTML =
      cat.consejos.map(c => htmlConsejoCard(cat, c)).join('') +
      buildConsejoObjetivoTorreCultivo() +
      buildConsejoTablaGerminacionCultivos();
    return;
  }

  lista.innerHTML = cat.consejos.map(c => htmlConsejoCard(cat, c)).join('');
}



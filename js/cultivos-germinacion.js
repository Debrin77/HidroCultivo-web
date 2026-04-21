/**
 * Tiempos orientativos de germinación / semillero por grupo y por nombre de cultivo.
 * Tras torre-render-main.js (usa getCultivoDB). Antes de nutrientes-catalog / consejos.
 *
 * Son rangos típicos en bandeja a ~18–22 °C; la semilla real marca el ritmo.
 */

const GERMINACION_GRUPO = {
  lechugas: {
    osc: 'Opcional 0–2 d en oscuro (o luz tenue 16–18 h) para uniformidad.',
    emerg: '2–4 d hasta emergencia visible.',
    planton: '6–12 d con luz hasta 2–3 hojas reales y raíz que llene el plug.',
    nota: 'Muchas lechugas germinan bien a la luz; la oscuridad no es obligatoria.',
  },
  hojas: {
    osc: '1–3 d en oscuro ayuda en hojas pequeñas (rúcula, mostaza blanca).',
    emerg: '2–5 d hasta cotiledones abiertos.',
    planton: '8–16 d bajo luz hasta plantón listo para NFT/DWC/torre.',
    nota: 'Espinaca y berros: frescor; con >24 °C la emergencia se desuniforma.',
  },
  asiaticas: {
    osc: '1–2 d en oscuro (opcional).',
    emerg: '2–4 d.',
    planton: '7–12 d hasta 3–4 hojas; no encharcar el cubo.',
    nota: 'Brásicas de hoja: suelen ser rápidas; espacio para aire en la bandeja.',
  },
  hierbas: {
    osc: '0–5 d (perejil/romero suelen tardar más en asomar).',
    emerg: '3–12 d según especie.',
    planton: '12–35 d hasta plantón vendible; albahaca y cilantro en la parte baja del rango si hay calor.',
    nota: 'Muy variable: perejil y romero son de los más lentos en emergencia.',
  },
  frutos: {
    osc: '3–5 d en germinador húmedo/cálido.',
    emerg: '5–10 d hasta cotiledón; mantener 22–26 °C en tomate/pimiento.',
    planton: '18–40 d hasta plantón robusto antes del sistema definitivo.',
    nota: 'Frutos: mejor plántula grande y raíz fuerte; luz alta y ventilación suave.',
  },
  fresas: {
    osc: '2–4 d.',
    emerg: '5–9 d.',
    planton: '25–45 d según variedad y luz antes de producción en torre.',
    nota: 'Crecimiento inicial relativamente lento; evitar saturación del sustrato.',
  },
  raices: {
    osc: '2–4 d.',
    emerg: '3–7 d (zanahoria irregular si siembra densa).',
    planton: '12–25 d; rábano en la parte baja del rango.',
    nota: 'Raíces largas: semillero profundo o tapón alto; no ideal en cesta pequeña.',
  },
  microgreens: {
    osc: '2–4 d en oscuro (girasol y muchas mezclas).',
    emerg: '2–4 d cotiledón a la luz.',
    planton: '5–12 d hasta primer corte; EC muy baja o solo agua al inicio.',
    nota: 'No confundir con cultivo a tamaño adulto: ciclo corto en bandeja.',
  },
};

/** Sobrescrituras por nombre exacto (como en CULTIVOS_DB). */
const GERMINACION_POR_NOMBRE = {
  'Espinaca': {
    emerg: '3–7 d; más lenta si el sustrato está frío o la semilla es antigua.',
    planton: '12–18 d hasta plantón compacto.',
    nota: 'Tolera frío en bandeja; en agua caliente riesgo de Pythium — buena aireación.',
  },
  'Perejil': {
    osc: '3–7 d en oscuro suelen acortar emergencia.',
    emerg: '10–21 d hasta asomar (normalmente lento).',
    planton: '25–40 d hasta plantón aceptable.',
    nota: 'Paciencia: no secar la superficie; germinación escalonada es habitual.',
  },
  'Cilantro': {
    emerg: '3–6 d.',
    planton: '8–14 d; cosechar joven si hace calor (espiga pronto).',
    nota: 'Semilla partida / entera según proveedor; evitar capas profundas.',
  },
  'Rúcula': {
    emerg: '2–3 d.',
    planton: '5–9 d para baby; más si buscas volumen.',
    nota: 'Muy rápida: vigilar que no se “estire” por falta de luz.',
  },
  'Iceberg': {
    planton: '10–16 d; suele pedir más tiempo que lechugas de hoja.',
    nota: 'Plántula más gruesa: asegura buen volumen de sustrato en el plug.',
  },
  'Zanahoria': {
    emerg: '5–12 d (irregular si la siembra es densa o seca la capa).',
    planton: '18–30 d antes de traslado a sustrato profundo.',
    nota: 'En hidroponía adulta suele ir a aeroponía/sustrato profundo, no a cesta pequeña.',
  },
  'Rábano': {
    emerg: '2–4 d.',
    planton: '6–10 d.',
    nota: 'Ciclo corto; vigilar que el hipocotilo no empuje la semilla fuera del medio.',
  },
  'Microgreens (mezcla)': {
    osc: '2–4 d típico en oscuro.',
    planton: '7–14 d hasta corte según mezcla.',
    nota: 'Seguir envase: algunas semillas quieren presoak, otras no.',
  },
  'Microgreens de girasol': {
    osc: '2–4 d en oscuro (típico en girasol).',
    planton: '8–12 d hasta primer corte.',
    nota: 'Tras oscuro, luz fuerte moderada; evitar encharcamiento en cáscara.',
  },
  'Tomate': {
    emerg: '4–7 d a 22–26 °C.',
    planton: '20–35 d hasta plantón con 4–6 hojas reales.',
    nota: 'Trasplantar cuando la raíz blanca llene el cubo sin enredarse en exceso.',
  },
  'Pepino': {
    emerg: '3–6 d.',
    planton: '12–22 d.',
    nota: 'No retirar demasiado pronto el domo si hay riesgo de sequedad.',
  },
  'Pak Choi / Bok Choy': {
    emerg: '2–4 d.',
    planton: '8–14 d.',
    nota: 'Calor >26 °C acelera floración: plantón joven al sistema o frescor en bandeja.',
  },
};

function getGerminacionSpecPorVariedad(nombreVariedad) {
  const nom = String(nombreVariedad || '').trim();
  const c = typeof getCultivoDB === 'function' ? getCultivoDB(nom) : null;
  const grupo = c && GERMINACION_GRUPO[c.grupo] ? c.grupo : 'lechugas';
  const base = { ...GERMINACION_GRUPO[grupo] };
  const ov = nom && GERMINACION_POR_NOMBRE[nom];
  return ov ? { ...base, ...ov } : base;
}

function etiquetaOrigenPlantaBreve(val) {
  const o = typeof normalizarOrigenPlanta === 'function' ? normalizarOrigenPlanta(val) : '';
  if (o === 'vivero') return '🏪 Vivero';
  if (o === 'germinacion') return '🫘 Germ. propia';
  return '';
}

function hcGerminacionPanelHtmlCompleto(nombreVariedad) {
  const nom = String(nombreVariedad || '').trim();
  const spec = getGerminacionSpecPorVariedad(nom);
  const esc = typeof meteoEscHtml === 'function' ? meteoEscHtml : s => String(s || '').replace(/</g, '&lt;').replace(/&/g, '&amp;');
  const titVar = nom
    ? '<p class="hc-origen-hint-p"><strong>' + esc(nom) + '</strong> — tiempos orientativos (bandeja, ~18–22 °C, sustrato húmedo sin encharcar):</p>'
    : '<p class="hc-origen-hint-p"><strong>Elige un cultivo</strong> en la lista para ver tiempos orientativos de germinación.</p>';
  const pasos =
    '<p class="hc-origen-hint-p"><strong>Proceso típico en la app</strong></p>' +
    '<ol class="hc-origen-hint-ol">' +
    '<li>Semilla en sustrato hidropónico (lana de roca, coco, etc.).</li>' +
    '<li>Fase en oscuro hasta radícula visible (si aplica a tu variedad).</li>' +
    '<li>Luz de crecimiento 14–18 h/día hasta 2–3 hojas reales.</li>' +
    '<li>Traslado al sistema: registra esa fecha como <strong>trasplante</strong> en la ficha.</li>' +
    '</ol>';
  const dl =
    '<dl class="hc-germ-spec-dl">' +
    '<dt>Oscuridad / uniformidad</dt><dd>' + esc(spec.osc) + '</dd>' +
    '<dt>Hasta emergencia</dt><dd>' + esc(spec.emerg) + '</dd>' +
    '<dt>Hasta plantón (traslado típ.)</dt><dd>' + esc(spec.planton) + '</dd>' +
    (spec.nota ? '<dt>Nota</dt><dd>' + esc(spec.nota) + '</dd>' : '') +
    '</dl>' +
    '<p class="hc-origen-hint-foot">Los sobres de semilla y la Tª real marcan el calendario; esto solo orienta.</p>';
  return titVar + dl + pasos;
}

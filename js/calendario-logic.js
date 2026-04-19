/**
 * Calendario de cultivo: eventos, navegación mensual.
 * Carga después del bloque principal (state, tipoInstalacionNormalizado, …).
 */

// ══════════════════════════════════════════════════
// CALENDARIO — LÓGICA
// ══════════════════════════════════════════════════

let calFecha = new Date();
/** null = lista «próximos eventos»; Date = detalle de ese día en la tarjeta. */
let calDiaSeleccionado = null;

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_CAL = ['L','M','X','J','V','S','D'];
/** Días consecutivos desde el trasplante en que se sugiere medir pH a diario (plántulas nuevas). */
const DIAS_MUESTRA_PH_TRASPLANTE = 5;

// Eventos del calendario basados en estado real del sistema
function generarEventos(fecha) {
  const eventos = [];
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const d = new Date(fecha);
  d.setHours(0,0,0,0);
  const diffDias = Math.round((d - hoy) / 86400000);
  const tCal = tipoInstalacionNormalizado(state.configTorre || {});
  const sisLab =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '';
  const fmtUbicPlantaCal = (n, ci) => formatoUbicacionEnRegistro(tCal, n + 1, ci + 1);

  // ── Control diario EC y pH ────────────────────────────────────────────
  eventos.push({
    tipo: 'control',
    icono: '📊',
    titulo: 'Control diario',
    desc: 'Medir EC (objetivo 1300-1400 µS/cm), pH (5.7-6.4) y temperatura del agua (18-22°C).'
  });

  // ── Recarga del depósito ──────────────────────────────────────────────
  if (state.ultimaRecarga) {
    const diasDesdeRecarga = Math.round((d - new Date(state.ultimaRecarga)) / 86400000);
    if (diasDesdeRecarga >= 13 && diasDesdeRecarga <= 17) {
      eventos.push({
        tipo: 'recarga',
        icono: '🔄',
        titulo:
          (diasDesdeRecarga >= 15 ? '¡Recarga completa del depósito!' : 'Recarga completa próxima') +
          (sisLab ? ' · ' + sisLab : ''),
        desc: `Día ${diasDesdeRecarga} desde la última recarga completa en ${sisLab || 'el sistema activo'} (vaciado + mezcla). Preparar checklist: agua, CalMag, A+B…`
      });
    }
  } else if (diffDias === 0) {
    eventos.push({
      tipo: 'recarga',
      icono: '🔄',
      titulo: 'Registra tu última recarga completa' + (sisLab ? ' · ' + sisLab : ''),
      desc:
        'En Mediciones: checklist de recarga o interruptor «Recarga completa» al guardar medición. Las reposiciones parciales no cuentan para este recordatorio' +
        (sisLab ? ' del ' + sisLab + '.' : '.'),
    });
  }

  // ── Cosechas y rotación ───────────────────────────────────────────────
  const nivelesActivos = getNivelesActivos();
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach((c, ci) => {
      if (!c || !c.variedad || !c.fecha) return;
      const diasTrasplante = Math.round((d - new Date(c.fecha)) / 86400000);
      const diasTotal = DIAS_COSECHA[c.variedad] || 50;
      const diasParaCosecha = diasTotal - diasTrasplante;

      if (diasParaCosecha >= 0 && diasParaCosecha <= 3) {
        eventos.push({
          tipo: 'cosecha',
          icono: '✂️',
          titulo: diasParaCosecha === 0 ? `¡Cosechar ${c.variedad}!` : `Cosecha próxima — ${c.variedad}`,
          desc: `${fmtUbicPlantaCal(n, ci)}. ${diasParaCosecha === 0 ? 'Lista para cosechar hoy.' : `En ${diasParaCosecha} días aproximadamente.`}`
        });
      }

      if (diasTrasplante >= 0 && diasTrasplante < DIAS_MUESTRA_PH_TRASPLANTE) {
        const nomC = cultivoNombreLista(getCultivoDB(c.variedad), c.variedad);
        eventos.push({
          tipo: 'plantula-ph',
          icono: '🧪',
          titulo:
            'Muestra diaria pH — plántula nueva (día ' +
            (diasTrasplante + 1) +
            '/' +
            DIAS_MUESTRA_PH_TRASPLANTE +
            ')',
          desc:
            fmtUbicPlantaCal(n, ci) +
            ' · ' +
            nomC +
            '. En los primeros días la raíz joven puede variar el pH de la solución: anota al menos una medición al día en Mediciones (pH y EC).'
        });
      }

      // Rotación escalonada — recordatorio si una planta supera los días
      if (diasParaCosecha < -3 && diasParaCosecha > -10) {
        eventos.push({
          tipo: 'rotacion',
          icono: '🔃',
          titulo: `Rotación pendiente — ${c.variedad}`,
          desc: `${fmtUbicPlantaCal(n, ci)}. Planta lista desde hace ${Math.abs(diasParaCosecha)} días. Trasplantar nuevas plántulas.`
        });
      }
    });
  });

  // ── Alertas estacionales Castelló ────────────────────────────────────
  const mes = d.getMonth() + 1;
  const dia = d.getDate();

  // Riesgo de bolting en lechugas (verano)
  if (mes >= 6 && mes <= 9) {
    eventos.push({
      tipo: 'clima',
      icono: '☀️',
      titulo: 'Temporada de calor — riesgo de espigado',
      desc: 'Las lechugas pueden espigarse con temperaturas > 28°C. Usar toldo en horas centrales y aumentar frecuencia de riego.'
    });
  }

  // Mejores meses para lechugas en Castelló
  if (mes === 3 || mes === 4 || mes === 9 || mes === 10) {
    eventos.push({
      tipo: 'clima',
      icono: '🌱',
      titulo: 'Época óptima para lechugas',
      desc: 'Temperaturas ideales para el cultivo de lechugas en Castelló. Máximo crecimiento y calidad.'
    });
  }

  // Riesgo de heladas
  if (mes === 12 || mes === 1 || mes === 2) {
    eventos.push({
      tipo: 'clima',
      icono: '🥶',
      titulo: 'Riesgo de noches frías',
      desc: 'Verificar que el calentador del depósito funciona correctamente. Temperatura mínima del agua: 18°C.'
    });
  }

  // Spray calcio preventivo (primavera-verano)
  if (mes >= 4 && mes <= 8 && dia % 3 === 0) {
    eventos.push({
      tipo: 'control',
      icono: '🧪',
      titulo: 'Spray foliar de calcio preventivo',
      desc: 'Aplicar spray de calcio por la mañana temprano antes del sol. Previene el tipburn en hojas jóvenes.'
    });
  }

  return eventos;
}

function tieneEventos(fecha) {
  const eventos = generarEventos(fecha);
  return eventos.some(e => e.tipo !== 'control');
}

function escAriaAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderCalendario() {
  try {
  const calMesLabel = document.getElementById('calMesLabel');
  if (!calMesLabel) return; // pestaña no activa
  const hoy  = new Date();
  const año  = calFecha.getFullYear();
  const mes  = calFecha.getMonth();
  const sisCal =
    typeof etiquetaSistemaHidroponicoBreve === 'function'
      ? etiquetaSistemaHidroponicoBreve(state.configTorre || {})
      : '';
  calMesLabel.textContent = MESES_LARGO[mes] + ' ' + año;

  // ── Construir mapa de eventos ────────────────────────────────────────────
  const eventos = {};

  const addEvento = (dia, tipo, color, label) => {
    eventos[dia] = eventos[dia] || [];
    eventos[dia].push({ tipo, color, label });
  };

  // Mediciones locales guardadas
  (state.mediciones || []).forEach(m => {
    if (!m.fecha) return;
    const parts = m.fecha.split('/');
    if (parts.length < 3) return;
    const d = parseInt(parts[0]), mo = parseInt(parts[1])-1, a = parseInt(parts[2]);
    if (mo === mes && a === año) addEvento(d, 'medicion', '#0369a1', '📊 Medición EC:' + (m.ec||'—') + ' pH:' + (m.ph||'—'));
  });

  // Recargas completas — cada 15 días desde última recarga completa
  if (state.ultimaRecarga) {
    let base = new Date(state.ultimaRecarga);
    for (let i = 0; i <= 8; i++) {
      const rec = new Date(base.getTime() + i * 15 * 86400000);
      if (rec.getMonth() === mes && rec.getFullYear() === año)
        addEvento(
          rec.getDate(),
          'recarga',
          '#16a34a',
          '💧 Recarga completa' + (sisCal ? ' · ' + sisCal : '')
        );
    }
  }

  // Limpieza — cada 30 días
  if (state.ultimaRecarga) {
    let base = new Date(state.ultimaRecarga);
    for (let i = 1; i <= 4; i++) {
      const lim = new Date(base.getTime() + i * 30 * 86400000);
      if (lim.getMonth() === mes && lim.getFullYear() === año)
        addEvento(lim.getDate(), 'limpieza', '#d97706', '🧹 Limpieza torre y cestas');
    }
  }

  // Cosechas estimadas por planta
  const nivelesActivos = getNivelesActivos();
  nivelesActivos.forEach(n => {
    (state.torre[n] || []).forEach((cesta, c) => {
      if (!cesta.variedad || !cesta.fecha) return;
      const diasTotal = DIAS_COSECHA[cesta.variedad] || 50;
      const siembra   = new Date(cesta.fecha);
      const cosecha   = new Date(siembra.getTime() + diasTotal * 86400000);
      if (cosecha.getMonth() === mes && cosecha.getFullYear() === año)
        addEvento(cosecha.getDate(), 'cosecha', '#dc2626', '✂️ Cosecha N' + (n+1) + ' C' + (c+1) + ' (' + cultivoNombreLista(getCultivoDB(cesta.variedad), cesta.variedad) + ')');
      const siembraPh = new Date(cesta.fecha);
      siembraPh.setHours(0, 0, 0, 0);
      for (let k = 0; k < DIAS_MUESTRA_PH_TRASPLANTE; k++) {
        const diaPh = new Date(siembraPh.getTime() + k * 86400000);
        if (diaPh.getMonth() === mes && diaPh.getFullYear() === año) {
          addEvento(
            diaPh.getDate(),
            'plantula-ph',
            '#7c3aed',
            '🧪 pH plántula N' +
              (n + 1) +
              ' C' +
              (c + 1) +
              ' · día ' +
              (k + 1) +
              '/' +
              DIAS_MUESTRA_PH_TRASPLANTE
          );
        }
      }
    });
  });

  // ── Renderizar grid ──────────────────────────────────────────────────────
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const diasMes   = new Date(año, mes + 1, 0).getDate();
  const primerDia = new Date(año, mes, 1).getDay();
  const offset    = primerDia === 0 ? 6 : primerDia - 1;

  for (let i = 0; i < offset; i++) grid.innerHTML += '<div></div>';

  for (let d = 1; d <= diasMes; d++) {
    const esHoy = (d === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear());
    const evs   = eventos[d] || [];
    const esSel =
      calDiaSeleccionado != null &&
      d === calDiaSeleccionado.getDate() &&
      mes === calDiaSeleccionado.getMonth() &&
      año === calDiaSeleccionado.getFullYear();
    const dots  = evs.slice(0,3).map(e =>
      '<div class="cal-ev-dot" style="--cal-dot-bg:' + e.color + '"></div>'
    ).join('');

    let cellClass = 'cal-cell';
    if (esHoy) cellClass += ' cal-cell--today';
    else if (evs.length > 0) cellClass += ' cal-cell--marked';
    if (esSel) cellClass += ' cal-cell--selected';
    const numInner =
      '<div class="cal-cell-num">' + d + '</div>' +
      '<div class="cal-cell-dots">' + dots + '</div>';
    const ariaToday = esHoy ? ' aria-current="date"' : '';

    if (evs.length > 0) {
      const ariaLbl = escAriaAttr(
        d + ' de ' + MESES_LARGO[mes] + ' ' + año + '. ' + evs.map(e => e.label).join('. ')
      );
      grid.innerHTML +=
        '<button type="button" class="cal-day-btn ' + cellClass + '" aria-label="' + ariaLbl + '"' + ariaToday +
        ' onclick="mostrarEventosDiaHC(' + d + ',' + mes + ',' + año + ')">' + numInner + '</button>';
    } else {
      grid.innerHTML += '<div class="' + cellClass + '"' + ariaToday + '>' + numInner + '</div>';
    }
  }

  // ── Tarjeta: detalle del día elegido o lista de próximos ─────────────────
  const diaHoy = (mes === hoy.getMonth() && año === hoy.getFullYear()) ? hoy.getDate() : 1;
  const proximos = [];
  Object.entries(eventos).forEach(([dia, evs]) => {
    if (parseInt(dia) >= diaHoy) {
      evs.forEach(e => proximos.push({ dia: parseInt(dia), ...e }));
    }
  });
  proximos.sort((a, b) => a.dia - b.dia);

  const mesCorto = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][mes];
  const eventosDiaEl = document.getElementById('eventosDia');
  const calDiaLabelEl = document.getElementById('calDiaLabel');

  const sel = calDiaSeleccionado;
  const selEnMes =
    sel != null &&
    sel.getFullYear() === año &&
    sel.getMonth() === mes;

  if (selEnMes) {
    mostrarEventosDia(sel);
  } else {
    if (calDiaLabelEl) calDiaLabelEl.textContent = '';
    if (proximos.length === 0) {
      eventosDiaEl.innerHTML = '<div class="cal-list-empty">No hay eventos próximos este mes</div>';
    } else {
      eventosDiaEl.innerHTML = proximos.slice(0, 8).map(e =>
        '<div class="cal-prox-row">' +
        '<div class="cal-prox-badge" style="--ev:' + e.color + '">' +
        '<div class="cal-prox-badge-dia">' + e.dia + '</div>' +
        '<div class="cal-prox-badge-mes">' + mesCorto + '</div>' +
        '</div>' +
        '<div class="cal-prox-label">' + e.label + '</div>' +
        '</div>'
      ).join('');
    }
  }

  } catch(e) { console.error("renderCalendario error:", e); }
}

function mostrarEventosDiaHC(d, mes, año) {
  calDiaSeleccionado = new Date(año, mes, d);
  calDiaSeleccionado.setHours(0, 0, 0, 0);
  renderCalendario();
  const host = document.getElementById('eventosDia');
  const card = host && host.closest('.card');
  if (card) requestAnimationFrame(function () {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}


function seleccionarDiaCal(fecha) {
  calDiaSeleccionado = fecha;
  renderCalendario();
}

function mostrarEventosDia(fecha) {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const diffDias = Math.round((fecha - hoy) / 86400000);
  const labelDia = diffDias === 0 ? 'Hoy' : diffDias === 1 ? 'Mañana' :
    diffDias === -1 ? 'Ayer' :
    `${fecha.getDate()} de ${MESES_LARGO[fecha.getMonth()]}`;

  const calLbl = document.getElementById('calDiaLabel');
  if (calLbl) calLbl.textContent = labelDia;

  const eventos = generarEventos(fecha);
  const lista = document.getElementById('eventosDia');

  if (eventos.length === 0) {
    lista.innerHTML = '<div class="cal-day-empty">Sin eventos especiales este día</div>';
    return;
  }

  lista.innerHTML = eventos.map(e => `
    <div class="evento-item evento-tipo-${e.tipo}">
      <div class="evento-icono">${e.icono}</div>
      <div class="evento-body">
        <div class="evento-titulo">${e.titulo}</div>
        <div class="evento-desc">${e.desc}</div>
      </div>
    </div>
  `).join('');
}

function calNavMes(dir) {
  calFecha.setMonth(calFecha.getMonth() + dir);
  renderCalendario();
}

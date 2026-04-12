/** Borrar entradas del historial. Tras hc-setup-diario-fotos.js. */
// ══════════════════════════════════════════════════
// BORRAR ENTRADAS DEL HISTORIAL
// ══════════════════════════════════════════════════

function borrarMedicion(fecha, hora, torreId) {
  if (!confirm('¿Borrar esta entrada del historial?')) return;
  initTorres();
  let slot = state.torres.findIndex(t => t && String(t.id) === String(torreId));
  if (slot < 0) slot = state.torreActiva || 0;
  const t = state.torres[slot];
  if (!t || !Array.isArray(t.mediciones)) {
    showToast('No se encontró la instalación', true);
    return;
  }
  const i = t.mediciones.findIndex(m => m && m.fecha === fecha && m.hora === hora);
  if (i < 0) {
    showToast('No se encontró el dato', true);
    return;
  }
  const row = t.mediciones[i];
  const tipoReg = (function inferTipoRegBorradoMedicion(r) {
    if (!r) return 'medicion';
    if (r.tipo === 'cosecha') return 'cosecha';
    if (r.tipo === 'reposicion') return 'reposicion';
    if (r.tipo === 'recarga') return 'recarga';
    if (String(r.notas || '').indexOf('Recarga completa') >= 0) return 'recarga';
    return 'medicion';
  })(row);

  borrarEntradaRegistroDesdeHistorial(slot, fecha, hora, tipoReg, true, true, true);

  t.mediciones.splice(i, 1);
  const um0 = t.mediciones.find(m => m && (m.tipo === 'medicion' || !m.tipo || m.tipo === ''));
  let ult = null;
  if (um0) {
    ult = {
      fecha: um0.fecha,
      hora: um0.hora,
      ec: um0.ec,
      ph: um0.ph,
      temp: um0.temp,
      vol: um0.vol,
      humSustrato: um0.humSustrato,
    };
  }
  t.ultimaMedicion = ult;
  if ((state.torreActiva || 0) === slot) {
    state.mediciones = t.mediciones;
    state.ultimaMedicion = ult ? { ...ult } : null;
  }
  saveState();
  renderHistMediciones();
  if (document.getElementById('tab-inicio')?.classList.contains('active')) updateDashboard();
  showToast('🗑 Entrada borrada');
}

/** Borrado desde lista agregada del historial (multi-torre). */
function borrarEntradaRegistroDesdeHistorial(slotIdx, fecha, hora, tipo, skipConfirm, suppressToast, silentOnMissing) {
  if (!skipConfirm && !confirm('¿Borrar esta entrada del registro?')) return false;
  initTorres();
  guardarEstadoTorreActual();
  const t = state.torres[slotIdx];
  if (!t || !Array.isArray(t.registro)) return false;
  const i = t.registro.findIndex(r => r && r.tipo === tipo && r.fecha === fecha && r.hora === hora);
  if (i < 0) {
    if (!silentOnMissing) showToast('No se encontró la entrada', true);
    return false;
  }
  const entry = t.registro[i];
  if (entry && entry.tipo === 'foto_sistema' && entry.fotoKey) {
    void borrarFotoIDB(entry.fotoKey);
    ensureFotosSistemaCompletoState();
    const k = entry.fotoKey;
    state.fotosSistemaCompleto.fotoKeys = (state.fotosSistemaCompleto.fotoKeys || []).filter(x => x !== k);
    state.fotosSistemaCompleto.fotos = (state.fotosSistemaCompleto.fotos || []).filter(f => !f || f.key !== k);
    guardarEstadoTorreActual();
  }
  t.registro.splice(i, 1);
  if ((state.torreActiva || 0) === slotIdx) state.registro = t.registro;
  saveState();
  renderRegistro();
  const diarioPanel = document.getElementById('histDiarioPanel');
  if (diarioPanel && !diarioPanel.classList.contains('setup-hidden')) renderDiarioBloqueSistema();
  if (document.getElementById('tab-mediciones')?.classList.contains('active') && typeof actualizarResumenReposicionParcialUI === 'function') {
    actualizarResumenReposicionParcialUI();
  }
  if (!suppressToast) showToast('🗑 Entrada borrada');
  return true;
}

function borrarEntradaRegistro(idx) {
  if (!confirm('¿Borrar esta entrada del registro?')) return;
  if (!state.registro) return;
  const entry = state.registro[idx];
  if (!entry) return;
  borrarEntradaRegistroDesdeHistorial(
    state.torreActiva || 0,
    entry.fecha,
    entry.hora,
    entry.tipo,
    true,
    false,
    false
  );
}

function borrarRecargaLocal(idx) {
  if (!confirm('¿Borrar esta recarga?')) return;
  if (!Array.isArray(state.recargasLocal) || idx < 0 || idx >= state.recargasLocal.length) return;

  const borrada = state.recargasLocal[idx];
  state.recargasLocal.splice(idx, 1);

  // Si se borra la última recarga de la instalación activa, recalcular marcador.
  try {
    const tAct = getTorreActiva();
    const tIdAct = tAct && tAct.id != null ? tAct.id : (state.torreActiva || 0);
    const bId = borrada && (borrada.torreId != null ? borrada.torreId : null);
    const mismaTorre = bId == null || String(bId) === String(tIdAct);
    if (mismaTorre) {
      const fechaIsoBorrada = (borrada && typeof borrada.fecha === 'string' && borrada.fecha.includes('/'))
        ? borrada.fecha.split('/').reverse().join('-')
        : null;
      if (fechaIsoBorrada && state.ultimaRecarga === fechaIsoBorrada) {
        const restantes = (state.recargasLocal || []).filter(r => {
          const rid = r && (r.torreId != null ? r.torreId : null);
          return rid == null || String(rid) === String(tIdAct);
        });
        if (!restantes.length) {
          state.ultimaRecarga = null;
        } else {
          const toTs = (r) => {
            if (!r || typeof r.fecha !== 'string') return 0;
            const p = r.fecha.split('/');
            if (p.length !== 3) return 0;
            const d = parseInt(p[0], 10);
            const m = parseInt(p[1], 10) - 1;
            const y = parseInt(p[2], 10);
            if (!y || m < 0 || m > 11 || d < 1 || d > 31) return 0;
            const hm = String(r.hora || '').split(':');
            const hh = Math.max(0, Math.min(23, parseInt(hm[0], 10) || 0));
            const mm = Math.max(0, Math.min(59, parseInt(hm[1], 10) || 0));
            return new Date(y, m, d, hh, mm, 0, 0).getTime();
          };
          const recReciente = restantes.slice().sort((a, b) => toTs(b) - toTs(a))[0];
          const p = String(recReciente.fecha || '').split('/');
          state.ultimaRecarga = p.length === 3 ? [p[2], p[1], p[0]].join('-') : state.ultimaRecarga;
        }
      }
    }
  } catch (_) {}

  saveState();
  renderHistRecargas();
  if (typeof renderRegistro === 'function' && histTabActiva === 'registro') renderRegistro();
  if (document.getElementById('tab-mediciones')?.classList.contains('active')) {
    try { updateRecargaBar(); } catch (_) {}
  }
  showToast('🗑 Recarga borrada');
}



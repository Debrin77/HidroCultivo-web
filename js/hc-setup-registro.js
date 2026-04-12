/** Registro completo (mediciones, cosechas, recargas). Tras hc-setup-historial-delete.js. */
// ══════════════════════════════════════════════════
// REGISTRO COMPLETO — mediciones, cosechas, recargas
// ══════════════════════════════════════════════════

function initRegistro() {
  if (!state.registro) state.registro = [];
}

function addRegistro(tipo, datos) {
  initRegistro();
  const now  = new Date();
  const dia  = String(now.getDate()).padStart(2,'0');
  const mes  = String(now.getMonth()+1).padStart(2,'0');
  const fecha = dia + '/' + mes + '/' + now.getFullYear();
  const hora  = now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
  const tActiva = getTorreActiva();
  const d = datos && typeof datos === 'object' ? { ...datos } : {};
  let snap = d.tipoInstalSnap;
  delete d.tipoInstalSnap;
  let tidReg = d.torreId;
  delete d.torreId;
  const tipoSnap =
    snap === 'nft' || snap === 'dwc' || snap === 'torre'
      ? snap
      : tipoInstalacionNormalizado(state.configTorre || {});
  const torreIdReg =
    tidReg != null && tidReg !== ''
      ? tidReg
      : tActiva.id != null
        ? tActiva.id
        : state.torreActiva || 0;
  state.registro.unshift({
    tipo, fecha, hora,
    torreNombre: (tActiva.nombre || '').trim() || 'Instalación',
    torreEmoji:  tActiva.emoji  || '🌿',
    ...d,
    torreId: torreIdReg,
    tipoInstalSnap: tipoSnap,
  });
  if (state.registro.length > 200) state.registro = state.registro.slice(0, 200);
  saveState();
}

// Cosechar una cesta y guardar trazabilidad completa
function cosecharCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const data = state.torre[nivel][cesta];
  if (!data.variedad) { closeModal(); return; }

  const diasCultivo = data.fecha
    ? Math.floor((Date.now() - new Date(data.fecha)) / 86400000)
    : null;

  // Guardar en registro con trazabilidad completa
  addRegistro('cosecha', {
    variedad:    data.variedad,
    nivel:       nivel + 1,
    cesta:       cesta + 1,
    fechaSiembra: data.fecha || '',
    diasCultivo: diasCultivo,
    notas:       data.notas || '',
    icono:       '✂️'
  });

  // También guardar en state.mediciones para el historial
  if (!state.mediciones) state.mediciones = [];
  const nomCosechaUi = cultivoNombreLista(getCultivoDB(data.variedad), data.variedad);
  const tCose = tipoInstalacionNormalizado(state.configTorre || {});
  const ubiCose = formatoUbicacionEnRegistro(tCose, nivel + 1, cesta + 1);
  state.mediciones.unshift({
    fecha: state.registro[0].fecha,
    hora:  state.registro[0].hora,
    tipo:  'cosecha',
    ec: '', ph: '', temp: '', vol: '',
    notas: '✂️ Cosecha: ' + nomCosechaUi +
           (ubiCose ? ' · ' + ubiCose : '') +
           (diasCultivo ? ' · ' + diasCultivo + ' días' : '') +
           (data.notas ? ' · ' + data.notas : '')
  });

  // Vaciar la cesta
  state.torre[nivel][cesta] = { variedad: '', fecha: '', notas: '' };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
  showToast('✂️ ' + nomCosechaUi + ' cosechada y registrada · ' + (diasCultivo || '?') + ' días');
}

function saveCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  const prev = state.torre[nivel][cesta] || {};
  state.torre[nivel][cesta] = {
    variedad: document.getElementById('editVariedad').value,
    fecha: document.getElementById('editFecha').value,
    notas: document.getElementById('editNotas').value,
    fotos: Array.isArray(prev.fotos) ? prev.fotos : [],
    fotoKeys: Array.isArray(prev.fotoKeys) ? prev.fotoKeys : [],
  };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
}

function clearCesta() {
  if (!editingCesta) return;
  const { nivel, cesta } = editingCesta;
  state.torre[nivel][cesta] = { variedad: '', fecha: '', notas: '', fotos: [], fotoKeys: [] };
  saveState();
  renderTorre();
  updateTorreStats();
  closeModal();
}



/**
 * Referencia orientativa: cesta (Ø), canal, profundidad SRF, etc. por grupo de cultivo,
 * sistema hidropónico y objetivo (planta completa vs baby leaf).
 */
const HC_CESTA_MATRIX_GRUPOS = [
  { key: 'lechugas', label: 'Lechugas' },
  { key: 'asiaticas', label: 'Asiáticas / hojas rápidas' },
  { key: 'hierbas', label: 'Hierbas aromáticas' },
  { key: 'hojas', label: 'Hojas voluminosas' },
  { key: 'microgreens', label: 'Microgreens' },
  { key: 'frutos', label: 'Frutos / pepino / tomate' },
];

const HC_CESTA_MATRIX_SISTEMAS = [
  { id: 'torre', label: 'Torre vertical' },
  { id: 'nft', label: 'NFT' },
  { id: 'dwc', label: 'DWC' },
  { id: 'rdwc', label: 'RDWC' },
  { id: 'srf', label: 'SRF / balsa' },
];

function hcCultivoObjetivoEsBaby(objetivo) {
  const v = String(objetivo || '')
    .trim()
    .toLowerCase();
  return v === 'baby' || v === 'baby_leaf' || v === 'micro';
}

/** Celda de la matriz: textos para tabla Consejos y valores numéricos para “Aplicar” en asistente. */
function hcCultivoCestaRecoCelda(grupo, sistemaId, objetivo) {
  const g = String(grupo || 'lechugas').trim().toLowerCase();
  const sys = String(sistemaId || 'dwc').trim().toLowerCase();
  const baby = hcCultivoObjetivoEsBaby(objetivo);

  if (sys === 'torre') {
    if (g === 'microgreens') return { txt: baby ? 'Ø 38–50 mm · alta densidad' : 'Ø 38–50 mm · ciclo corto', rimReco: 40 };
    if (g === 'asiaticas') return { txt: baby ? 'Ø 38–50 mm · baby' : 'Ø 50 mm · final', rimReco: baby ? 40 : 50 };
    if (g === 'hierbas' || g === 'hojas') return { txt: baby ? 'Ø 50 mm' : 'Ø 50–75 mm', rimReco: baby ? 50 : 63 };
    if (g === 'frutos' || g === 'fresas') return { txt: 'Ø 75–100 mm · poca densidad', rimReco: 75 };
    return { txt: baby ? 'Ø 38–50 mm · baby' : 'Ø 50 mm · cabeza', rimReco: baby ? 40 : 50 };
  }

  if (sys === 'nft') {
    if (g === 'microgreens') {
      return {
        txt: baby ? 'Canal Ø63–75 · cesta 27–40 mm' : 'Canal Ø63–75 · cesta 27–50 mm',
        canalRecoMm: 75,
        rimReco: 40,
      };
    }
    if (g === 'asiaticas') {
      return {
        txt: baby ? 'Canal Ø75–90 · cesta 27–50 mm' : 'Canal Ø75–100 · cesta 50 mm',
        canalRecoMm: 90,
        rimReco: baby ? 40 : 50,
      };
    }
    if (g === 'hierbas' || g === 'hojas') {
      return {
        txt: baby ? 'Canal Ø90–100 · cesta 50 mm' : 'Canal Ø100–125 · cesta 50–75 mm',
        canalRecoMm: 110,
        rimReco: baby ? 50 : 63,
      };
    }
    if (g === 'frutos' || g === 'fresas') {
      return {
        txt: 'Canal Ø125–160 · cesta 75–100 mm (avanzado)',
        canalRecoMm: 140,
        rimReco: 90,
        advierte: true,
      };
    }
    return {
      txt: baby ? 'Canal Ø90 · cesta 27–50 mm' : 'Canal Ø90–110 · cesta 50 mm',
      canalRecoMm: 100,
      rimReco: baby ? 40 : 50,
    };
  }

  if (sys === 'dwc' || sys === 'rdwc') {
    const pref = sys === 'rdwc' ? 'Cubo ' : '';
    if (g === 'microgreens') {
      return { txt: pref + 'Ø 27–50 mm', rimReco: 40, heightReco: 55 };
    }
    if (g === 'asiaticas') {
      return {
        txt: baby ? pref + 'Ø 27–50 mm' : pref + 'Ø 50–75 mm',
        rimReco: baby ? 40 : 63,
        heightReco: baby ? 60 : 75,
      };
    }
    if (g === 'hierbas' || g === 'hojas') {
      return {
        txt: baby ? pref + 'Ø 27–50 mm' : pref + 'Ø 50–75 mm',
        rimReco: baby ? 40 : 63,
        heightReco: baby ? 60 : 85,
      };
    }
    if (g === 'frutos' || g === 'fresas') {
      const bucket = sys === 'rdwc' ? ' · cubo 20–40 L' : '';
      return { txt: pref + 'Ø 75–100 mm' + bucket, rimReco: 90, heightReco: 100 };
    }
    return {
      txt: baby ? pref + 'Ø 27–50 mm' : pref + 'Ø 50 mm (5")',
      rimReco: baby ? 40 : 50,
      heightReco: baby ? 60 : 75,
    };
  }

  if (sys === 'srf') {
    if (g === 'microgreens') {
      return {
        txt: baby
          ? 'P 15–18 cm · balsa 25–35 mm · cesta 27–40 mm · sep. 8–12 cm'
          : 'P 15–20 cm · balsa 30 mm · cesta 27–50 mm',
        profRecoCm: 18,
        balsaRecoMm: 30,
        rimReco: 40,
        heightReco: 55,
        sepRecoCm: 10,
      };
    }
    if (g === 'asiaticas') {
      return {
        txt: baby
          ? 'P 20–22 cm · balsa 35 mm · cesta 27–50 mm · sep. 12–18 cm'
          : 'P 22–28 cm · balsa 40 mm · cesta 50 mm · sep. 15–20 cm',
        profRecoCm: baby ? 21 : 25,
        balsaRecoMm: baby ? 35 : 40,
        rimReco: baby ? 40 : 50,
        heightReco: baby ? 65 : 75,
        sepRecoCm: baby ? 15 : 18,
      };
    }
    if (g === 'hierbas' || g === 'hojas') {
      return {
        txt: baby
          ? 'P 22 cm · balsa 35–40 mm · cesta 50 mm'
          : 'P 25–30 cm · balsa 40–50 mm · cesta 50–75 mm · sep. 20–28 cm',
        profRecoCm: baby ? 22 : 28,
        balsaRecoMm: baby ? 38 : 45,
        rimReco: baby ? 50 : 63,
        heightReco: baby ? 70 : 85,
        sepRecoCm: baby ? 18 : 24,
      };
    }
    if (g === 'frutos' || g === 'fresas') {
      return {
        txt: 'P 30–35 cm · balsa 50 mm · cesta 75–100 mm · poca densidad',
        profRecoCm: 32,
        balsaRecoMm: 50,
        rimReco: 90,
        heightReco: 100,
        sepRecoCm: 35,
        advierte: true,
      };
    }
    return {
      txt: baby
        ? 'P 20–24 cm · balsa 35 mm · cesta 27–50 mm · sep. 12–18 cm'
        : 'P 22–28 cm · balsa 40 mm · cesta 50–75 mm · sep. 18–22 cm',
      profRecoCm: baby ? 22 : 25,
      balsaRecoMm: 40,
      rimReco: baby ? 40 : 50,
      heightReco: baby ? 65 : 75,
      sepRecoCm: baby ? 14 : 20,
    };
  }

  return { txt: '—' };
}

/** true = asistente «Nueva instalación» (sin heredar otra ranura activa). */
function hcSetupAsistenteInstalacionNueva() {
  try {
    return !!(typeof setupEsNuevaTorre !== 'undefined' && setupEsNuevaTorre);
  } catch (_) {
    return false;
  }
}

function hcContarGrupoDominanteDesdeClaves(keys) {
  const cnt = {};
  (keys || []).forEach(k => {
    const g = String(k || '').trim().toLowerCase();
    if (!g) return;
    cnt[g] = (cnt[g] || 0) + 1;
  });
  let best = '';
  let bestN = -1;
  Object.keys(cnt).forEach(k => {
    if (cnt[k] > bestN) {
      best = k;
      bestN = cnt[k];
    }
  });
  return best;
}

/** Grupo de cultivo dominante: en instalación nueva solo paso Cultivos del asistente. */
function hcGrupoCultivoDominanteDesdeConfig(cfg) {
  cfg = cfg || {};
  const claves = [];
  try {
    if (typeof setupPlantasSeleccionadas !== 'undefined' && setupPlantasSeleccionadas.size > 0) {
      setupPlantasSeleccionadas.forEach(k => claves.push(k));
    }
  } catch (_) {}
  if (hcSetupAsistenteInstalacionNueva()) {
    return hcContarGrupoDominanteDesdeClaves(claves) || 'lechugas';
  }
  try {
    const tor = state.torre || [];
    for (let i = 0; i < tor.length; i++) {
      const row = tor[i] || [];
      for (let j = 0; j < row.length; j++) {
        const v = row[j] && row[j].variedad;
        if (!v || typeof getCultivoDB !== 'function') continue;
        const cult = getCultivoDB(v);
        if (cult && cult.grupo) claves.push(cult.grupo);
      }
    }
  } catch (_) {}
  if (Array.isArray(cfg.cultivosIniciales)) {
    cfg.cultivosIniciales.forEach(v => {
      if (v) claves.push(v);
    });
  }
  const best = hcContarGrupoDominanteDesdeClaves(claves);
  if (best) return best;
  const mk = typeof normalizeTorreModoActual === 'function' ? normalizeTorreModoActual(modoActual) : modoActual;
  if (mk === 'intensivo') return 'hojas';
  if (mk === 'mixto') return 'asiaticas';
  if (mk === 'mini') return 'microgreens';
  return 'lechugas';
}

/** ¿Hay cultivos elegidos en el paso Cultivos del asistente (sin leer otra instalación)? */
function hcSetupHayCultivosEnAsistente(draft) {
  try {
    if (typeof setupPlantasSeleccionadas !== 'undefined' && setupPlantasSeleccionadas.size > 0) return true;
  } catch (_) {}
  if (hcSetupAsistenteInstalacionNueva()) return false;
  return !!(draft && Array.isArray(draft.cultivosIniciales) && draft.cultivosIniciales.length > 0);
}

function hcObjetivoCultivoDesdeConfig(cfg, tipo) {
  cfg = cfg || {};
  const t = String(tipo || cfg.tipoInstalacion || '').toLowerCase();
  if (t === 'srf' && cfg.srfObjetivoCultivo) return srfNormalizeObjetivoCultivo(cfg.srfObjetivoCultivo);
  if (t === 'dwc' && typeof dwcGetObjetivoCultivo === 'function') return dwcGetObjetivoCultivo(cfg);
  if (t === 'nft' && cfg.nftObjetivoCultivo && typeof nftNormalizeObjetivoCultivo === 'function') {
    return nftNormalizeObjetivoCultivo(cfg.nftObjetivoCultivo);
  }
  if (cfg.objetivoCultivo) return hcCultivoObjetivoEsBaby(cfg.objetivoCultivo) ? 'baby' : 'final';
  return 'final';
}

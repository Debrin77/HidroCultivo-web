/**
 * Herramientas Pro (Medir): calculadoras rápidas conectadas al asistente.
 */
(function () {
  let _altNutId = '';
  function el(id) { return document.getElementById(id); }
  function num(id) {
    const raw = String(el(id)?.value || '').trim().replace(',', '.');
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }
  function fmt(n, d) {
    if (!Number.isFinite(n)) return '—';
    return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  }

  function open() {
    const m = el('modalHerramientasPro');
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (typeof a11yDialogOpened === 'function') a11yDialogOpened(m);
    prefll();
  }
  function close(ev) {
    const m = el('modalHerramientasPro');
    if (!m || !m.classList.contains('open')) return;
    if (ev && ev.currentTarget === m && ev.target !== m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (typeof a11yDialogClosed === 'function') a11yDialogClosed(m);
  }

  function prefll() {
    const ec = String(el('inputEC')?.value || '').trim();
    const ph = String(el('inputPH')?.value || '').trim();
    const vol = String(el('inputVol')?.value || '').trim();
    if (!el('toolDilEcActual')?.value && ec) el('toolDilEcActual').value = ec;
    if (!el('toolPhActual')?.value && ph) el('toolPhActual').value = ph;
    if (!el('toolDilVol')?.value && vol) el('toolDilVol').value = vol;
    if (!el('toolPhVol')?.value && vol) el('toolPhVol').value = vol;
    if (!el('toolVolActual')?.value && vol) el('toolVolActual').value = vol;
    try {
      const vObj = typeof getVolumenMezclaLitros === 'function' ? getVolumenMezclaLitros(state.configTorre || {}) : NaN;
      if (!el('toolVolObjetivo')?.value && Number.isFinite(vObj)) el('toolVolObjetivo').value = String(vObj);
    } catch (_) {}
    populateNutrientes();
  }

  function getNutrientesList() {
    const list = Array.isArray(window.NUTRIENTES_DB) ? window.NUTRIENTES_DB : [];
    return list.filter((n) => n && n.id && n.id !== 'otro');
  }

  function getNutById(id) {
    const list = getNutrientesList();
    const hit = list.find((n) => String(n.id) === String(id));
    return hit || null;
  }

  function getNutActivoId() {
    try {
      const cfg = (typeof state !== 'undefined' && state && state.configTorre) ? state.configTorre : {};
      if (cfg.nutriente) return String(cfg.nutriente);
    } catch (_) {}
    try {
      if (typeof getNutrienteTorre === 'function') {
        const n = getNutrienteTorre();
        if (n && n.id) return String(n.id);
      }
    } catch (_) {}
    return '';
  }

  function populateNutrientes() {
    const sel = el('toolNutrienteSel');
    if (!sel) return;
    const list = getNutrientesList();
    if (!list.length) return;
    const act = getNutActivoId();
    sel.innerHTML = list.map((n) => {
      const activeTag = String(n.id) === act ? ' (activo)' : '';
      return '<option value="' + String(n.id).replace(/"/g, '&quot;') + '">' +
        String(n.nombre || n.id).replace(/</g, '&lt;').replace(/>/g, '&gt;') + activeTag +
        '</option>';
    }).join('');
    if (act && list.some((n) => String(n.id) === act)) sel.value = act;
  }

  function ecUpPerMlInVol(nut, vol) {
    const base = (nut && Number.isFinite(Number(nut.ecPorMl)) && Number(nut.ecPorMl) > 0) ? Number(nut.ecPorMl) : 33;
    return base * (18 / vol);
  }

  function doseForDeficitUs(deficit, vol, nut) {
    if (!(deficit > 0) || !(vol > 0)) return 0;
    const slope = ecUpPerMlInVol(nut, vol);
    if (!(slope > 0)) return 0;
    return deficit / slope;
  }

  function ecFromUs() {
    const us = num('toolEcUs');
    if (!Number.isFinite(us)) return;
    el('toolEcMs').value = fmt(us / 1000, 3);
  }
  function ecFromMs() {
    const ms = num('toolEcMs');
    if (!Number.isFinite(ms)) return;
    el('toolEcUs').value = String(Math.round(ms * 1000));
  }

  function calcDilution() {
    const ecA = num('toolDilEcActual');
    const ecO = num('toolDilEcObjetivo');
    const vol = num('toolDilVol');
    const out = el('toolDilResult');
    if (!out) return;
    if (!Number.isFinite(ecA) || !Number.isFinite(ecO) || !Number.isFinite(vol) || vol <= 0) {
      out.textContent = 'Introduce EC actual, EC objetivo y volumen.';
      return;
    }
    const nutId = String(el('toolNutrienteSel')?.value || '');
    const nut = getNutById(nutId) || (typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null);

    if (ecA > ecO && ecO > 0) {
      let litros = NaN;
      if (typeof litrosAguaDiluirHastaEcUs === 'function') litros = litrosAguaDiluirHastaEcUs(ecA, vol, ecO);
      else litros = vol * (ecA / ecO - 1);
      if (!Number.isFinite(litros) || litros < 0) {
        out.textContent = 'No se pudo calcular con esos valores.';
        return;
      }
      const est = Math.round(ecA * vol / (vol + litros));
      out.textContent = 'Añade ~' + fmt(litros, 1) + ' L de agua. EC estimada tras dilución: ~' + est + ' µS/cm.';
      return;
    }

    if (ecA < ecO) {
      const deficit = ecO - ecA;
      const ml = doseForDeficitUs(deficit, vol, nut);
      const partes = Math.max(1, Number(nut?.partes || 2));
      const nombre = String(nut?.nombre || 'nutriente seleccionado');
      if (!Number.isFinite(ml) || ml <= 0) {
        out.textContent = 'No se pudo estimar dosis para subir EC.';
        return;
      }
      if (partes <= 1) {
        out.textContent = 'EC baja: para subir ~' + Math.round(deficit) + ' µS/cm con ' + nombre + ', añade ~' + fmt(ml, 1) + ' ml.';
      } else {
        out.textContent = 'EC baja: para subir ~' + Math.round(deficit) + ' µS/cm con ' + nombre + ', añade ~' + fmt(ml, 1) + ' ml por parte (' + partes + ' partes).';
      }
      return;
    }

    out.textContent = 'EC ya está en objetivo.';
  }

  function compareNutrients() {
    const out = el('toolDilResult');
    const box = el('toolNutCompareCards');
    const altBtn = el('toolUseAltBtn');
    if (!out) return;
    const ecA = num('toolDilEcActual');
    const ecO = num('toolDilEcObjetivo');
    const vol = num('toolDilVol');
    if (!Number.isFinite(ecA) || !Number.isFinite(ecO) || !Number.isFinite(vol) || vol <= 0) {
      out.textContent = 'Para comparar nutrientes, completa EC actual, EC objetivo y volumen.';
      if (box) { box.classList.add('setup-hidden'); box.innerHTML = ''; }
      if (altBtn) altBtn.style.display = 'none';
      return;
    }
    if (ecA >= ecO) {
      out.textContent = 'La comparación de nutrientes aplica cuando EC actual está por debajo del objetivo.';
      if (box) { box.classList.add('setup-hidden'); box.innerHTML = ''; }
      if (altBtn) altBtn.style.display = 'none';
      return;
    }
    const deficit = ecO - ecA;
    const activeId = getNutActivoId();
    const selectedId = String(el('toolNutrienteSel')?.value || '');
    const na = getNutById(activeId) || (typeof getNutrienteTorre === 'function' ? getNutrienteTorre() : null);
    const ns = getNutById(selectedId) || na;
    const mla = doseForDeficitUs(deficit, vol, na);
    const mls = doseForDeficitUs(deficit, vol, ns);
    const txtA = (na ? na.nombre : 'activo') + ': ~' + fmt(mla, 1) + ' ml/parte';
    const txtS = (ns ? ns.nombre : 'seleccionado') + ': ~' + fmt(mls, 1) + ' ml/parte';
    const diff = Number.isFinite(mla) && Number.isFinite(mls) ? Math.abs(mls - mla) : NaN;
    const selBetter = Number.isFinite(mla) && Number.isFinite(mls) && mls < mla;
    const actBetter = Number.isFinite(mla) && Number.isFinite(mls) && mla < mls;
    const same = Number.isFinite(mla) && Number.isFinite(mls) && Math.abs(mla - mls) < 0.05;
    const ahorroTxt = Number.isFinite(diff) ? ('Ahorro estimado: ' + fmt(diff, 1) + ' ml/parte.') : '';
    const better = same
      ? 'Dosis similar entre ambos.'
      : (selBetter ? ('Recomendado: seleccionado. ' + ahorroTxt) : (actBetter ? ('Recomendado: activo. ' + ahorroTxt) : ''));
    out.textContent = txtA + ' | ' + txtS + (better ? ' ' + better : '');

    if (box) {
      box.classList.remove('setup-hidden');
      box.innerHTML =
        '<div class="tools-pro-compare-card ' + (actBetter ? 'is-better' : '') + '">' +
          '<h5>Activo</h5>' +
          '<strong>' + (na ? na.nombre : 'Activo') + '</strong><br>' +
          '<span>~' + fmt(mla, 1) + ' ml/parte</span>' +
        '</div>' +
        '<div class="tools-pro-compare-card ' + (selBetter ? 'is-better' : '') + '">' +
          '<h5>Seleccionado</h5>' +
          '<strong>' + (ns ? ns.nombre : 'Seleccionado') + '</strong><br>' +
          '<span>~' + fmt(mls, 1) + ' ml/parte</span>' +
        '</div>';
      _altNutId = selBetter ? String(ns?.id || '') : '';
    }
    if (altBtn) altBtn.style.display = _altNutId ? 'inline-flex' : 'none';
  }

  function calcPh() {
    const pA = num('toolPhActual');
    const pO = num('toolPhObjetivo');
    const vol = num('toolPhVol');
    const out = el('toolPhResult');
    if (!out) return;
    if (!Number.isFinite(pA) || !Number.isFinite(pO) || !Number.isFinite(vol) || vol <= 0) {
      out.textContent = 'Introduce pH actual, objetivo y volumen.';
      return;
    }
    const delta = Math.abs(pO - pA);
    const factor = vol / 18;
    const plus = (typeof PH_PLUS_POR_ML !== 'undefined' ? PH_PLUS_POR_ML : 0.34);
    const minus = (typeof PH_MINUS_POR_ML !== 'undefined' ? PH_MINUS_POR_ML : 0.40);
    if (pA < pO) {
      const ml = Math.max(0.5, (delta / plus) * factor);
      out.textContent = 'pH+ estimado: +' + fmt(ml, 1) + ' ml (en microdosis y re-medir).';
    } else if (pA > pO) {
      const ml = Math.max(0.5, (delta / minus) * factor);
      out.textContent = 'pH- estimado: -' + fmt(ml, 1) + ' ml (en microdosis y re-medir).';
    } else {
      out.textContent = 'Ya está en el objetivo.';
    }
  }

  function calcVol() {
    const vA = num('toolVolActual');
    const vO = num('toolVolObjetivo');
    const out = el('toolVolResult');
    if (!out) return;
    if (!Number.isFinite(vA) || !Number.isFinite(vO) || vO <= 0) {
      out.textContent = 'Introduce volumen actual y objetivo.';
      return;
    }
    const d = vO - vA;
    if (d > 0) out.textContent = 'Repón ~' + fmt(d, 1) + ' L para volver al objetivo.';
    else if (d < 0) out.textContent = 'Vas por encima del objetivo en ~' + fmt(Math.abs(d), 1) + ' L.';
    else out.textContent = 'Volumen en objetivo.';
  }

  function useCurrent() { prefll(); }

  function applyToWizard(type) {
    const openWizard = typeof abrirWizardMedicion === 'function';
    if (openWizard) abrirWizardMedicion();
    if (type === 'dilution' || type === 'dilution_alt') {
      const ecA = num('toolDilEcActual');
      const vol = num('toolDilVol');
      if (Number.isFinite(ecA) && el('wizEC')) el('wizEC').value = String(Math.round(ecA));
      if (Number.isFinite(vol) && el('wizVol')) el('wizVol').value = fmt(vol, 1);
      if (el('wizReposicionAguaChk')) el('wizReposicionAguaChk').checked = true;
      if (type === 'dilution_alt' && _altNutId) {
        const aplicarGlobal = typeof confirm === 'function'
          ? confirm('¿Quieres dejar este nutriente como activo en la instalación?\n\nAceptar = cambiar nutriente activo global.\nCancelar = usar solo en este cálculo/asistente.')
          : true;
        try {
          if (aplicarGlobal && typeof state !== 'undefined' && state && state.configTorre) {
            state.configTorre.nutriente = _altNutId;
            if (typeof saveState === 'function') saveState();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof showToast === 'function') showToast('🌿 Nutriente alternativo guardado como activo');
          } else {
            if (typeof showToast === 'function') showToast('✅ Alternativa aplicada solo en este flujo (sin cambiar nutriente activo)');
          }
        } catch (_) {}
      }
    } else if (type === 'ph') {
      const pA = num('toolPhActual');
      if (Number.isFinite(pA) && el('wizPH')) el('wizPH').value = fmt(pA, 1);
      if (el('wizAjustePhChk')) el('wizAjustePhChk').checked = true;
    } else if (type === 'vol') {
      const vA = num('toolVolActual');
      if (Number.isFinite(vA) && el('wizVol')) el('wizVol').value = fmt(vA, 1);
    }
    close();
    if (typeof showToast === 'function') showToast('✅ Datos aplicados al Asistente pro');
  }

  window.abrirHerramientasPro = open;
  window.cerrarHerramientasPro = close;
  window.toolsProUseCurrent = useCurrent;
  window.toolsProEcConvertFromUs = ecFromUs;
  window.toolsProEcConvertFromMs = ecFromMs;
  window.toolsProCalcDilution = calcDilution;
  window.toolsProCalcPh = calcPh;
  window.toolsProCalcVol = calcVol;
  window.toolsProApplyToWizard = applyToWizard;
  window.toolsProCompareNutrients = compareNutrients;
})();


/**
 * Wizard de medición (Medir): guía 3 pasos y registra ajustes en Historial → Registro.
 * Depende de guardarMedicion() y addRegistro().
 */
(function () {
  let step = 1;
  let busy = false;

  function el(id) { return document.getElementById(id); }

  function setDots() {
    ['wizDot1', 'wizDot2', 'wizDot3'].forEach((id, idx) => {
      const d = el(id);
      if (!d) return;
      d.classList.toggle('is-active', (idx + 1) === step);
    });
  }

  function showStep(n) {
    step = Math.max(1, Math.min(3, Number(n) || 1));
    const p1 = el('wizPage1');
    const p2 = el('wizPage2');
    const p3 = el('wizPage3');
    if (p1) p1.classList.toggle('setup-hidden', step !== 1);
    if (p2) p2.classList.toggle('setup-hidden', step !== 2);
    if (p3) p3.classList.toggle('setup-hidden', step !== 3);

    const back = el('wizBackBtn');
    const next = el('wizNextBtn');
    if (back) back.disabled = step === 1 || busy;
    if (next) next.textContent = step === 3 ? (busy ? 'Guardando…' : 'Guardar') : 'Siguiente';
    if (next) next.disabled = busy;
    setDots();

    try {
      const focusId = step === 1 ? 'wizEC' : step === 2 ? 'wizRecargaCompleta' : 'wizNotas';
      const f = el(focusId);
      if (f && typeof f.focus === 'function') setTimeout(() => f.focus(), 30);
    } catch (_) {}
  }

  function open() {
    const m = el('modalWizardMedicion');
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (typeof a11yDialogOpened === 'function') a11yDialogOpened(m);
    busy = false;
    // precargar notas desde Medir (si el usuario ya escribió)
    try {
      const src = el('inputNotas');
      const dst = el('wizNotas');
      if (src && dst && !String(dst.value || '').trim()) dst.value = String(src.value || '');
    } catch (_) {}
    showStep(1);
  }

  function close(ev) {
    const m = el('modalWizardMedicion');
    if (!m || !m.classList.contains('open')) return;
    if (ev && ev.currentTarget === m && ev.target !== m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (typeof a11yDialogClosed === 'function') a11yDialogClosed(m);
  }

  function valNum(id) {
    const raw = String(el(id)?.value || '').trim().replace(',', '.');
    if (!raw) return '';
    const n = Number(raw);
    return Number.isFinite(n) ? String(n) : '';
  }

  function buildReview() {
    const ec = valNum('wizEC');
    const ph = valNum('wizPH');
    const temp = valNum('wizTemp');
    const vol = valNum('wizVol');
    const notas = String(el('wizNotas')?.value || '').trim();

    const ajustes = [];
    if (el('wizRecargaCompleta')?.checked) ajustes.push('🔄 Recarga completa');
    if (el('wizReposicionAguaChk')?.checked) {
      const L = valNum('wizReposicionAguaL');
      ajustes.push('💧 Reposición solo agua' + (L ? ` (+${L} L)` : ''));
    }
    if (el('wizAjustePhChk')?.checked) {
      const pMas = valNum('wizPhMasMl');
      const pMen = valNum('wizPhMenosMl');
      const bits = [];
      if (pMas) bits.push(`pH+ ${pMas} ml`);
      if (pMen) bits.push(`pH− ${pMen} ml`);
      ajustes.push('🧪 Ajuste pH' + (bits.length ? ` (${bits.join(' · ')})` : ''));
    }
    if (el('wizNutrientesChk')?.checked) {
      const t = String(el('wizNutrientesTxt')?.value || '').trim();
      ajustes.push('🌿 Nutrientes' + (t ? ` (${t})` : ''));
    }

    const parts = [];
    parts.push(`<strong>Medición</strong>: EC ${ec || '—'} · pH ${ph || '—'} · °C ${temp || '—'} · L ${vol || '—'}`);
    if (ajustes.length) parts.push('<strong>Ajustes</strong>: ' + ajustes.join(' · '));
    if (notas) parts.push('<strong>Nota</strong>: ' + notas.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    return parts.join('<br>');
  }

  async function commit() {
    if (busy) return;
    const ec = valNum('wizEC');
    const ph = valNum('wizPH');
    const temp = valNum('wizTemp');
    const vol = valNum('wizVol');
    const notas = String(el('wizNotas')?.value || '').trim();

    if (!ec && !ph && !temp && !vol) {
      if (typeof showToast === 'function') showToast('⚠️ Introduce al menos un valor', true);
      showStep(1);
      return;
    }

    busy = true;
    showStep(step);

    // sincronizar con inputs reales y usar guardarMedicion() (mantiene comportamiento y UI)
    try { el('inputEC').value = ec; } catch (_) {}
    try { el('inputPH').value = ph; } catch (_) {}
    try { el('inputTemp').value = temp; } catch (_) {}
    try { el('inputVol').value = vol; } catch (_) {}
    try { el('inputNotas').value = notas; } catch (_) {}

    // si el usuario marca recarga completa, reutilizar switch existente
    try {
      const wantRecarga = !!el('wizRecargaCompleta')?.checked;
      if (wantRecarga && typeof toggleRecarga === 'function') {
        // toggleRecarga() cambia estado; forzar solo si no está ya activo
        const sw = el('recargaSwitch');
        const isOn = sw && sw.getAttribute('aria-checked') === 'true';
        if (!isOn) toggleRecarga();
      }
    } catch (_) {}

    try {
      await guardarMedicion();
    } catch (e) {
      busy = false;
      showStep(step);
      if (typeof showToast === 'function') showToast('No se pudo guardar la medición', true);
      return;
    }

    // Ajustes extra en registro (además de la medición ya registrada)
    try {
      if (typeof addRegistro === 'function') {
        if (el('wizReposicionAguaChk')?.checked) {
          const L = valNum('wizReposicionAguaL');
          if (L) {
            addRegistro('reposicion', { litros: Number(L), modo: 'solo_agua', icono: '💧' }, true);
          } else {
            addRegistro('apunte', { icono: '💧', apunteTexto: 'Reposición parcial: solo agua (sin litros indicados)' }, true);
          }
        }
        if (el('wizAjustePhChk')?.checked) {
          const pMas = valNum('wizPhMasMl');
          const pMen = valNum('wizPhMenosMl');
          const bits = [];
          if (pMas) bits.push('pH+ ' + pMas + ' ml');
          if (pMen) bits.push('pH− ' + pMen + ' ml');
          addRegistro('apunte', { icono: '🧪', apunteTexto: bits.length ? ('Ajuste de pH: ' + bits.join(' · ')) : 'Ajuste de pH' }, true);
        }
        if (el('wizNutrientesChk')?.checked) {
          const t = String(el('wizNutrientesTxt')?.value || '').trim();
          addRegistro('apunte', { icono: '🌿', apunteTexto: t ? ('Añadidos nutrientes: ' + t) : 'Añadidos nutrientes' }, true);
        }
      }
    } catch (_) {}

    busy = false;
    close();
    try {
      // limpiar wizard para próxima vez
      ['wizEC','wizPH','wizTemp','wizVol','wizNotas','wizReposicionAguaL','wizPhMasMl','wizPhMenosMl','wizNutrientesTxt'].forEach((id) => {
        const e = el(id);
        if (e) e.value = '';
      });
      ['wizRecargaCompleta','wizReposicionAguaChk','wizAjustePhChk','wizNutrientesChk'].forEach((id) => {
        const c = el(id);
        if (c) c.checked = false;
      });
    } catch (_) {}

    try {
      if (typeof renderRegistro === 'function' && typeof histTabActiva !== 'undefined' && histTabActiva === 'registro') {
        renderRegistro();
      }
    } catch (_) {}
  }

  window.abrirWizardMedicion = open;
  window.cerrarWizardMedicion = close;
  window.wizardMedNext = function () {
    if (busy) return;
    if (step === 1) showStep(2);
    else if (step === 2) {
      const rv = el('wizReview');
      if (rv) rv.innerHTML = buildReview();
      showStep(3);
    } else {
      void commit();
    }
  };
  window.wizardMedPrev = function () {
    if (busy) return;
    if (step === 2) showStep(1);
    else if (step === 3) showStep(2);
  };
})();


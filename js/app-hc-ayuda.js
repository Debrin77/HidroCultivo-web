/**
 * Pestaña Ayuda: intenta cargar capturas desde img/ayuda/*.webp (o .png) si existen en el despliegue.
 * Tras hc-bootstrap-init-nav.js (goTab ya definido).
 */
function refreshAyudaCapturasSiExiste() {
  try {
    document.querySelectorAll('figure.ayuda-captura[data-ayuda-img]').forEach(wrap => {
      if (wrap.getAttribute('data-ayuda-intento') === '1') return;
      const url = wrap.getAttribute('data-ayuda-img');
      if (!url) return;
      wrap.setAttribute('data-ayuda-intento', '1');
      const alt = wrap.getAttribute('data-ayuda-alt') || '';
      const im = new Image();
      im.className = 'ayuda-captura-img';
      im.alt = alt;
      im.loading = 'lazy';
      const done = function () {
        wrap.setAttribute('data-ayuda-loaded', '1');
      };
      im.onload = function () {
        const slot = wrap.querySelector('.ayuda-captura-slot');
        if (slot) slot.classList.add('setup-hidden');
        wrap.appendChild(im);
        done();
      };
      im.onerror = function () {
        done();
      };
      im.src = url;
    });
  } catch (_) {}
}

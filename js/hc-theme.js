/**
 * Apariencia: claro por defecto; oscuro solo si el usuario lo elige (localStorage hcAppearance).
 * No se usa prefers-color-scheme para no forzar tema según el SO.
 */
(function () {
  var KEY = 'hcAppearance';

  function readStored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function apply(theme) {
    var dark = theme === 'dark';
    document.documentElement.classList.toggle('hc-theme-dark', dark);
    var cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute('content', dark ? 'dark' : 'light');
    try {
      localStorage.setItem(KEY, dark ? 'dark' : 'light');
    } catch (e) {}
  }

  window.getHcAppearance = function () {
    return readStored();
  };

  window.setHcAppearance = function (theme) {
    apply(theme === 'dark' ? 'dark' : 'light');
    syncHcAppearanceUi();
  };

  window.onHcAppearanceChange = function (value) {
    setHcAppearance(value === 'dark' ? 'dark' : 'light');
  };

  function syncHcAppearanceUi() {
    var sel = document.getElementById('hcAppearanceSelect');
    if (sel) sel.value = getHcAppearance();
  }
  window.syncHcAppearanceUi = syncHcAppearanceUi;

  document.addEventListener('DOMContentLoaded', syncHcAppearanceUi);
  apply(readStored());
})();

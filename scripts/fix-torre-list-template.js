const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'js', 'app-hc-torres-badges-notifs.js');
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('    return `<motion class="torre-list-row');
if (start < 0) {
  const start2 = s.indexOf("    return `<motion class=\"torre-list-row");
  if (start2 < 0) {
    const i = s.indexOf('`.replace(\n      \'<motion\',');
    if (i < 0) {
      console.error('start not found');
      process.exit(1);
    }
    const end = s.indexOf('  }).join(\'\');', i);
    const good = `    return \`<motion class="torre-list-row\${isActiva ? ' torre-list-row--active' : ''}">
      <button type="button" class="torre-list-main"
        onclick="cambiarTorreActiva(\${i})"
        aria-pressed="\${isActiva ? 'true' : 'false'}"
        aria-label="Activar \${String((t.nombre || '').trim() || 'instalación').replace(/"/g, '&quot;')}\${isActiva ? ', instalación actual' : ''}">
      <span class="torre-list-emoji" aria-hidden="true">\${listIco}</span>
      <span class="torre-list-body">
        <span class="torre-list-name">\${(t.nombre || '').trim() || 'Instalación'}</span>
        <span class="torre-list-meta">
          \${tipoTag} · \${plantasCount} plantas · \${t.config ? geomTxt : '5N × 5C'}
          \${isActiva ? ' · <strong class="torre-list-active-tag">Activa</strong>' : ''}
        </span>
      </span>
      </button>
      <div class="torre-list-actions">
        <button type="button" onclick="editarNombreTorre(\${i})"
          class="torre-list-btn-icon" aria-label="Editar nombre de la instalación">✏️</button>
        \${state.torres.length > 1 && !isActiva ? \`
        <button type="button" onclick="borrarTorre(\${i})"
          class="torre-list-btn-del" aria-label="Borrar esta instalación">🗑</button>\` : ''}
      </div>
    </div>\`;`;
    s = s.slice(0, s.lastIndexOf('    return `', end)) + good + '\n' + s.slice(end);
    fs.writeFileSync(p, s);
    console.log('fixed via alt');
    process.exit(0);
  }
}
const endMarker = '  }).join(\'\');';
const end = s.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error('markers', start, end);
  process.exit(1);
}
const good = `    return \`<div class="torre-list-row\${isActiva ? ' torre-list-row--active' : ''}">
      <button type="button" class="torre-list-main"
        onclick="cambiarTorreActiva(\${i})"
        aria-pressed="\${isActiva ? 'true' : 'false'}"
        aria-label="Activar \${String((t.nombre || '').trim() || 'instalación').replace(/"/g, '&quot;')}\${isActiva ? ', instalación actual' : ''}">
      <span class="torre-list-emoji" aria-hidden="true">\${listIco}</span>
      <span class="torre-list-body">
        <span class="torre-list-name">\${(t.nombre || '').trim() || 'Instalación'}</span>
        <span class="torre-list-meta">
          \${tipoTag} · \${plantasCount} plantas · \${t.config ? geomTxt : '5N × 5C'}
          \${isActiva ? ' · <strong class="torre-list-active-tag">Activa</strong>' : ''}
        </span>
      </span>
      </button>
      <div class="torre-list-actions">
        <button type="button" onclick="editarNombreTorre(\${i})"
          class="torre-list-btn-icon" aria-label="Editar nombre de la instalación">✏️</button>
        \${state.torres.length > 1 && !isActiva ? \`
        <button type="button" onclick="borrarTorre(\${i})"
          class="torre-list-btn-del" aria-label="Borrar esta instalación">🗑</button>\` : ''}
      </div>
    </div>\`;`;
s = s.slice(0, start) + good + '\n' + s.slice(end);
fs.writeFileSync(p, s);
console.log('fixed torre list template');

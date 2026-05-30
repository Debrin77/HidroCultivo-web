const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { D, fechaDepositoTexto, descripcionResumidaFormulario, secciones } = require('./rpi-memoria-content');

const outputPath = path.resolve(
  __dirname,
  '..',
  'docs',
  'memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0_imprimible.pdf'
);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 54, bottom: 54, left: 54, right: 54 },
  info: {
    Title: `Memoria Tecnica - ${D.titulo} v${D.version} (Imprimible)`,
    Author: D.autor,
    Subject: 'Registro de la Propiedad Intelectual',
    Keywords: `${D.titulo}, software, propiedad intelectual, memoria tecnica`,
  },
});

doc.pipe(fs.createWriteStream(outputPath));

function divider() {
  const y = doc.y;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.6)
    .strokeColor('#d1d5db')
    .stroke();
  doc.moveDown(0.6);
}

function h1(text) {
  doc.moveDown(0.1);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(text);
  doc.moveDown(0.35);
}

function h2(text) {
  doc.moveDown(0.1);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor('#111827').text(text);
  doc.moveDown(0.2);
}

function p(text) {
  doc.font('Helvetica').fontSize(10.8).fillColor('#1f2937').text(text, {
    align: 'left',
    lineGap: 2,
  });
  doc.moveDown(0.35);
}

function kv(k, v) {
  doc.font('Helvetica-Bold').fontSize(10.8).text(`${k}: `, { continued: true });
  doc.font('Helvetica').fontSize(10.8).text(v);
  doc.moveDown(0.1);
}

function bullet(text) {
  doc.font('Helvetica').fontSize(10.8).text(`- ${text}`, { lineGap: 2 });
}

function bullets(items) {
  items.forEach(bullet);
  doc.moveDown(0.25);
}

doc.moveDown(2.8);
doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text('MEMORIA TECNICA', { align: 'center' });
doc.moveDown(0.35);
doc.font('Helvetica-Bold').fontSize(16).text('REGISTRO DE LA PROPIEDAD INTELECTUAL', { align: 'center' });
doc.moveDown(0.9);
doc.font('Helvetica').fontSize(13).text(`Programa de ordenador: "${D.titulo}"`, { align: 'center' });
doc.moveDown(0.3);
doc.font('Helvetica').fontSize(12).text(`Version ${D.version}`, { align: 'center' });
doc.moveDown(1.2);
doc.font('Helvetica').fontSize(11).text(`Autor/Titular: ${D.autor}`, { align: 'center' });
doc.moveDown(0.2);
doc.font('Helvetica').fontSize(11).text(`NIF: ${D.nif}`, { align: 'center' });
doc.moveDown(2.2);
doc.font('Helvetica').fontSize(11).text(`${D.lugar}, ${D.fechaObra}`, { align: 'center' });
doc.moveDown(1.6);
doc.font('Helvetica-Oblique').fontSize(10).text(
  'Documento de apoyo para presentacion ante Registro de Propiedad Intelectual (Espana).',
  { align: 'center' }
);

doc.addPage();

h1('MEMORIA TECNICA DE OBRA SOFTWARE');
p('Registro de la Propiedad Intelectual - Ministerio de Cultura (Espana)');
divider();

h2('1. Identificacion de la obra');
kv('Titulo', D.titulo);
kv('Tipo de obra', D.tipoObra);
kv('Version depositada', D.version);
kv('Autor y titular', D.autor);
kv('NIF', D.nif);
kv('Lugar', D.lugar);
kv('Fecha de la obra', D.fechaObra);
kv('Fecha de deposito', fechaDepositoTexto());

h2('2. Objeto y finalidad');
secciones.objeto.forEach(p);

h2('3. Descripcion funcional');
bullets(secciones.funcional);

h2('4. Tecnologias empleadas');
bullets(secciones.tecnologias);

h2('5. Arquitectura general');
p(secciones.arquitectura);

h2('6. Elementos de originalidad y aportacion');
secciones.originalidad.forEach(p);

if (doc.y > 620) {
  doc.addPage();
}

h2('7. Alcance del deposito');
bullets(secciones.deposito);

h2('8. Declaracion de autoria');
p(secciones.declaracionAutoria);
doc.moveDown(0.7);
doc.font('Helvetica-Bold').fontSize(10.8).text('Firma del autor:');
doc.moveDown(1.8);
doc.font('Helvetica').fontSize(10.8).text('_______________________________');
doc.font('Helvetica').fontSize(10.8).text(D.autor);
doc.font('Helvetica').fontSize(10.8).text(`NIF ${D.nif}`);

doc.addPage();
h1('ANEXOS');
divider();

h2('Anexo I - Descripcion resumida para formulario');
p(descripcionResumidaFormulario());

h2('Anexo II - Relacion de documentos adjuntos al ejemplar');
bullets(secciones.anexoDocumentos);

h2('Anexo III - Nota de version depositada');
p(secciones.notaVersion);

h2('Anexo IV - Componentes de terceros');
bullets(secciones.anexoTerceros);

h2('Anexo V - Ejecutable del programa (justificacion)');
secciones.justificacionEjecutable.forEach(p);

doc.end();

doc.on('end', () => {
  // eslint-disable-next-line no-console
  console.log('Memoria imprimible:', outputPath);
});

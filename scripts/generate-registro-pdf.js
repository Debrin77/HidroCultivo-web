const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { D, fechaDepositoTexto, descripcionResumidaFormulario, secciones } = require('./rpi-memoria-content');

const outputPath = path.resolve(
  __dirname,
  '..',
  'docs',
  'memoria_tecnica_registro_propiedad_intelectual_hidrocultivo_v1_0.pdf'
);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 54, bottom: 54, left: 54, right: 54 },
  info: {
    Title: `Memoria Tecnica - ${D.titulo} v${D.version}`,
    Author: D.autor,
    Subject: 'Registro de la Propiedad Intelectual',
    Keywords: `${D.titulo}, software, propiedad intelectual`,
  },
});

doc.pipe(fs.createWriteStream(outputPath));

function h1(text) {
  doc.moveDown(0.2);
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(text);
  doc.moveDown(0.4);
}

function h2(text) {
  doc.moveDown(0.15);
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

h1('MEMORIA TECNICA DE OBRA SOFTWARE');
p('Registro de la Propiedad Intelectual - Ministerio de Cultura (Espana)');

h2('1. Identificacion de la obra');
kv('Titulo', D.titulo);
kv('Titulo descriptivo', D.tituloLargo);
kv('Tipo de obra', D.tipoObra);
kv('Version depositada', D.version);
kv('Autor y titular', D.autor);
kv('NIF', D.nif);
kv('Lugar', D.lugar);
kv('Fecha de la obra (version)', D.fechaObra);
kv('Fecha de deposito', fechaDepositoTexto());
kv('Contacto', D.email);
kv('Plataformas', D.plataformas);
kv('Identificador Android', D.appId);

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

h2('7. Alcance del deposito');
bullets(secciones.deposito);

h2('8. Declaracion de autoria');
p(secciones.declaracionAutoria);

h2('9. Lugar, fecha y firma');
kv('Lugar', D.lugar);
kv('Fecha', D.fechaObra);
doc.moveDown(1.1);
doc.font('Helvetica-Bold').fontSize(10.8).text('Firma del autor:');
doc.moveDown(2.0);
doc.font('Helvetica').fontSize(10.8).text('_______________________________');
doc.font('Helvetica').fontSize(10.8).text(D.autor);
doc.font('Helvetica').fontSize(10.8).text(`NIF ${D.nif}`);
doc.moveDown(0.4);

h2('Anexo breve para formulario (descripcion resumida)');
p(descripcionResumidaFormulario());

h2('Nota sobre ejecutable');
secciones.justificacionEjecutable.forEach(p);

doc.end();

doc.on('end', () => {
  // eslint-disable-next-line no-console
  console.log('Memoria PDF:', outputPath);
});

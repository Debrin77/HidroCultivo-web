const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const D = require('./rpi-memoria-data');

const outDeposit = path.resolve(
  __dirname,
  '..',
  'docs',
  'deposito-rpi',
  `HidroCultivo-RPI-ejemplar-${D.versionSemver}`,
  'PORTADA-EJEMPLAR-RPI.pdf'
);
const outDocs = path.resolve(__dirname, '..', 'docs', 'PORTADA-EJEMPLAR-RPI.pdf');

function writePortada(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const doc = new PDFDocument({ size: 'A4', margins: 72 });
  doc.pipe(fs.createWriteStream(dest));
  doc.moveDown(4);
  doc.font('Helvetica-Bold').fontSize(22).text('EJEMPLAR IDENTIFICATIVO', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(12).text('Registro de la Propiedad Intelectual', { align: 'center' });
  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(18).text(D.titulo, { align: 'center' });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(11).text(D.tituloLargo, { align: 'center' });
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(12);
  doc.text(`Autor y titular: ${D.autor}`, { align: 'center' });
  doc.text(`NIF: ${D.nif}`, { align: 'center' });
  doc.text(`Version: ${D.version} (${D.versionSemver})`, { align: 'center' });
  doc.text(`Tipo: ${D.tipoObra}`, { align: 'center' });
  doc.moveDown(1.5);
  doc.text(`Lugar: ${D.lugar}`, { align: 'center' });
  doc.text(`Fecha de la obra: ${D.fechaObra}`, { align: 'center' });
  doc.moveDown(2);
  doc.font('Helvetica').fontSize(10).fillColor('#374151').text(
    'Contenido del deposito digital adjunto (ZIP): memoria tecnica, modulos representativos del codigo, documentacion e interfaz mediante capturas de pantalla.',
    { align: 'center', width: 420 }
  );
  doc.end();
  return dest;
}

writePortada(outDeposit);
writePortada(outDocs);
console.log('Portada:', outDeposit);
console.log('Copia:', outDocs);

/**
 * regenerate_map_json.js
 * Regenera js/data/mapaGaleriasLayout.json desde el CSV fuente de verdad.
 * Uso: node tools/regenerate_map_json.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'mapaGalerias', 'Boletos Galerias - Hoja 1.csv');
const JSON_PATH = path.join(__dirname, '..', 'js', 'data', 'mapaGaleriasLayout.json');

// --- Leer el CSV ---
const rawCSV = fs.readFileSync(CSV_PATH, 'utf-8');

// Normalizar saltos de línea y dividir por filas
const lines = rawCSV.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

// Convertir cada línea en un array de celdas
let grid = [];
let maxCols = 0;
for (const line of lines) {
  // Omitir líneas completamente vacías al final
  const cells = line.split(',').map(c => c.trim());
  if (cells.every(c => c === '')) continue;
  if (cells.length > maxCols) maxCols = cells.length;
  grid.push(cells);
}

// Rellenar filas más cortas con celdas vacías para que todas tengan el mismo largo
grid = grid.map(row => {
  while (row.length < maxCols) row.push('');
  return row;
});

// --- Validar: detectar asientos mal prefijados ---
const errors = [];
const seen = new Set();

grid.forEach((row, rowIdx) => {
  // Inferir prefijo esperado de la fila (basado en el primer asiento no-pasillo encontrado)
  const firstSeat = row.find(c => c && c !== 'pasillo' && c !== 'ESCENARIO');
  if (!firstSeat) return; // fila de pasillos o escenario

  // Extraer el prefijo del primer asiento (letras al inicio antes del número)
  const match = firstSeat.match(/^([A-Z]+)\d+$/);
  if (!match) return;
  const expectedPrefix = match[1];

  row.forEach((cell, colIdx) => {
    if (!cell || cell === 'pasillo' || cell === 'ESCENARIO') return;

    const cellMatch = cell.match(/^([A-Z]+)(\d+)$/);
    if (!cellMatch) {
      errors.push(`  ❌ Fila ${rowIdx + 1}, Col ${colIdx + 1}: Formato inválido → "${cell}"`);
      return;
    }

    const actualPrefix = cellMatch[1];
    if (actualPrefix !== expectedPrefix) {
      errors.push(`  ❌ Fila ${rowIdx + 1}, Col ${colIdx + 1}: Prefijo incorrecto. Se esperaba "${expectedPrefix}..." pero se encontró "${cell}"`);
    }

    if (seen.has(cell)) {
      errors.push(`  ⚠️  Fila ${rowIdx + 1}, Col ${colIdx + 1}: Asiento DUPLICADO → "${cell}"`);
    } else {
      seen.add(cell);
    }
  });
});

// Generar el nuevo JSON
const output = {
  rows: grid.length,
  cols: maxCols,
  layout: grid
};

if (errors.length > 0) {
  console.error('\n🔴 Se encontraron errores en el CSV:');
  errors.forEach(e => console.error(e));
  console.error(`\nTotal de errores: ${errors.length}`);
  console.log('\n⚠️  El JSON se generará de todas formas, pero revisa los errores arriba.\n');
} else {
  console.log('\n✅ El CSV está limpio. Sin errores de prefijo ni duplicados.\n');
}

// Escribir el JSON
fs.writeFileSync(JSON_PATH, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ JSON generado exitosamente en: ${JSON_PATH}`);
console.log(`   Filas: ${grid.length}`);
console.log(`   Columnas: ${maxCols}`);
console.log(`   Total de asientos únicos: ${seen.size}`);

// Mostrar un resumen de filas
const rowSummary = [];
grid.forEach((row, i) => {
  const seats = row.filter(c => c && c !== 'pasillo' && c !== 'ESCENARIO');
  if (seats.length > 0) {
    const firstSeat = seats[0];
    const lastSeat = seats[seats.length - 1];
    const prefMatch = firstSeat.match(/^([A-Z]+)/);
    const prefix = prefMatch ? prefMatch[1] : '?';
    rowSummary.push(`   Fila CSV ${String(i + 1).padStart(2)}: [${prefix}] ${seats.length} asientos (${firstSeat} → ${lastSeat})`);
  }
});
console.log('\nResumen de filas procesadas:');
rowSummary.forEach(r => console.log(r));

const fs = require('fs');

const csvPath = 'assets/data/mapa.csv';
const jsonPath = 'assets/data/mapa.json';

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

const matrix = {};
let maxRow = 0;
let maxCol = 0;

for (let r = 0; r < lines.length; r++) {
    const line = lines[r].trim();
    if (!line) continue;
    const cells = line.split(',');
    
    for (let c = 0; c < cells.length; c++) {
        const val = cells[c].trim();
        if (val) {
            matrix[val] = { r: r + 1, c: c + 1 };
            if (r + 1 > maxRow) maxRow = r + 1;
            if (c + 1 > maxCol) maxCol = c + 1;
        }
    }
}

const output = {
    max_row: maxRow,
    max_col: maxCol,
    seats: matrix
};

fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
console.log(`JSON generated successfully at ${jsonPath}. Found ${Object.keys(matrix).length} seats. Max Grid: ${maxCol}x${maxRow}`);

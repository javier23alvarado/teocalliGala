const fs = require('fs');
const path = 'assets/data/mapa.csv';

let content = fs.readFileSync(path, 'utf8');

let fixed = content.replace(/L(\d+),L\1/g, 'K$1,L$1');

fs.writeFileSync(path, fixed, 'utf8');
console.log('Fixed K and L missing rows in CSV!');

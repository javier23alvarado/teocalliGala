const fs = require('fs');
const lines = fs.readFileSync('js/controllers/loginController.js', 'utf8').split('\n');
let outLines = [];
let skip = false;
let count = 0;
for (const line of lines) {
    if (line.includes('case "auth/invalid-credential": // Agregado para compatibilidad con nuevas APIs de Firebase')) {
        count++;
        if (count === 1) {
            outLines.push(line);
            skip = true;
            continue;
        } else if (count === 2) {
            skip = false;
            continue;
        }
    }
    if (!skip) {
        outLines.push(line);
    }
}
fs.writeFileSync('js/controllers/loginController.js', outLines.join('\n'));

const fs = require('fs');
const content = fs.readFileSync('src/pages/PresupuestosPage.tsx', 'utf8');
let level = 0;
let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let open = (line.match(/\{/g) || []).length;
    let close = (line.match(/\}/g) || []).length;
    level += open - close;
    if (level > 0 && Math.abs(level) > 2) {
        // console.log(`Line ${i + 1} [L${level}]: ${line.trim()}`);
    }
}

// print every line with its level
fs.writeFileSync('indent.txt', lines.map((l, i) => {
    let open = (l.match(/\{/g) || []).length;
    let close = (l.match(/\}/g) || []).length;
    let prevLevel = level;
    level += open - close;
    return `${i + 1} [${level}]: ${l.trim()}`;
}).join('\n'));

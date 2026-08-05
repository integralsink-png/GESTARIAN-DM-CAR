const fs = require('fs');
const content = fs.readFileSync('src/pages/PresupuestosPage.tsx', 'utf8');

let stack = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Very simple heuristic ignoring strings/comments
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        if (char === '{') {
            stack.push({ line: i + 1, col: j + 1 });
        } else if (char === '}') {
            if (stack.length > 0) {
                stack.pop();
            } else {
                console.log(`Unmatched } at line ${i + 1}`);
            }
        }
    }
}

if (stack.length > 0) {
    console.log("Unmatched { at:");
    console.log(stack.map(s => `line ${s.line}`).join(', '));
} else {
    console.log("Balanced.");
}

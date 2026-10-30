// Compara dos huellas de tests/smoke-browser.js:  node tests/smoke-compare.js antes.json despues.json
const fs = require("fs");
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
const flat = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)){
    if (v && typeof v === "object") flat(v, p + k + " › ", out); else out[p + k] = v;
  }
  return out;
};
const A = flat(a), B = flat(b);
const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])];
let diff = 0;
for (const k of keys){
  if (A[k] === B[k]) continue;
  diff++;
  if (diff <= 40) console.log(`≠ ${k}\n   antes:   ${String(A[k]).slice(0, 220)}\n   después: ${String(B[k]).slice(0, 220)}`);
}
console.log(`\n${keys.length} valores comparados · ${diff} diferencias`);
process.exit(diff ? 1 : 0);

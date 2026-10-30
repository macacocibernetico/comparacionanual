// Compara dos huellas de tests/smoke-browser.js.
// Desde la consola:  node tests/smoke-compare.js antes.json despues.json
// Desde código:      require("./smoke-compare").comparar(antes, despues)
const fs = require("fs");

function aplanar(o, p = "", out = {}){
  for (const [k, v] of Object.entries(o)){
    if (v && typeof v === "object") aplanar(v, p + k + " › ", out); else out[p + k] = v;
  }
  return out;
}
function comparar(a, b){
  const A = aplanar(a), B = aplanar(b);
  const claves = [...new Set([...Object.keys(A), ...Object.keys(B)])];
  const detalle = [];
  for (const k of claves){
    if (A[k] === B[k]) continue;
    detalle.push(`≠ ${k}\n   antes:   ${String(A[k]).slice(0, 220)}\n   después: ${String(B[k]).slice(0, 220)}`);
  }
  return { total: claves.length, diferencias: detalle.length, detalle };
}
module.exports = { comparar };

if (require.main === module){
  const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
  const r = comparar(a, b);
  r.detalle.slice(0, 40).forEach(l => console.log(l));
  console.log(`\n${r.total} valores comparados · ${r.diferencias} diferencias`);
  process.exit(r.diferencias ? 1 : 0);
}

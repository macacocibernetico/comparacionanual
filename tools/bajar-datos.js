#!/usr/bin/env node
/* Baja las planillas de Google Sheets a archivos, para el Artifact.

   Un Artifact no puede leer Google Sheets por su cuenta (bloquea las conexiones a otros
   sitios), así que sus datos son una copia: este script pide EXACTAMENTE las mismas
   direcciones que pide el dashboard (index.html) y las guarda con un manifiesto que las
   indexa por una clave. La página del Artifact, en vez de hacer `fetch` a Google, busca
   el archivo por esa misma clave (ver `claveFuente` en tools/armar-artifact.js).

   Uso:  node tools/bajar-datos.js datos-artifact/config.json [carpeta-de-salida]

   config.json = lo que el dashboard guarda en localStorage["dashboardConfigV2"]
   (se obtiene con el link de ⚙️ Configurar → 🔗 Link para compañeros, o a mano).
   Las planillas tienen que estar compartidas como "Cualquier persona con el enlace: Lector".
   Los datos quedan en datos-artifact/ (ignorado por git: tiene nombres de clientes). */
const fs = require("fs"), path = require("path");

const [cfgPath, outArg] = process.argv.slice(2);
if (!cfgPath){ console.error("Uso: node tools/bajar-datos.js config.json [salida]"); process.exit(2); }
const CONFIG = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const OUT = path.resolve(outArg || path.join(path.dirname(cfgPath), "datos"));
const enc = encodeURIComponent;

/* Misma clave que usa la página del Artifact */
function claveFuente(url){
  const u = new URL(url), p = u.searchParams;
  const m = u.pathname.match(/\/d\/([^/]+)\//), id = m ? m[1] : "";
  if (u.pathname.includes("/export")) return `${id}|export|${p.get("gid") || "0"}`;
  const fmt = (p.get("tqx") || "").includes("json") ? "json" : "csv";
  const hoja = p.get("sheet") ? "sheet:" + p.get("sheet") : "gid:" + p.get("gid");
  return `${id}|${fmt}|${hoja}|h${p.get("headers")}`;
}

/* Las direcciones que pide el dashboard para cada negocio (fetchBiz, fetchContracts,
   fetchOpenContracts y fetchClientes de index.html) */
function urlsDe(key, c){
  const out = [];
  if (c.SHEET_ID){
    const base = `https://docs.google.com/spreadsheets/d/${c.SHEET_ID}`;
    const hoja = enc(c.SHEET_NAME || "Hoja1"), hdr = c.HEADER_ROW || 2;
    out.push(["datos", `${base}/gviz/tq?tqx=out:json&sheet=${hoja}&headers=${hdr}`],
             ["datos (completo)", `${base}/export?format=csv&gid=${enc(c.GID || "0")}`]);
    if (key === "brokerage"){
      if (c.CONTRACTS_SHEET){
        const sq = enc(c.CONTRACTS_SHEET);
        out.push(["contratos", `${base}/gviz/tq?tqx=out:json&sheet=${sq}&headers=1`],
                 ["contratos (csv)", `${base}/gviz/tq?tqx=out:csv&sheet=${sq}&headers=1`]);
        if (c.CONTRACTS_GID) out.push(["contratos (completo)", `${base}/export?format=csv&gid=${enc(c.CONTRACTS_GID)}`]);
      }
      if (c.OPEN_SHEET){
        const sq = enc(c.OPEN_SHEET);
        out.push(["contratos abiertos", `${base}/gviz/tq?tqx=out:json&sheet=${sq}&headers=1`],
                 ["contratos abiertos (csv)", `${base}/gviz/tq?tqx=out:csv&sheet=${sq}&headers=1`],
                 ["contratos abiertos (csv 0)", `${base}/gviz/tq?tqx=out:csv&sheet=${sq}&headers=0`]);
      }
    }
  }
  if (c.CLIENTS_URL){
    const raw = String(c.CLIENTS_URL).trim();
    const m = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/), id = m ? m[1] : raw;
    const g = raw.match(/[#&?]gid=(\d+)/), base = `https://docs.google.com/spreadsheets/d/${id}`;
    const hoja = (c.CLIENTS_SHEET || "Database_old").trim();
    if (g) out.push(["clientes (completo)", `${base}/export?format=csv&gid=${g[1]}`]);
    out.push(["clientes", `${base}/gviz/tq?tqx=out:csv&headers=0&sheet=${enc(hoja)}`]);
    if (g) out.push(["clientes (gid)", `${base}/gviz/tq?tqx=out:csv&headers=0&gid=${g[1]}`]);
  }
  return out;
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const files = {}, resumen = [];
  let n = 0;
  for (const [key, c] of Object.entries(CONFIG)){
    for (const [que, url] of urlsDe(key, c)){
      const k = claveFuente(url);
      if (files[k]) continue;                      // la misma dirección ya se bajó
      let estado = "";
      try {
        const res = await fetch(url, { redirect: "follow" });
        const text = await res.text();
        if (!res.ok) estado = "HTTP " + res.status;
        else if (text.trim().startsWith("<")) estado = "no es pública";
        else if (!text.trim()) estado = "vacía";
        else {
          const f = `f${String(++n).padStart(2, "0")}.txt`;
          fs.writeFileSync(path.join(OUT, f), text);
          files[k] = "data/" + f;
          estado = `ok · ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`;
        }
      } catch (e){ estado = "error: " + e.message; }
      resumen.push(`${key.padEnd(10)} ${que.padEnd(26)} ${estado}`);
    }
  }
  const manifest = { generatedAt: new Date().toISOString(), files, config: CONFIG };
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
  console.log(resumen.join("\n"));
  console.log(`\n${Object.keys(files).length} archivos en ${OUT}`);
})();

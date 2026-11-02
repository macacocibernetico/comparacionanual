#!/usr/bin/env node
/* Arma la versión Artifact del dashboard a partir de index.html (única fuente de verdad).

   Uso:  node tools/armar-artifact.js [carpeta-de-datos]      (por defecto datos-artifact/datos)

   Salida:  artifact/index.html   → la página (sin <!DOCTYPE>/<html>/<head>/<body>: el Artifact
                                     publica su propio esqueleto)
            artifact/data/*       → copia de los datos (si existen), publicados junto a la página

   Qué cambia respecto de index.html (solo lo que un Artifact no permite):
   1. fetchCsvText: en vez de pedirle a Google Sheets (bloqueado), busca el archivo de la
      copia por la misma clave que genera tools/bajar-datos.js.
   2. La configuración sale del manifiesto (data/manifest.json), no de localStorage.
   3. Imagen / PDF: se guardan con la capacidad "downloads" (las descargas directas no andan).
   4. Textos: "copia de datos del …" en vez de "actualizado HH:MM"; sin botón ⚙️ Configurar.
   Si no hay datos, arranca en modo demostración (los datos de ejemplo de siempre). */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const DATOS = path.resolve(ROOT, process.argv[2] || "datos-artifact/datos");
const OUT = path.join(ROOT, "artifact");

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").replace(/\r\n/g, "\n");
const avisos = [];
function reemplazar(desde, hacia, { opcional = false, todas = false } = {}){
  if (!html.includes(desde)){
    if (opcional){ avisos.push("no encontrado (opcional): " + desde.slice(0, 70)); return; }
    throw new Error("No encuentro en index.html:\n  " + desde.slice(0, 120));
  }
  html = todas ? html.split(desde).join(hacia) : html.replace(desde, () => hacia);
}

/* 1 · datos desde archivos publicados junto a la página */
reemplazar(`async function fetchCsvText(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  if (text.trim().startsWith("<")) throw new Error("La planilla no es pública. Compartila como 'Cualquier persona con el enlace: Lector'.");
  return text;
}`, `/* ===== Modo Artifact: los datos salen de una copia publicada junto a la página ===== */
const ARTIFACT = { manifest: null };
/* misma clave que tools/bajar-datos.js */
function claveFuente(url){
  const u = new URL(url), p = u.searchParams;
  const m = u.pathname.match(/\\/d\\/([^/]+)\\//), id = m ? m[1] : "";
  if (u.pathname.includes("/export")) return id + "|export|" + (p.get("gid") || "0");
  const fmt = (p.get("tqx") || "").includes("json") ? "json" : "csv";
  const hoja = p.get("sheet") ? "sheet:" + p.get("sheet") : "gid:" + p.get("gid");
  return id + "|" + fmt + "|" + hoja + "|h" + p.get("headers");
}
async function fetchCsvText(url){
  const archivo = ARTIFACT.manifest && ARTIFACT.manifest.files[claveFuente(url)];
  if (!archivo) throw new Error("HTTP 404");
  const res = await fetch(ARTIFACT.base + archivo);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
}
/* Lee la copia de datos. Prueba varias formas de resolver la dirección y, si ninguna anda,
   guarda el motivo para mostrarlo (en vez de caer en silencio en los datos de ejemplo). */
async function cargarDatosArtifact(){
  const MANIFIESTO = "data/manifest.json", errores = [];
  const candidatas = [MANIFIESTO, "./" + MANIFIESTO];
  for (const base of [document.baseURI, location.href]){
    try { candidatas.push(new URL(MANIFIESTO, base).href); } catch(e){}
  }
  for (const u of [...new Set(candidatas)]){
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (!res.ok){ errores.push(u + " → HTTP " + res.status); continue; }
      const m = await res.json();
      const abs = new URL(u, document.baseURI).href;
      ARTIFACT.base = abs.slice(0, abs.length - MANIFIESTO.length);   // carpeta de la página
      ARTIFACT.manifest = m;
      window.__CFG_ARTIFACT = m.config || {};
      CONFIG = loadConfig();
      return;
    } catch(e){ errores.push(u + " → " + (e && e.message || e)); }
  }
  if (__ESPERA_DATOS__) ARTIFACT.error = errores.join(" · ");
}
function fechaCopia(){
  const t = ARTIFACT.manifest && ARTIFACT.manifest.generatedAt;
  if (!t) return "—";
  const d = new Date(t);
  return d.toLocaleDateString("es-AR") + " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
/* Guarda un archivo generado por la página (las descargas directas no andan en un Artifact) */
async function guardarArchivo(data, nombre){
  try {
    const dl = window.claude && claude.use ? await claude.use("downloads") : null;
    if (dl){ await dl.save({ filename: nombre, data }); return; }
  } catch(e){ if (e && e.code === "declined") return; throw e; }
  const a = document.createElement("a");
  a.download = nombre; a.href = typeof data === "string" ? data : URL.createObjectURL(data); a.click();
}`);

/* 2 · configuración desde el manifiesto */
reemplazar(`function loadConfig(){
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch(e){}`,
`function loadConfig(){
  let saved = window.__CFG_ARTIFACT || {};
  if (!Object.keys(saved).length) try { saved = JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch(e){}`);
reemplazar(`init();
if (!Object.values(CONFIG).some(c => c.SHEET_ID)) setTimeout(openConfig, 400);`,
`cargarDatosArtifact().then(() => init());`);

/* 3 · descargas con la capacidad "downloads" */
reemplazar(`      const a = document.createElement("a");
      a.download = nombre + ".png"; a.href = cv.toDataURL("image/png"); a.click();`,
`      await guardarArchivo(await new Promise(r => cv.toBlob(r, "image/png")), nombre + ".png");`);
reemplazar(`doc.save(nombre + ".pdf");`, `await guardarArchivo(doc.output("blob"), nombre + ".pdf");`);
reemplazar('doc.save(`${D.titulo.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "_")}_${D.yA}.pdf`);',
           'await guardarArchivo(doc.output("blob"), `${D.titulo.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "_")}_${D.yA}.pdf`);');
reemplazar('doc.save(`${D.objetivo.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "_")}_aceite_expeller_${D.yA}.pdf`);',
           'await guardarArchivo(doc.output("blob"), `${D.objetivo.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "_")}_aceite_expeller_${D.yA}.pdf`);');
reemplazar('doc.save(`${bizName}_Contratos_${D.modo}.pdf`);', 'await guardarArchivo(doc.output("blob"), `${bizName}_Contratos_${D.modo}.pdf`);');

/* 4 · textos del Artifact */
reemplazar(`actualizado \${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}\``,
           `copia de datos del \${fechaCopia()}\``);
reemplazar("Los demás negocios quedan vacíos hasta que conectes su planilla. Para ver tus números reales, tocá <b>⚙️ Configurar</b> arriba a la derecha y pegá el enlace de tu planilla de Google Sheets.",
           '" + (ARTIFACT.error ? "<b>No pude leer la copia de los datos reales</b> (" + esc(ARTIFACT.error) + "). Recargá la página con Ctrl+F5; si sigue igual, avisale a Claude este mensaje." : "Los datos reales los carga Claude desde tus planillas: pedile “cargá los datos”.") + "', { opcional: true });
reemplazar("Datos de ejemplo — todavía no hay planillas conectadas", "Datos de ejemplo — todavía no se cargaron los datos reales", { opcional: true });
reemplazar("Este negocio todavía no tiene planilla conectada.<br>Tocá <b>⚙️ Configurar</b> arriba a la derecha, elegí el negocio y pegá el enlace de su planilla.",
           "Este negocio todavía no tiene datos cargados.<br>Pedile a Claude que los cargue desde su planilla.", { opcional: true });
/* 4a · ↻ Actualizar: vuelve a leer la copia publicada (que se renueva sola a las 18:00) y dice de cuándo es */
reemplazar(`function textoFrescura(){ return "Actualizado " + new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }`,
           `function textoFrescura(){ return "Datos del " + fechaCopia(); }`);
reemplazar(`document.getElementById("btnReload").onclick = () => { closeSheet(); init({ force: true }); };`,
`document.getElementById("btnReload").title = "Vuelve a leer la copia de datos. La copia se renueva sola todos los días a las 18:00.";
document.getElementById("btnReload").onclick = async () => {
  closeSheet();
  const antes = ARTIFACT.manifest && ARTIFACT.manifest.generatedAt;
  await cargarDatosArtifact();
  const despues = ARTIFACT.manifest && ARTIFACT.manifest.generatedAt;
  await init({ force: true });
  try { aviso(despues && despues !== antes ? "Datos nuevos cargados (" + fechaCopia() + ")" : "Ya tenés la última copia (" + fechaCopia() + "). Se renueva sola a las 18:00."); } catch(e){}
};`);
reemplazar(`\\n\\nTocá para volver a leer las planillas.`, `\\n\\nTocá para volver a leer la copia. Se renueva sola todos los días a las 18:00.`, { opcional: true });
reemplazar(`  const res = await fetch(ARTIFACT.base + archivo);`, `  const res = await fetch(ARTIFACT.base + archivo, { cache: "no-store" });`);
/* 4b · vista inicial del Artifact: Brokerage Maní, el año en curso solo, sin comparar (se aplica en cada apertura) */
reemplazar(`  if (!ui.filter || !ui.filter.mode) ui.filter = { mode: "todos", sel: null };`,
`  ui.biz = "brokerage"; ui.mode = "solo"; ui.year = new Date().getFullYear(); ui.cmpSet = [];
  ui.bizSub = { ...(ui.bizSub || {}), brokerage: "mani" };
  if (!ui.filter || !ui.filter.mode) ui.filter = { mode: "todos", sel: null };`);
/* 5 · el estilo Zentra (marca, título, resumen) ya vive en index.html; acá solo se oculta la configuración de planillas */
reemplazar("</style>", "\n  /* Artifact: la configuración de planillas la maneja Claude */\n  #btnConfig{display:none!important}\n</style>");
/* 6 · el mapa del globo va en la copia de datos (bajar-datos.js lo baja como data/world-110m.json) */
reemplazar('function urlMundo(){ return "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"; }',
           'function urlMundo(){ return ARTIFACT.base + "data/world-110m.json"; }');
reemplazar('<title>Dashboard de Negocios</title>', '<title>Dashboard Exportaciones Latinut</title>');

/* esqueleto: el Artifact agrega <!DOCTYPE>, <html>, <head> y <body> al publicar */
const head = (html.match(/<head>([\s\S]*?)<\/head>/) || [])[1];
const body = (html.match(/<body>([\s\S]*)<\/body>/) || [])[1];
if (!head || !body) throw new Error("No pude separar <head> y <body> de index.html");
const cabeza = head.split("\n")
  .filter(l => !/<meta charset|<meta name="viewport"|rel="(preconnect|dns-prefetch)" href="https:\/\/docs\.google\.com"/.test(l))
  .join("\n").trim();
const pagina = cabeza + "\n" + body.trim() + "\n";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "index.html"), pagina);
let nDatos = 0;
const hayDatos = fs.existsSync(path.join(DATOS, "manifest.json"));
fs.writeFileSync(path.join(OUT, "index.html"), pagina.replace("__ESPERA_DATOS__", String(hayDatos)));
if (hayDatos){
  fs.mkdirSync(path.join(OUT, "data"), { recursive: true });
  for (const f of fs.readdirSync(DATOS)){ fs.copyFileSync(path.join(DATOS, f), path.join(OUT, "data", f)); nDatos++; }
}
console.log(`artifact/index.html (${(pagina.length / 1024).toFixed(0)} KB) · ${nDatos ? nDatos + " archivos de datos" : "sin datos: modo demostración"}`);
avisos.forEach(a => console.log("aviso:", a));

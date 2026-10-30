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
  const res = await fetch(archivo);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.text();
}
async function cargarDatosArtifact(){
  try {
    const res = await fetch("data/manifest.json");
    if (!res.ok) return;                                   // sin copia de datos: modo demostración
    const m = await res.json();
    ARTIFACT.manifest = m;
    window.__CFG_ARTIFACT = m.config || {};
    CONFIG = loadConfig();
  } catch(e){ /* sin datos: modo demostración */ }
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
           "Los datos reales los carga Claude desde tus planillas: pedile “cargá los datos”.", { opcional: true });
reemplazar("Datos de ejemplo — todavía no hay planillas conectadas", "Datos de ejemplo — todavía no se cargaron los datos reales", { opcional: true });
reemplazar("Este negocio todavía no tiene planilla conectada.<br>Tocá <b>⚙️ Configurar</b> arriba a la derecha, elegí el negocio y pegá el enlace de su planilla.",
           "Este negocio todavía no tiene datos cargados.<br>Pedile a Claude que los cargue desde su planilla.", { opcional: true });
reemplazar("</style>", "  /* Artifact: la configuración de planillas la maneja Claude */\n  #btnConfig{display:none!important}\n</style>");
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
if (fs.existsSync(path.join(DATOS, "manifest.json"))){
  fs.mkdirSync(path.join(OUT, "data"), { recursive: true });
  for (const f of fs.readdirSync(DATOS)){ fs.copyFileSync(path.join(DATOS, f), path.join(OUT, "data", f)); nDatos++; }
}
console.log(`artifact/index.html (${(pagina.length / 1024).toFixed(0)} KB) · ${nDatos ? nDatos + " archivos de datos" : "sin datos: modo demostración"}`);
avisos.forEach(a => console.log("aviso:", a));

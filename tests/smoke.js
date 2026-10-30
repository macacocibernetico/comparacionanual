#!/usr/bin/env node
/* Prueba de humo automática: corre tests/smoke-browser.js en un navegador sin ventana (Chrome o Edge)
   sobre la versión de referencia de index.html y sobre la actual, y compara las huellas.

   Uso:  node tests/smoke.js [ref]        ref = commit o rama de referencia (por defecto HEAD)
         node tests/smoke.js main         → compara la copia de trabajo contra main

   Sin dependencias: usa el navegador instalado y el protocolo de depuración por WebSocket
   (Node 22+). Cada versión corre en un perfil nuevo, sin caché ni estado guardado.
   Navegador: SMOKE_BROWSER=ruta\al\navegador.exe si no está en el lugar de siempre. */
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { spawn, execFileSync } = require("child_process");
const { comparar } = require("./smoke-compare");

const ROOT = path.join(__dirname, "..");
const REF = process.argv[2] || "HEAD";
const CANDIDATOS = [
  process.env.SMOKE_BROWSER,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean);
const NAVEGADOR = CANDIDATOS.find(p => fs.existsSync(p));
if (!NAVEGADOR){ console.error("No encontré Chrome ni Edge. Indicá la ruta con SMOKE_BROWSER."); process.exit(2); }

const espera = ms => new Promise(r => setTimeout(r, ms));

/* servidor local: la versión de referencia en /__ref.html, el resto desde la carpeta del repo */
function servidor(refHtml){
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]);
      if (u === "/__ref.html"){ r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return r.end(refHtml); }
      const p = path.join(ROOT, u === "/" ? "index.html" : u);
      if (!p.startsWith(ROOT)){ r.writeHead(403); return r.end(); }
      fs.readFile(p, (e, d) => {
        if (e){ r.writeHead(404); return r.end(); }
        r.writeHead(200, { "Content-Type": p.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        r.end(d);
      });
    }).listen(0, "127.0.0.1", () => res(s));
  });
}

/* una corrida: navegador nuevo → abre la página → evalúa la prueba → devuelve la huella */
async function correr(url, codigo){
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-"));
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const nav = spawn(NAVEGADOR, ["--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=1440,900", "about:blank"], { stdio: "ignore" });
  try {
    let objetivo = null;
    for (let i = 0; i < 60 && !objetivo; i++){
      await espera(250);
      try { objetivo = await (await fetch(`http://127.0.0.1:${puerto}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json(); } catch (e) {}
    }
    if (!objetivo) throw new Error("El navegador no respondió");
    const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
    await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = mal; });
    let id = 0; const pend = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)){ pend.get(m.id)(m); pend.delete(m.id); } };
    const cdp = (method, params = {}) => new Promise(ok => { const k = ++id; pend.set(k, ok); ws.send(JSON.stringify({ id: k, method, params })); });
    const evaluar = async expr => {
      const r = await cdp("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 240000 });
      if (r.error) throw new Error(r.error.message);
      if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
      return r.result && r.result.result ? r.result.result.value : undefined;
    };
    const seguro = async e => { try { return await evaluar(e); } catch (x) { return null; } };
    // esperar a que la página pedida (no about:blank) esté cargada y con el script del dashboard listo
    const lista = `location.href === ${JSON.stringify(url)} && document.readyState === "complete" && typeof init === "function"`;
    let ok = false;
    for (let i = 0; i < 120 && !ok; i++){ ok = await seguro(lista) === true; if (!ok) await espera(250); }
    if (!ok) throw new Error("La página no terminó de cargar: " + url);
    const salida = await evaluar(codigo);
    ws.close();
    return JSON.parse(salida);
  } finally {
    nav.kill();
    await espera(300);
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
  }
}

(async () => {
  const t0 = Date.now();
  let refHtml;
  try { refHtml = execFileSync("git", ["show", `${REF}:index.html`], { cwd: ROOT, maxBuffer: 64e6 }).toString("utf8"); }
  catch (e){ console.error(`No pude leer index.html de "${REF}".`); process.exit(2); }
  const codigo = fs.readFileSync(path.join(__dirname, "smoke-browser.js"), "utf8");
  const srv = await servidor(refHtml);
  const base = `http://127.0.0.1:${srv.address().port}`;
  console.log(`Navegador: ${path.basename(NAVEGADOR)} · referencia: ${REF}`);
  try {
    const [antes, despues] = await Promise.all([correr(`${base}/__ref.html`, codigo), correr(`${base}/index.html`, codigo)]);
    const { total, diferencias, detalle } = comparar(antes, despues);
    detalle.slice(0, 40).forEach(l => console.log(l));
    console.log(`\n${Object.keys(antes).length} escenarios · ${total} valores comparados · ${diferencias} diferencias · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    process.exitCode = diferencias ? 1 : 0;
  } finally { srv.close(); }
})().catch(e => { console.error("Error:", e.message); process.exit(2); });

/* ===== Datos en vivo ====================================================================
   Un Artifact no puede hacer fetch a Google Sheets, pero sí puede usar el conector de Google Drive
   de quien mira la página (capacidad "mcp"). Acá se baja cada planilla como libro de Excel con las
   credenciales del propio usuario, se lee con SheetJS y se devuelve a la página exactamente el mismo
   texto que le devolvería Google (JSON de gviz o CSV): el resto del dashboard no cambia.
   Si el conector no está, no hay permiso o algo falla, se usa la copia publicada junto a la página. */
const VIVO = { mcp: null, listo: false, libros: new Map(), ok: 0, fallo: 0, ts: 0, error: "", consentido: false };
const VIVO_SERVIDOR = "Google Drive";
const VIVO_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

async function vivoListo(){
  if (VIVO.listo) return !!VIVO.mcp;
  VIVO.listo = true;
  try { VIVO.mcp = window.claude && claude.use ? await claude.use("mcp") : null; } catch(e){ VIVO.mcp = null; }
  if (!VIVO.mcp) VIVO.error = "esta vista no puede conectarse a Google Drive";
  return !!VIVO.mcp;
}
function vivoMotivo(e){
  const c = e && e.code, m = (e && e.message) || String(e);
  if (c === "server_not_connected" || c === "selection_required" || c === "server_not_found") return "Google Drive no está conectado: agregalo en claude.ai → Configuración → Conectores";
  if (c === "needs_reauth") return "hay que reconectar Google Drive en claude.ai → Configuración → Conectores";
  if (c === "not_in_manifest" || c === "approval_required" || c === "consent_required" || c === "not_granted") return "falta el permiso para leer tu Google Drive (tocá Actualizar para volver a pedirlo)";
  if (c === "blocked_by_policy") return "tu organización bloquea este conector";
  if (c === "tool_error") return "Drive no pudo abrir la planilla (" + m + ")";
  return m;
}
/* el base64 del libro: el texto más largo que traiga el resultado del conector */
function vivoBase64(r){
  let mejor = "";
  const ver = v => {
    if (typeof v === "string"){ if (v.length > mejor.length) mejor = v; }
    else if (Array.isArray(v)) v.forEach(ver);
    else if (v && typeof v === "object") Object.values(v).forEach(ver);
  };
  ver(r && r.payload); ver(r && r.structuredContent); ver(r && r.content);
  const t = mejor.trim();
  if (t.startsWith("{") || t.startsWith("[")){          // JSON con el base64 adentro
    try { const antes = mejor; mejor = ""; ver(JSON.parse(t)); if (!mejor) mejor = antes; } catch(e){}
  }
  return mejor.replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
}
let _vivoCola = Promise.resolve();
/* hasta la primera respuesta, de a una: así el permiso se pide una sola vez */
function vivoLlamar(fn){
  if (VIVO.consentido) return fn();
  const r = _vivoCola.then(fn, fn);
  _vivoCola = r.catch(() => {});
  return r;
}
async function vivoLibro(id){
  const h = VIVO.libros.get(id);
  if (h && Date.now() - h.t < 30000) return h.p;
  const p = vivoLlamar(async () => {
    await cargarScript(XLSX_URL);
    const r = await VIVO.mcp.callTool(VIVO_SERVIDOR, "download_file_content", { fileId: id, exportMimeType: VIVO_MIME }, { cache: false });
    const b64 = vivoBase64(r);
    if (b64.length < 200) throw new Error("Drive devolvió una respuesta vacía");
    VIVO.consentido = true;
    return XLSX.read(b64, { type: "base64", cellNF: true });
  });
  VIVO.libros.set(id, { t: Date.now(), p });
  p.catch(() => VIVO.libros.delete(id));
  return p;
}
/* La hoja como filas de valores: números, texto y fechas {y, mo, d} (las celdas con formato de fecha) */
function vivoFilas(ws){
  const rg = XLSX.utils.decode_range(ws["!ref"] || "A1:A1"), out = [];
  for (let R = rg.s.r; R <= rg.e.r; R++){
    const fila = [];
    for (let C = rg.s.c; C <= rg.e.c; C++){
      const c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!c || c.v === undefined || c.v === null || c.v === ""){ fila.push(""); continue; }
      if (c.t === "n" && c.z && XLSX.SSF.is_date(c.z)){
        const d = XLSX.SSF.parse_date_code(c.v);
        fila.push(d ? { y: d.y, mo: d.m, d: d.d } : c.v);
      } else if (c.t === "n" || c.t === "b") fila.push(c.v);
      else fila.push(String(c.v));
    }
    out.push(fila);
  }
  return out;
}
const vivoFecha = v => v.y + "-" + String(v.mo).padStart(2, "0") + "-" + String(v.d).padStart(2, "0");
const vivoTxt = v => v === "" || v == null ? "" : typeof v === "object" ? vivoFecha(v) : String(v);
/* Como gviz con headers=N: las N primeras filas se juntan en el rótulo de cada columna */
function vivoRotulos(filas, n){
  const ncol = filas.reduce((m, r) => Math.max(m, r.length), 0);
  return Array.from({ length: ncol }, (_, i) => filas.slice(0, n).map(r => vivoTxt(r[i])).filter(s => s !== "").join(" "));
}
function vivoGviz(filas, headers){
  const n = Math.max(0, headers | 0), rot = vivoRotulos(filas, n);
  const cols = rot.map((label, i) => ({ id: "c" + i, label, type: "string" }));
  const rows = filas.slice(n).map(r => ({ c: rot.map((_, i) => {
    const v = r[i] === undefined ? "" : r[i];
    if (v === "") return null;
    return { v: typeof v === "object" ? "Date(" + v.y + "," + (v.mo - 1) + "," + v.d + ")" : v };
  }) }));
  return "/*O_o*/\ngoogle.visualization.Query.setResponse(" + JSON.stringify({ version: "0.6", status: "ok", table: { cols, rows } }) + ");";
}
function vivoCsv(filas, headers){
  const n = Math.max(0, headers | 0);
  const f = n > 0 ? [vivoRotulos(filas, n), ...filas.slice(n)] : filas;
  const ncol = f.reduce((m, r) => Math.max(m, r.length), 0);
  return f.map(r => Array.from({ length: ncol }, (_, i) => {
    const s = vivoTxt(r[i]);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
}
function vivoPedido(url){
  const u = new URL(url), p = u.searchParams;
  const m = u.pathname.match(/\/d\/([^/]+)\//), esExport = u.pathname.includes("/export");
  return { id: m ? m[1] : "", tipo: esExport ? "export" : (p.get("tqx") || "").includes("json") ? "json" : "csv",
    hoja: p.get("sheet") || "", gid: p.get("gid") || (esExport ? "0" : ""), headers: p.get("headers") == null ? 0 : +p.get("headers") };
}
/* Qué pestaña del libro es: por nombre, o por gid usando lo que dice la configuración de cada negocio */
function vivoNombreHoja(wb, ped){
  if (ped.hoja){
    if (wb.Sheets[ped.hoja]) return ped.hoja;
    const k = wb.SheetNames.find(n => n.trim().toLowerCase() === ped.hoja.trim().toLowerCase());
    if (k) return k;
    throw new Error("No encuentro la pestaña «" + ped.hoja + "»");
  }
  const gid = String(ped.gid || "0");
  for (const c of Object.values(CONFIG || {})){
    if (c.SHEET_ID === ped.id && String(c.GID || "0") === gid && c.SHEET_NAME && wb.Sheets[c.SHEET_NAME]) return c.SHEET_NAME;
    for (const [url, nom] of [[c.CLIENTS_URL, c.CLIENTS_SHEET], [c.SUPPLIERS_URL, c.SUPPLIERS_SHEET]]){
      const mm = String(url || "").match(/\/d\/([^/#?]+)/), gg = String(url || "").match(/[#&?]gid=(\d+)/);
      if (nom && wb.Sheets[nom] && ((mm && mm[1] === ped.id) || String(url || "").trim() === ped.id) && gg && gg[1] === gid) return nom;
    }
  }
  if (gid === "0") return wb.SheetNames[0];
  throw new Error("No sé qué pestaña tiene gid=" + gid);
}
async function vivoLeer(url){
  const ped = vivoPedido(url), wb = await vivoLibro(ped.id);
  const filas = vivoFilas(wb.Sheets[vivoNombreHoja(wb, ped)]);
  return ped.tipo === "json" ? vivoGviz(filas, ped.headers) : vivoCsv(filas, ped.tipo === "export" ? 0 : ped.headers);
}
function vivoHora(){ return new Date(VIVO.ts || Date.now()).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }
const vivoActivo = () => VIVO.ok > 0 && !VIVO.fallo;
function vivoReiniciar(){ VIVO.libros.clear(); VIVO.ok = 0; VIVO.fallo = 0; VIVO.error = ""; }

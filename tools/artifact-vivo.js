/* ===== Datos en vivo ====================================================================
   Un Artifact no puede hacer fetch a Google Sheets, pero sí puede usar el conector de Google Drive
   de quien mira la página (capacidad "mcp"). Acá se baja cada planilla como libro de Excel con las
   credenciales del propio usuario, se lee con SheetJS (libroATexto, en index.html) y se devuelve a la página exactamente el mismo
   texto que le devolvería Google (JSON de gviz o CSV): el resto del dashboard no cambia.
   Si el conector no está, no hay permiso o algo falla, se usa la copia publicada junto a la página. */
const VIVO = { mcp: null, listo: false, libros: new Map(), ok: 0, fallo: 0, ts: 0, error: "", consentido: false };
const VIVO_SERVIDOR = "Google Drive";
const VIVO_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
async function vivoLeer(url){ return libroATexto(await vivoLibro(vivoPedido(url).id), url); }
function vivoHora(){ return new Date(VIVO.ts || Date.now()).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }
const vivoActivo = () => VIVO.ok > 0 && !VIVO.fallo;
function vivoReiniciar(){ VIVO.libros.clear(); VIVO.ok = 0; VIVO.fallo = 0; VIVO.error = ""; }

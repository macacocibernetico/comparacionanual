/* Prueba de humo en el navegador: carga planillas FALSAS por el mismo camino que las
   reales (fetch → CSV → buildRecords / buildContracts / buildOpenContracts / clientes),
   recorre todas las vistas y controles, y devuelve una "huella" (textos, visibilidad
   y datos de cada gráfico). Se corre antes y después de un cambio visual y se comparan
   con `node tests/smoke-compare.js antes.json despues.json`: deben dar idénticas.

   Uso: abrir index.html servido por http, y evaluar este archivo en la consola.
   Todos los nombres de empresas son inventados (salvo los defaults que ya están en el código). */
(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const num = (v, d = 2) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fecha = (y, m, d) => `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
  const csv = rows => rows.map(r => r.map(c => /[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(",")).join("\n");

  /* ---------- planillas falsas ---------- */
  const HEAD = ["Negocio", "Tns", "Product", "Packing", "Containers", "Consolidación", "ETD", "Port", "Exporter", "Importer",
    "TOTAL FINAL", "Monto LT", "total flete", "Comision Broker", "Fecha de cobro", "Fecha estimada"];
  const SHEETS = {
    axt: { prods: ["Blancheado Split", "Blancheado 38/42", "Blancheado 40/50", "Peanut paste", "Roasted runner", "Maní runner NOP"],
      ports: ["Norfolk", "New York", "Toronto", "Livorno", "Napoli", "Genova", "Rotterdam"], packs: ["Bags", "Big bags", "Drums"],
      exps: ["AXT"], imps: ["Cliente Norte BV", "Cliente Este Inc", "Cliente Sur SRL"] },
    buzaram: { prods: ["Maní confitería", "Maní tostado", "Pasta de maní"], ports: ["Valencia", "Hamburgo"], packs: ["Bags"],
      exps: ["Buzaram"], imps: ["Comprador Uno SL", "Comprador Dos GmbH"] },
    brokerage: { prods: ["Peanut kernels 38/42", "Peanut kernels 40/50", "Blanched split", "Peanut oil", "Expeller"],
      ports: ["Rotterdam", "Buenos Aires", "Shanghai", "Santos"], packs: ["Bulk", "Bags", "Flexitank"],
      exps: ["Exportadora Alfa SA", "Exportadora Beta S.R.L.", "NEWSAN SA", "Latinut S.A."],
      imps: ["Importadora Delta BV", "Importadora Gamma Ltd", "Molino Local SA", "Aceitera Interior S.A.", "Trader Omega GmbH"] },
  };
  function mainSheet(key){
    const S = SHEETS[key];
    const rows = [["Planilla de prueba"], HEAD];
    let n = 0;
    for (const y of [2024, 2025, 2026]){
      const maxMo = y === 2026 ? 10 : 12;
      for (let mo = 1; mo <= maxMo; mo++){
        const k = 2 + Math.floor(rnd() * 3);
        for (let i = 0; i < k; i++){
          const tns = 18 + rnd() * 90, price = 800 + rnd() * 700;
          const d = 1 + Math.floor(rnd() * 27);
          const cons = mo > 1 ? fecha(y, mo - 1, d) : fecha(y, mo, 1);
          const cobro = rnd() > .3 ? fecha(y, Math.min(12, mo + 1), d) : "";
          rows.push([`${key.toUpperCase()}-${++n}`, num(tns, 2), pick(S.prods), pick(S.packs), "1", cons, fecha(y, mo, d), pick(S.ports),
            pick(S.exps), pick(S.imps), num(tns * price), num(tns * (12 + rnd() * 20)), rnd() > .5 ? num(rnd() * 3000) : "",
            rnd() > .5 ? num(rnd() * 800) : "", cobro, cobro ? "" : fecha(y, Math.min(12, mo + 2), d)]);
        }
      }
    }
    // una fila sin ETD (no se cuenta) y una fila vacía
    rows.push([`${key.toUpperCase()}-X`, num(10, 2), S.prods[0], "", "", "", "", "", "", "", num(1000), "", "", "", "", ""], []);
    return csv(rows);
  }
  function contractsSheet(){
    const S = SHEETS.brokerage;
    const rows = [["Fecha", "Contrato", "Exportador", "Importador", "Producto", "Tipo", "Toneladas", "Precio", "Total", "Packaging", "Incoterm",
      "Forma de pago", "Comision Total", "PAGOS USA", "ENT", "Saldo", "Periodo de embarque"]];
    let n = 0;
    for (const y of [2024, 2025, 2026]) for (let mo = 1; mo <= (y === 2026 ? 10 : 12); mo++){
      if (rnd() < .4) continue;
      const t = 50 + rnd() * 400, p = 900 + rnd() * 500;
      rows.push([fecha(y, mo, 1 + Math.floor(rnd() * 27)), `C-${++n}`, pick(S.exps), pick(S.imps), pick(S.prods), "Spot", num(t), num(p), num(t * p),
        pick(S.packs), "FOB", "CAD", num(t * 6), "", "", num(rnd() > .5 ? rnd() * t : 0), `${pick(["Ago", "Sep", "Oct"])} ${y}`]);
    }
    return csv(rows);
  }
  function openSheet(){
    const S = SHEETS.brokerage;
    const meses = ["ago-26", "sept-26", "oct-26", "nov-26", "dic-26", "ene-27"];
    const rows = [["Contrato", "Exportador", "Importador", "Producto", "Toneladas", "Saldo", "Prompt", ...meses]];
    for (let i = 1; i <= 7; i++) rows.push([`C-${i}`, pick(S.exps), pick(S.imps), pick(S.prods), num(300), num(rnd() * 200), "Q4",
      ...meses.map(() => rnd() > .4 ? num(rnd() * 120) : "")]);
    return csv(rows);
  }
  function clientsSheet(){
    return csv([["Company", "Country", "Contacto"], ["Importadora Delta BV", "Netherlands", ""], ["Importadora Gamma Ltd", "United Kingdom", ""],
      ["Molino Local SA", "ARGENTINA", ""], ["Aceitera Interior S.A.", "Argentina", ""], ["Trader Omega GmbH", "", ""]]);
  }
  const FILES = {};
  for (const k of Object.keys(SHEETS)) FILES[k] = mainSheet(k);
  FILES.contracts = contractsSheet(); FILES.open = openSheet(); FILES.clients = clientsSheet();

  /* ---------- fetch simulado ---------- */
  const realFetch = window.fetch;
  window.fetch = async url => {
    const u = decodeURIComponent(String(url));
    const ok = body => ({ ok: true, status: 200, text: async () => body });
    if (u.includes("tqx=out:json")) throw new Error("gviz json no simulado");
    if (u.includes("/d/CLI")) return ok(FILES.clients);
    const id = (u.match(/\/d\/([A-Z]+)/) || [])[1];
    if (id === "BRK" && u.includes("sheet=ALL CONTRATOS")) return ok(FILES.contracts);
    if (id === "BRK" && u.includes("sheet=Contratos Abiertos")) return ok(FILES.open);
    const map = { AXT: "axt", BUZ: "buzaram", BRK: "brokerage" };
    if (map[id]) return ok(FILES[map[id]]);
    return realFetch(url);
  };

  /* ---------- config y carga ---------- */
  // esperar a que termine el arranque propio de la página (si no, su carga pisa la simulada)
  await wait(1500);
  try { localStorage.removeItem("dashboardCache"); localStorage.removeItem("dashboardUI"); } catch (e) {}
  for (const k of Object.keys(UI)) delete UI[k];
  Object.assign(UI, loadUI());   // vista, filtros y años en sus valores por defecto
  CONFIG.axt.SHEET_ID = "AXT"; CONFIG.buzaram.SHEET_ID = "BUZ"; CONFIG.brokerage.SHEET_ID = "BRK";
  CONFIG.brokerage.CLIENTS_URL = "https://docs.google.com/spreadsheets/d/CLI/edit#gid=5";
  CONFIG.brokerage.EXCLUDE_EXPORTERS = "Latinut S.A.";
  document.getElementById("modalBg").classList.remove("open");
  await init({ force: true });
  await wait(300);

  /* ---------- huella ---------- */
  const norm = s => String(s || "").replace(/actualizado \d\d:\d\d/g, "actualizado HH:MM").replace(/\s+/g, " ").trim();
  const IDS = ["kpis", "contextBar", "secNav", "ytdNote", "banner", "lblTableYear", "prodTable", "prodCompare", "lblRoll", "rollLegend",
    "bizLegend", "bizTable", "bizTotTns", "bizTotUsd", "bizTotCom", "oilexpStats", "oxClientsTable", "oilexpTable", "oilexpYears",
    "focusTitle", "focusTable", "focusYears", "consTable", "portTable", "gruposTable", "mktSplit", "mktExp", "mktCli", "mktFreq",
    "partnerTable", "contractsTable", "pipeStats", "pipeTable", "footer", "yearPills", "tabs", "btnFilter", "btnSplit"];
  const CARDS = ["kpis", "rollCard", "bizCard", "oilexpCard", "focusCard", "consSection", "gruposCard", "mktCard", "partnerCard",
    "contractsCard", "pipeCard", "compareCard", "grpYear", "grpMode", "grpView", "btnFilter", "btnSplit", "ytdNote", "banner"];
  const huella = () => {
    const o = { txt: {}, vis: {}, charts: {} };
    for (const id of IDS){
      const el = document.getElementById(id); if (!el) continue;
      // lo que está dentro de una tarjeta oculta no se compara (puede quedar texto viejo del arranque)
      const card = el.closest(".card");
      o.txt[id] = card && (card.style.display === "none" || card.hidden) ? "(oculto)" : norm(el.textContent);
    }
    for (const id of CARDS){ const el = document.getElementById(id); if (el) o.vis[id] = el.style.display === "none" || el.hidden ? "oculto" : "visible"; }
    for (const [k, ch] of Object.entries(charts)){
      if (!ch || !ch.data) continue;
      o.charts[k] = (ch.data.labels || []).join("|") + " :: " + ch.data.datasets.map(d =>
        `${d.label}=${(d.data || []).reduce((s, v) => s + (typeof v === "number" ? v : (v && typeof v.x === "number" ? v.x : 0) || 0), 0).toFixed(2)}`).join(" ; ");
    }
    o.charts = Object.fromEntries(Object.entries(o.charts).sort());
    return o;
  };
  const OUT = {};
  const snap = async name => { await wait(60); OUT[name] = huella(); };
  const click = el => { if (el){ el.click(); return true; } return false; };
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];

  await snap("inicio");
  const tabs = () => qa("#tabs .tab");
  for (let t = 0; t < tabs().length; t++){
    const tab = tabs()[t];
    const name = norm(tab.textContent);
    click(tab); await snap(`${name} · comparar`);
    click(q('#modeSeg [data-mode="solo"]')); await snap(`${name} · un año`);
    if (q("#btnSplit").style.display !== "none"){ click(q("#btnSplit")); await snap(`${name} · un año · desglose`); click(q("#btnSplit")); }
    click(q('#modeSeg [data-mode="comparar"]'));
    const all = q('#yearPills [data-y="all"]'); if (all){ click(all); await snap(`${name} · todos los años`); }
    click(q('#prodMetric [data-pm2="usd"]')); await snap(`${name} · detalle USD`); click(q('#prodMetric [data-pm2="tns"]'));
    // segmentos y switches propios de cada sección visible
    for (const sel of ["#consMetric button", "#partnerSeg button", "#oxClientSeg button", "#focusMetric button", "#contractsSeg button",
                       "#pipeSeg button", "#pipeModo button", "#mktMetric button", "#mktPeriodo button"]){
      const bs = qa(sel).filter(b => b.offsetParent !== null);
      for (let i = 1; i < bs.length; i++){ click(bs[i]); await snap(`${name} · ${sel} ${norm(bs[i].textContent)}`); }
      if (bs[0]) click(bs[0]);
    }
    for (const sw of qa('.switch input[type=checkbox]').filter(x => x.closest(".card") && x.closest(".card").style.display !== "none")){
      sw.click(); await snap(`${name} · switch ${sw.id}`); sw.click();
    }
    // detalle al tocar una barra del gráfico de toneladas
    if (charts.chTns){
      charts.chTns.options.onClick(null, [{ datasetIndex: 0, index: 2 }]);
      await snap(`${name} · detalle de barra`);
      OUT[`${name} · detalle de barra`].detalle = norm(q("#detailTitle").textContent + " " + q("#detailTable").textContent).slice(0, 4000);
      click(q("#detailClose"));
    }
    // filas clickeables (grupos, empresas)
    for (const sel of ["#gruposTable tr.rowlink", "#partnerTable tr.rowlink"]){
      const r = qa(sel)[0];
      if (r && r.offsetParent !== null){
        click(r); await wait(60);
        OUT[`${name} · ${sel}`] = { detalle: norm(q("#detailTitle").textContent + " " + q("#detailTable").textContent).slice(0, 4000) };
        click(q("#detailClose"));
      }
    }
  }
  // filtro de productos: accesos rápidos y "ninguno" (no debe vaciar la vista)
  click(tabs()[0]);
  click(q("#btnFilter"));
  for (const chip of qa("#filterChips button")){ click(chip); await snap(`AXT · filtro ${norm(chip.textContent)}`); }
  click(q("#fltNone")); await snap("AXT · filtro ninguno");
  click(q("#fltInvert")); await snap("AXT · filtro invertir");
  click(q("#fltAll")); await snap("AXT · filtro todos");
  click(q("#btnFilter"));
  // excluidos visibles en Brokerage
  const brk = tabs().find(t => /Brokerage Man/.test(t.textContent)); click(brk);
  const chipEx = qa("#contextBar button, #contextBar .chip").find(b => /exclu|Latinut/i.test(b.textContent));
  if (chipEx){ click(chipEx); await snap("Brokerage · con excluidos"); click(chipEx); }
  // zoom de la tendencia, tema, plegado, configuración y menú
  const cell = q(".trendcell"); if (cell){ click(cell); OUT.zoom = { abierto: q("#rollZoomBg").classList.contains("open"), titulo: norm(q("#rollZoomTitle").textContent) }; click(q("#rollZoomClose")); }
  const th0 = document.documentElement.dataset.theme; click(q("#btnTheme")); OUT.tema = { cambia: document.documentElement.dataset.theme !== th0 }; click(q("#btnTheme"));
  const head = q("#rollCard .clickhead"); if (head){ click(head); OUT.plegado = { cerrado: q("#rollCard").classList.contains("collapsed") || head.getAttribute("aria-expanded") === "false" }; click(head); }
  click(q("#btnConfig")); OUT.config = { abierto: q("#modalBg").classList.contains("open") }; click(q("#cfgCancel"));
  OUT.config.cerrado = !q("#modalBg").classList.contains("open");
  click(q("#btnColors")); OUT.colores = { abierto: q("#colorPanel").style.display !== "none", swatches: qa("#yearSwatches input").length }; click(q("#btnColors"));

  window.fetch = realFetch;
  return JSON.stringify(OUT);
})();

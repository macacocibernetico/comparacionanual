// Verificación de sintaxis: sección DOM de index.html (sin ejecutar el DOM)
const document = { getElementById: () => ({ style: {}, innerHTML: "", textContent: "", onclick: null, onchange: null, value: "2026" }) };
const Chart = function(){ this.destroy = () => {}; };
const fetch = async () => ({ ok: true, text: async () => "" });
const CONFIG = { SHEET_ID: "", SHEET_NAME: "x", HEADER_ROW: 2, COLS: { negocio: "A", tns: "B", product: "C", containers: "F", consolidacion: "K", etd: "L", totalCFR: "AC", priceServ: "AF", totalFinal: "AG" }, USD_COL: "AG", COMISION: { mode: "suma", col: "AF" }, DATE_FORMAT: "DMY" };
const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function colToIndex(){ return 0; }
function parseCSV(){ return []; }
function parseNumber(){ return 0; }
function parseDate(){ return null; }
function countContainers(){ return 0; }
function buildRecords(){ return []; }
function aggregate(){ return { tns: [], usd: [], com: [], etdCount: [], totTns: 0, totUsd: 0, totCom: 0, totCont: 0, totNeg: 0, products: {}, prodTotals: {} }; }

// ---- DOM ----

const fmt0 = n => n.toLocaleString("es-AR", {maximumFractionDigits: 0});
const fmt1 = n => n.toLocaleString("es-AR", {maximumFractionDigits: 1});
const fmtUsd = n => "US$ " + fmt0(n);

const PALETTE = ["#4f8ef7","#f7a44f","#3ecf8e","#e06ae0","#f0d45a","#6ae0d8","#f06a6a","#9b7af0","#7fc95b","#f78fb0","#5ba3c9","#c9a35b"];

let RECORDS = [], charts = {};

function demoData(){
  const prods = ["Maní blancheado","Maní runner","Aceite de maní","Garbanzos","Porotos negros","Maíz pisingallo"];
  const recs = [];
  let seed = 42; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const y of [2024, 2025, 2026]){
    const maxMo = y === 2026 ? 7 : 12;
    for (let mo = 1; mo <= maxMo; mo++){
      const nDeals = 2 + Math.floor(rnd() * 4);
      for (let d = 0; d < nDeals; d++){
        const tns = 20 + rnd() * 80;
        const price = 900 + rnd() * 600 + (y - 2024) * 60;
        recs.push({
          year: y, month: mo, tns,
          product: prods[Math.floor(rnd() * prods.length)],
          usd: tns * price,
          comision: tns * (18 + rnd() * 14),
          containers: 1 + Math.floor(rnd() * 3),
          etd: { y, mo: Math.min(12, mo + (rnd() > .6 ? 1 : 0)) },
          negocio: `DEMO-${y}-${mo}-${d}`,
        });
      }
    }
  }
  return recs;
}

async function loadData(){
  const status = document.getElementById("statusLine");
  const banner = document.getElementById("banner");
  banner.style.display = "none";
  if (!CONFIG.SHEET_ID){
    RECORDS = demoData();
    banner.style.display = "block";
    banner.className = "banner";
    banner.innerHTML = "⚠️ <b>Modo demo:</b> mostrando datos de ejemplo. Pegá el <code>SHEET_ID</code> de tu planilla en el bloque CONFIG de <code>index.html</code> para ver tus datos reales.";
    status.textContent = "Datos de ejemplo · " + RECORDS.length + " negocios";
    return;
  }
  status.textContent = "Cargando planilla…";
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}&headers=0&t=${Date.now()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (text.trim().startsWith("<")) throw new Error("La planilla no es pública. Compartila como 'Cualquier persona con el enlace: Lector'.");
    RECORDS = buildRecords(parseCSV(text), CONFIG);
    if (!RECORDS.length) throw new Error("No se encontraron filas con fecha de Consolidación válida. Revisá SHEET_NAME y HEADER_ROW.");
    status.textContent = `Planilla "${CONFIG.SHEET_NAME}" · ${RECORDS.length} negocios · actualizado ${new Date().toLocaleTimeString("es-AR")}`;
  } catch (e){
    banner.style.display = "block";
    banner.className = "banner err";
    banner.innerHTML = "❌ <b>Error al cargar la planilla:</b> " + e.message;
    status.textContent = "Error de carga";
    RECORDS = [];
  }
}

function yearsAvailable(){
  return [...new Set(RECORDS.map(r => r.year))].sort((a, b) => b - a);
}

function deltaHtml(cur, prev){
  if (!prev) return '<span class="delta na">—</span>';
  const pct = (cur - prev) / prev * 100;
  const cls = pct >= 0 ? "up" : "down";
  const arrow = pct >= 0 ? "▲" : "▼";
  return `<span class="delta ${cls}">${arrow} ${Math.abs(pct).toFixed(1)}% vs año comp.</span>`;
}

function renderKpis(a, b, yA, yB){
  const items = [
    ["Toneladas", fmt1(a.totTns) + " t", a.totTns, b?.totTns],
    ["USD (Total Final)", fmtUsd(a.totUsd), a.totUsd, b?.totUsd],
    ["Comisión", fmtUsd(a.totCom), a.totCom, b?.totCom],
    ["Contenedores", fmt0(a.totCont), a.totCont, b?.totCont],
    ["Negocios", fmt0(a.totNeg), a.totNeg, b?.totNeg],
  ];
  document.getElementById("kpis").innerHTML = items.map(([label, val, cur, prev]) => `
    <div class="kpi">
      <div class="label">${label} · ${yA}</div>
      <div class="value">${val}</div>
      ${deltaHtml(cur, prev)}
    </div>`).join("");
}

function makeBarChart(id, labels, dsA, dsB, yA, yB, opts = {}){
  if (charts[id]) charts[id].destroy();
  const ctx = document.getElementById(id);
  const datasets = [{ label: String(yA), data: dsA, backgroundColor: "#4f8ef7", borderRadius: 4 }];
  if (dsB) datasets.push({ label: String(yB), data: dsB, backgroundColor: "#8b96ab55", borderColor: "#8b96ab", borderWidth: 1, borderRadius: 4 });
  charts[id] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#c5cede" } } },
      scales: {
        x: { ticks: { color: "#8b96ab" }, grid: { color: "#2a334755" } },
        y: { ticks: { color: "#8b96ab", callback: v => opts.usd ? "$" + fmt0(v) : fmt0(v) }, grid: { color: "#2a334755" } },
      },
    },
  });
}

function renderProductChart(a, yA){
  document.getElementById("lblProdYear").textContent = yA;
  if (charts.chProd) charts.chProd.destroy();
  const prods = Object.keys(a.prodTotals).sort((x, y) => a.prodTotals[y] - a.prodTotals[x]);
  charts.chProd = new Chart(document.getElementById("chProd"), {
    type: "bar",
    data: {
      labels: MESES,
      datasets: prods.map((p, i) => ({ label: p, data: a.products[p], backgroundColor: PALETTE[i % PALETTE.length], borderRadius: 3 })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#c5cede", boxWidth: 12 } } },
      scales: {
        x: { stacked: true, ticks: { color: "#8b96ab" }, grid: { display: false } },
        y: { stacked: true, ticks: { color: "#8b96ab" }, grid: { color: "#2a334755" }, title: { display: true, text: "Tns", color: "#8b96ab" } },
      },
    },
  });
}

function renderProductTable(a, yA){
  document.getElementById("lblTableYear").textContent = yA;
  const prods = Object.keys(a.prodTotals).sort((x, y) => a.prodTotals[y] - a.prodTotals[x]);
  let html = "<table><tr><th>Producto</th>" + MESES.map(m => `<th>${m}</th>`).join("") + "<th>Total</th></tr>";
  for (const p of prods){
    html += `<tr><td>${p}</td>` + a.products[p].map(v => `<td>${v ? fmt1(v) : ""}</td>`).join("") + `<td><b>${fmt1(a.prodTotals[p])}</b></td></tr>`;
  }
  html += `<tr class="total"><td>Total</td>` + a.tns.map(v => `<td>${v ? fmt1(v) : ""}</td>`).join("") + `<td>${fmt1(a.totTns)}</td></tr></table>`;
  document.getElementById("prodTable").innerHTML = html;
}

function renderProductCompare(a, b, yA, yB){
  const el = document.getElementById("prodCompare");
  if (!b){ el.innerHTML = '<p style="color:var(--muted)">Sin año de comparación.</p>'; return; }
  const prods = [...new Set([...Object.keys(a.prodTotals), ...Object.keys(b.prodTotals)])]
    .sort((x, y) => (a.prodTotals[y] || 0) - (a.prodTotals[x] || 0));
  let html = `<table><tr><th>Producto</th><th>${yA} (t)</th><th>${yB} (t)</th><th>Δ t</th><th>Δ %</th></tr>`;
  for (const p of prods){
    const va = a.prodTotals[p] || 0, vb = b.prodTotals[p] || 0, d = va - vb;
    const pct = vb ? (d / vb * 100) : null;
    const cls = d >= 0 ? "up" : "down";
    html += `<tr><td>${p}</td><td>${fmt1(va)}</td><td>${fmt1(vb)}</td>
      <td class="delta ${cls}">${d >= 0 ? "+" : ""}${fmt1(d)}</td>
      <td class="delta ${cls}">${pct === null ? "nuevo" : (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"}</td></tr>`;
  }
  html += "</table>";
  el.innerHTML = html;
}

function render(){
  const yA = +document.getElementById("selYear").value;
  const yBraw = document.getElementById("selCompare").value;
  const yB = yBraw === "none" ? null : +yBraw;
  const a = aggregate(RECORDS, yA);
  const b = yB ? aggregate(RECORDS, yB) : null;
  renderKpis(a, b, yA, yB);
  makeBarChart("chTns", MESES, a.tns, b?.tns, yA, yB);
  makeBarChart("chUsd", MESES, a.usd, b?.usd, yA, yB, { usd: true });
  makeBarChart("chCom", MESES, a.com, b?.com, yA, yB, { usd: true });
  makeBarChart("chEtd", MESES, a.etdCount, b?.etdCount, yA, yB);
  renderProductChart(a, yA);
  renderProductTable(a, yA);
  renderProductCompare(a, b, yA, yB);
  document.getElementById("footer").textContent =
    `Mes/año según columna Consolidación (${CONFIG.COLS.consolidacion}) · USD = col ${CONFIG.USD_COL} · Comisión = col ${CONFIG.COMISION.col} (${CONFIG.COMISION.mode})`;
}

function fillSelectors(){
  const years = yearsAvailable();
  const selY = document.getElementById("selYear"), selC = document.getElementById("selCompare");
  selY.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");
  const fillCompare = () => {
    const cur = +selY.value;
    const others = years.filter(y => y !== cur);
    selC.innerHTML = others.map(y => `<option value="${y}">${y}</option>`).join("") + '<option value="none">Ninguno</option>';
    const prev = others.find(y => y === cur - 1);
    if (prev) selC.value = prev;
  };
  fillCompare();
  selY.onchange = () => { fillCompare(); render(); };
  selC.onchange = render;
}

async function init(){
  await loadData();
  if (RECORDS.length){ fillSelectors(); render(); }
}
document.getElementById("btnReload").onclick = init;
init();
console.log("VERIFY OK");

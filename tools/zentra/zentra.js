/* ===== Estilo Zentra: resumen con franja de métricas, facturación, puntos y comisión =====
   Usa los mismos agregados que el resto del dashboard (aggregate), el filtro de productos, la
   comparación a misma fecha y el desglose. El gráfico principal sale de makeChart (mk), así que
   conserva colores por año, apilado NOP/Convencional y el detalle de cargas al tocar una barra. */
const Z_METRICAS = {
  tns: { label: "Toneladas", key: "tns", f: v => fmt1(v) + " t" },
  usd: { label: "Facturación USD", key: "usd", f: fmtUsd, usd: true },
  com: { label: "Comisión", key: "com", f: fmtUsd, usd: true },
  etd: { label: "Embarques", key: "etdCount", f: v => fmt0(v) + (v === 1 ? " carga" : " cargas"), dots: true },
};
const Z_NOMBRES = { axt: "AXT", buzaram: "Buzaram", "brokerage:mani": "Brokerage Maní", "brokerage:oilexp": "Brokerage Aceite + Expeller" };
const Z_COLORES = ["--zc1", "--zc2", "--zc3", "--zc4", "--zc5"];
const zPct = v => v.toFixed(1).replace(".", ",") + "%";
const zBig = s => String(s).replace(/^US\$ /, '<small class="cur">US$</small>').replace(/ (t|\/t|cargas?)$/, '<small class="unit"> $1</small>');
function zTot(agg, k){
  return k === "etd" ? agg.etdCount.reduce((s, v) => s + v, 0) : k === "tns" ? agg.totTns : k === "usd" ? agg.totUsd : agg.totCom;
}
function zDelta(cur, prev){ return prev == null || !isFinite(prev) || prev === 0 ? null : (cur - prev) / prev * 100; }
function zChip(p, sufijo){
  if (p == null) return '<span class="zchip na">sin comparación</span>';
  return `<span class="zchip ${p >= 0 ? "up" : "down"}"><span aria-hidden="true">${p >= 0 ? "▲" : "▼"}</span> ${zPct(Math.abs(p))}${sufijo ? " " + sufijo : ""}</span>`;
}
function zDots(cols, palabra){
  const max = Math.max(0, ...cols.map(c => c.v)), pico = cols.findIndex(c => c.v === max);
  return cols.map((c, i) => `<div class="zdcol${i === pico && max > 0 ? " peak" : ""}">${'<span class="zdt"></span>'.repeat(c.dots)}<span class="zdm">${MESES[i][0]}</span>${i === pico && max > 0 ? `<span class="zpeak">${palabra}: <b>${MESES[i]}</b></span>` : ""}</div>`).join("");
}
function zTitulo(biz){
  const svc = subActual();
  const nombre = UI.biz === TOTAL_KEY ? "Σ Total" : (svc ? svc.label : (biz ? biz.name : UI.biz));
  const h = document.getElementById("zH1"); if (h) h.textContent = nombre;
  const bd = document.getElementById("zBadge"); if (bd) bd.hidden = !demoMode;
  return nombre;
}
/* Celdas de la tabla por producto con intensidad según su valor */
function zHeatTabla(){
  const t = document.querySelector("#prodTable table"); if (!t) return;
  const num = s => { const x = String(s).replace(/[^\d,.-]/g, ""); return x ? parseFloat(x.replace(/\./g, "").replace(",", ".")) || 0 : 0; };
  const filas = [...t.querySelectorAll("tr")].filter(r => !r.classList.contains("total") && r.querySelector("td"));
  const celdas = filas.map(r => [...r.querySelectorAll("td")].slice(1, 13)).flat();
  const max = Math.max(1, ...celdas.map(td => num(td.textContent)));
  celdas.forEach(td => {
    const v = num(td.textContent);
    td.classList.toggle("heat", v > 0);
    if (v > 0) td.style.setProperty("--h", (5 + v / max * 24).toFixed(0) + "%");
  });
}
let Z_INIT = false;
function zInit(){
  if (Z_INIT) return; Z_INIT = true;
  const pt = document.getElementById("prodTable");
  if (pt && typeof MutationObserver === "function") new MutationObserver(zHeatTabla).observe(pt, { childList: true });
}
function renderZentra(c){
  zInit();
  const { a, b, yA, yB, cmpYears, MM, ytd, SP, aN, aC, mk, biz } = c;
  const metrica = Z_METRICAS[UI.zMetric] ? UI.zMetric : "tns";
  const m = Z_METRICAS[metrica];
  const nombre = zTitulo(biz);
  const sub = document.getElementById("zSub");
  if (sub) sub.textContent = `Volumen, facturación y comisiones por mes de embarque · ${cmpYears.length ? `${yA} comparado con ${cmpYears.join(", ")}` : yA}${ytd ? ` · hasta ${MESES[MM - 1].toLowerCase()} de cada año` : ""}`;

  // franja de métricas
  document.getElementById("zStrip").innerHTML = Object.entries(Z_METRICAS).map(([k, mm]) => {
    const v = zTot(a, k), p = b ? zDelta(v, zTot(b, k)) : null;
    let meta;
    if (UI.split && aN && aC && SP && k !== "etd") meta = `${esc(SP.a.name)} <b>${mm.f(zTot(aN, k))}</b> · ${esc(SP.b.name)} <b>${mm.f(zTot(aC, k))}</b>`;
    else if (k === "tns") meta = `≈ ${fmt0(a.contEst)} contenedores (est.)`;
    else if (k === "usd") meta = a.totTns ? `${fmtUsd(a.totUsd / a.totTns)} /t promedio` : "&nbsp;";
    else if (k === "com") meta = a.totUsd ? `${(a.totCom / a.totUsd * 100).toFixed(2).replace(".", ",")}% de la facturación` : "&nbsp;";
    else meta = "cargas con ETD en el período";
    const dl = p == null ? "" : `<span class="zd ${p >= 0 ? "up" : "down"}">${p >= 0 ? "▲" : "▼"} ${zPct(Math.abs(p))} vs ${yB}</span>`;
    return `<button type="button" class="zm" data-m="${k}" aria-pressed="${k === metrica}"><span class="zl">${mm.label}</span><span class="zv">${zBig(mm.f(v))}</span><span class="zmeta">${meta}</span>${dl}</button>`;
  }).join("");
  document.querySelectorAll("#zStrip .zm").forEach(btn => btn.onclick = () => { UI.zMetric = btn.dataset.m; saveUI(); render(); });
  document.getElementById("zMainTitle").textContent = `${m.label} por mes de ETD · ${yA}`;
  mk("zChart", m.key, m.usd ? { usd: true } : (m.dots ? { dots: true } : {}));
  document.getElementById("zChart").setAttribute("aria-label", `${m.label} por mes de ETD, ${yA}${cmpYears.length ? " comparado con " + cmpYears.join(", ") : ""}`);

  // facturación y su desglose
  document.getElementById("zSideBig").innerHTML = `<span class="cur">US$</span>${Math.round(a.totUsd).toLocaleString("es-AR")}`;
  document.getElementById("zSideDelta").innerHTML = b ? zChip(zDelta(a.totUsd, b.totUsd)) : "";
  document.getElementById("zSideSub").textContent = b ? `${nombre} · ${yA} comparado con ${yB}` : `${nombre} · ${yA}`;
  let partes;
  if (UI.biz === TOTAL_KEY){
    partes = Object.entries(a.bizUsd).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ n: Z_NOMBRES[k] || k, v }));
  } else {
    const todos = Object.entries(a.prodUsd).sort((x, y) => y[1] - x[1]);
    partes = todos.slice(0, 4).map(([n, v]) => ({ n, v }));
    const resto = todos.slice(4).reduce((s, [, v]) => s + v, 0);
    if (resto > 0) partes.push({ n: `Otros (${todos.length - 4})`, v: resto });
  }
  const tot = partes.reduce((s, p) => s + p.v, 0) || 1, mx = Math.max(1, ...partes.map(p => p.v));
  document.getElementById("zSideBars").innerHTML = partes.map((p, i) => `<div class="zb"><div class="zbt"><span>${esc(p.n)}</span><b>${fmtUsd(p.v)}<i>${zPct(p.v / tot * 100)}</i></b></div>
    <div class="ztrack" role="img" aria-label="${esc(p.n)}: ${zPct(p.v / tot * 100)} de la facturación"><div class="zfill" style="--c:var(${Z_COLORES[i % Z_COLORES.length]});width:${(p.v / mx * 100).toFixed(1)}%"></div></div></div>`).join("");

  // embarques y precio promedio por mes (puntos)
  const n = ytd ? MM : Math.max(1, ...a.etdCount.map((v, i) => v ? i + 1 : 0), ...a.tns.map((v, i) => v ? i + 1 : 0));
  const cnt = a.etdCount.slice(0, n), totE = cnt.reduce((s, v) => s + v, 0);
  document.getElementById("zShipBig").textContent = fmt0(totE);
  document.getElementById("zShipSub").textContent = `Cargas por ETD · ${yA}`;
  document.getElementById("zShipDots").innerHTML = zDots(cnt.map(v => ({ v, dots: Math.min(8, v) })), "Pico");
  const bE = b ? b.etdCount.slice(0, n).reduce((s, v) => s + v, 0) : null;
  document.getElementById("zShipVs").innerHTML = bE == null ? "" : `<span>vs ${yB}</span><b class="${totE - bE >= 0 ? "up" : "down"}">${totE - bE >= 0 ? "+" : "−"}${fmt0(Math.abs(totE - bE))}</b>`;
  const px = a.usd.slice(0, n).map((u, i) => a.tns[i] ? u / a.tns[i] : 0), pos = px.filter(v => v > 0);
  const lo = pos.length ? Math.min(...pos) : 0, hi = pos.length ? Math.max(...pos) : 0;
  const pA = a.totTns ? a.totUsd / a.totTns : 0, pB = b && b.totTns ? b.totUsd / b.totTns : null;
  document.getElementById("zPriceBig").innerHTML = `${fmt0(pA)}<small class="unit"> US$/t</small>`;
  document.getElementById("zPriceSub").textContent = `Facturación ÷ toneladas · ${yA}`;
  document.getElementById("zPriceDots").innerHTML = zDots(px.map(v => ({ v, dots: v ? 1 + Math.round((hi > lo ? (v - lo) / (hi - lo) : 1) * 5) : 0 })), "Más alto");
  document.getElementById("zPriceVs").innerHTML = pB == null ? "" : `<span>vs ${yB}</span><b class="${pA - pB >= 0 ? "up" : "down"}">${pA - pB >= 0 ? "+" : "−"}${fmt0(Math.abs(pA - pB))}</b>`;

  // comisión (tarjeta destacada)
  const pc = t => t.totUsd ? t.totCom / t.totUsd * 100 : 0;
  document.getElementById("zInsBig").textContent = pc(a).toFixed(2).replace(".", ",") + "%";
  document.getElementById("zInsPerT").textContent = (a.totTns ? fmtUsd(a.totCom / a.totTns) : "—") + " /t";
  document.getElementById("zInsCmpLbl").textContent = b ? `En ${yB}` : "Año comparado";
  document.getElementById("zInsCmp").textContent = b ? pc(b).toFixed(2).replace(".", ",") + "%" : "—";
}

// Pruebas rápidas sin navegador:  node tests/run.js
const { load } = require('./env');
const api = load();
let ok = 0, bad = 0;
const t = (n, c) => { if (c) ok++; else { bad++; console.log('  FALLA:', n); } };

// números y fechas
t('parseNumber coma decimal', api.parseNumber('1.234,56') === 1234.56);
t('parseNumber punto decimal', api.parseNumber('1,234.56') === 1234.56);
t('fmt1 2 decimales', api.fmt1(26.05) === '26,05');
t('mismaEmpresa ignora S.A.', api.mismaEmpresa('Newsan S.A.', 'NEWSAN SA'));

// agregación y tortas del Total (Brokerage se abre en Maní / Aceite+Expeller)
const R = (biz, product, tns, usd, com, mo = 3) => ({ biz, product, tns, usd, comision: com, containers: 0, month: mo, year: 2026 });
const a = api.aggregate([R('axt','Blanched',100,100000,2000), R('buzaram','X',50,40000,500),
  R('brokerage','Peanut kernels',200,200000,3000), R('brokerage','Peanut oil',80,120000,1600), R('brokerage','Expeller',20,6000,100)], 2026, 12);
t('4 porciones en el Total', Object.keys(a.bizTotals).length === 4);
t('Brokerage Maní 200', a.bizTotals['brokerage:mani'] === 200);
t('Brokerage Aceite+Expeller 100', a.bizTotals['brokerage:oilexp'] === 100);

// tendencia 12 meses móviles
const recs = [];
for (let m = 1; m <= 12; m++) recs.push({ biz:'axt', product:'B', year:2017, month:m, tns:242, usd:234976, comision:2784 });
for (let m = 1; m <= 12; m++) recs.push({ biz:'axt', product:'B', year:2018, month:m, tns:712, usd:596311, comision:10548 });
CHARTS.length = 0; api.UI.biz = 'axt'; api.renderRolling(recs);
const d = CHARTS[0].data, i = k => d.labels.indexOf(k);
t('Dic 2017 = 2904 t', d.datasets[0].data[i('Dic 2017')] === 2904);
t('Nov 2017 sin ventana completa', d.datasets[0].data[i('Nov 2017')] === null);

// mezcla export redondeado + gviz exacto
const E = (p, mo, tns, usd) => ({ product:p, year:2026, month:mo, tns, usd });
const mz = api.mezclarExactos([E('A',1,26.1,1000), E('X',1,7,70), E('B',2,10.1,501)], [E('A',1,26.05,1000.4), E('B',2,10.125,500.5)]);
t('mezcla conserva exactos y ocultas', JSON.stringify(mz.map(r => r.tns)) === '[26.05,7,10.125]');

// mercado local vs exportación + frecuencia (Brokerage)
{
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sc = [...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
  const m = new Function(sc.at(-1) + ';return {UI,CONTRACTS,renderMercado};')();
  const d = (y, mo, dd) => ({ y, mo, d: dd });
  const R2 = (imp, exp, pais, tns, f) => ({ biz:'brokerage', product:'Peanut kernels', importer:imp, exporter:exp, pais, tns, usd:tns*10, comision:tns, etd:f, year:f.y, month:f.mo });
  m.CONTRACTS.brokerage = [{ fecha:d(2026,1,1), importador:'Euro BV', exportador:'E2', producto:'Peanut' }, { fecha:d(2026,3,2), importador:'EURO B.V.', exportador:'E2', producto:'Peanut' }];
  m.UI.biz = 'brokerage'; m.UI.bizSub = { brokerage:'mani' }; m.UI.mktPeriodo = 'anio'; m.UI.mktMetric = 'tns';
  m.renderMercado([R2('Cli AR SA','E1','Argentina',100,d(2026,1,10)), R2('Cli AR S.A.','E1','argentina',50,d(2026,3,10)),
    R2('Euro BV','E2','Netherlands',300,d(2026,2,1)), R2('Euro BV','E1','Netherlands',200,d(2026,4,1))], 2026);
  const T = id => document.getElementById(id).innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  t('export 500 t / 76,9%', /Exportación 500 t 76,9%/.test(T('mktStats')));
  t('local 150 t / 23,1%', /Argentina\) 150 t 23,1%/.test(T('mktStats')));
  t('cliente con S.A. y SA agrupado', /Cli AR SA Local 150 t/.test(T('mktCli')));
  t('frecuencia contratos', /Euro BV Export 2 .* 2 cada 60 días/.test(T('mktFreq')));
}

// audit UX/UI (30/10/2026): formato, estado vacío y accesibilidad
{
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const code = [...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).at(-1);
  const m = new Function(code + ';return {UI,CONFIG,DATA,render,renderProductCompare,demoData};')();
  const g = id => document.getElementById(id);
  const TARJ = ['cardTns', 'cardUsd', 'cardCom', 'cardEtd', 'rollCard', 'prodCard', 'bizCard', 'compareCard', 'mktCard'];

  // Δ % con coma decimal, igual que el resto de la tabla
  m.renderProductCompare({ prodTotals: { A: 554.16, B: 100 } }, { prodTotals: { A: 348.62, B: 100 } }, 2026, 2025);
  t('Δ % con coma decimal', /\+59,0%/.test(g('prodCompare').innerHTML) && !/\d\.\d%/.test(g('prodCompare').innerHTML));

  // negocio sin planilla: sin tarjetas vacías y con mensaje; con datos vuelven
  m.UI.biz = 'brokerage'; m.DATA = {}; m.CONFIG.brokerage.SHEET_ID = ''; m.render();
  t('sin planilla: tarjetas ocultas', TARJ.every(id => g(id).style.display === 'none'));
  t('sin planilla: mensaje visible', /todavía no tiene planilla/.test(g('kpis').innerHTML));
  m.UI.biz = 'axt'; m.DATA = { axt: m.demoData() }; m.CONFIG.axt.SHEET_ID = ''; m.render();
  t('con datos: tarjetas vuelven', ['cardTns', 'cardUsd', 'cardCom', 'cardEtd', 'rollCard', 'prodCard'].every(id => g(id).style.display === ''));

  // accesibilidad del HTML estático
  t('3 modales con role=dialog y nombre', (h.match(/class="modal[^"]*" role="dialog" aria-modal="true" aria-labelledby="\w+"/g) || []).length === 3);
  t('hay <main> y el skip-link apunta a él', /<main id="main"/.test(h) && /href="#main" class="skip-link"/.test(h) && /<\/main>/.test(h));
  t('pill Todos con aria-pressed', /data-y="all" aria-pressed=/.test(h));

  // textos de la planilla escapados y errores en palabras simples
  m.renderProductCompare({ prodTotals: { "Maní <b>X</b> & Co": 10 } }, { prodTotals: { "Maní <b>X</b> & Co": 5 } }, 2026, 2025);
  t('producto con < y & se escapa', /Maní &lt;b&gt;X&lt;\/b&gt; &amp; Co/.test(g('prodCompare').innerHTML));
  const ec = new Function(code + ';return errorCriollo;')();
  t('error de red en criollo', /No me pude conectar/.test(ec(new Error("Failed to fetch"))));
  t('error 404 en criollo', /No encuentro la planilla/.test(ec(new Error("HTTP 404"))));
  t('sin alert() en el código', !/[^.\w]alert\(/.test(code));

  // mobile: negocios en dos filas (sin carrusel oculto) y filtro de productos fuera del ☰
  const mob = h.slice(h.indexOf('@media(max-width:720px)'));
  t('mobile: pestañas en varias filas', /\.tabs\{display:flex;flex-wrap:wrap/.test(mob) && !/\.tabs\{flex-wrap:nowrap/.test(mob));
  t('mobile: grupo del filtro en la toolbar', /id="grpFilterM"/.test(h) && /dest\.appendChild\(btnFilter\)/.test(h));

  // empresas que son la misma (nombres inventados: el repo es público)
  const al = new Function(code + ';return {aliasDe,canonEmpresa};')();
  const gr = al.aliasDe({ ALIAS_EMPRESAS: 'Acme = Acme Agro S.A. = Acme Agropecuaria\nBeta = Beta Foods Ltd' });
  t('alias: variantes con S.A. y mayúsculas', al.canonEmpresa('ACME AGRO S.A.', gr) === 'Acme' && al.canonEmpresa('acme agropecuaria', gr) === 'Acme');
  t('alias: segunda línea', al.canonEmpresa('Beta Foods Ltd.', gr) === 'Beta');
  t('alias: otra empresa no cambia', al.canonEmpresa('Gamma SA', gr) === 'Gamma SA' && al.canonEmpresa('', gr) === '');
  t('alias: sin config no hace nada', al.aliasDe({ ALIAS_EMPRESAS: '' }) === null && al.canonEmpresa('Acme Agro', null) === 'Acme Agro');

  // detalle mensual por producto: ranking visual (8 principales + "ver todos") y tabla completa intacta
  {
    const pr = new Function(code + ';return {UI,renderProductTable};')();
    const nombres = Array.from({ length: 12 }, (_, i) => i === 0 ? 'Prod <b>X</b>' : 'Producto ' + i);
    const mk12 = v => Array.from({ length: 12 }, (_, m) => m < 3 ? v : 0);
    const a = { prodTotals: {}, prodUsd: {}, products: {}, productsUsd: {}, tns: mk12(100), usd: mk12(1000), totTns: 300, totUsd: 3000 };
    nombres.forEach((n, i) => { a.prodTotals[n] = 100 - i; a.products[n] = mk12((100 - i) / 3); a.prodUsd[n] = 1000 - i; a.productsUsd[n] = mk12((1000 - i) / 3); });
    pr.UI.prodVista = 'visual'; pr.UI.prodTodos = false; pr.UI.prodMetric = 'tns';
    pr.renderProductTable(a, 2026);
    const viz = g('prodViz').innerHTML;
    t('detalle visual: 8 productos y botón para ver todos', (viz.match(/class="pvr"/g) || []).length === 8 && /Ver los 12 productos/.test(viz));
    t('detalle visual: nombres escapados', /Prod &lt;b&gt;X&lt;\/b&gt;/.test(viz) && !/Prod <b>X/.test(viz));
    t('detalle: la tabla completa sigue generándose', /<table>/.test(g('prodTable').innerHTML) && /Producto 11/.test(g('prodTable').innerHTML));
    t('detalle: forma de ver visual por defecto', g('prodCard').classList.contains('pv'));
    pr.UI.prodVista = 'tabla'; pr.renderProductTable(a, 2026);
    t('detalle: forma de ver tabla', !g('prodCard').classList.contains('pv'));
  }

  // plegar: gráficos, detalle y comparación se pliegan; "Plegar todo" cierra todo lo visible y lo vuelve a abrir
  const p = new Function(code + ';return {UI,PLEGABLES,renderSecNav};')();
  t('gráficos, detalle y comparación son plegables', ['cardTns', 'cardUsd', 'cardCom', 'cardEtd', 'prodCard', 'compareCard'].every(id => p.PLEGABLES.includes(id)));
  ['cardTns', 'cardUsd', 'cardCom', 'cardEtd', 'rollCard', 'prodCard', 'compareCard'].forEach(id => { g(id).style.display = ''; });
  p.UI.biz = 'axt'; p.UI.cerradas = []; p.renderSecNav();
  t('botón "Plegar todo"', /Plegar todo/.test(g('secNav').innerHTML));
  g('btnPlegarTodo').onclick();
  t('"Plegar todo" cierra todas las visibles', ['cardTns', 'prodCard', 'compareCard'].every(id => p.UI.cerradas.includes(id)) && /Desplegar todo/.test(g('secNav').innerHTML));
  g('btnPlegarTodo').onclick();
  t('"Desplegar todo" las vuelve a abrir', !p.UI.cerradas.some(id => ['cardTns', 'prodCard', 'compareCard'].includes(id)));
}

// link para compartir la configuración
{
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const code = [...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).at(-1);
  localStorage.setItem('dashboardConfigV2', JSON.stringify({ brokerage: { SHEET_ID: 'ABC', CLIENTS_URL: 'u' } }));
  const link = new Function(code + ';return linkCompartir;')()();
  localStorage.d = {}; global.location = { href: link, hash: link.slice(link.indexOf('#')) };
  const b = new Function(code + ';return {CONFIG,CFG_IMPORTADA};')();
  t('link importa la config', b.CFG_IMPORTADA && b.CONFIG.brokerage.SHEET_ID === 'ABC' && b.CONFIG.brokerage.CLIENTS_URL === 'u');
  global.location = { href: 'http://localhost/', hash: '' };
}

// panel comercial: países, regiones, embudo y salud de la cartera
{
  const fs = require('fs'), path = require('path');
  const h = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const code = [...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim()).at(-1);
  const c = new Function(code + ';return {UI,CLI_DB,OPEN,paisInfo,normRegion,calcEmbudo,calcCartera,PAISES};')();
  t('países: variantes de la planilla al mismo país', ['SPAIN', 'España', 'ESPANA'].every(x => c.paisInfo(x).id === '724') &&
    c.paisInfo('UK').es === 'Reino Unido' && c.paisInfo('MALASYA').id === '458' && c.paisInfo('REPUBLICA DOMINICANA').id === '214');
  t('países: Malta y Singapur llevan coordenadas (el mapa no los dibuja)', !!c.paisInfo('MALTA').coord && !!c.paisInfo('SINGAPURE').coord);
  t('países: uno desconocido queda con su nombre y sin id', c.paisInfo('Narnia').id === null && c.paisInfo('Narnia').es === 'Narnia' && c.paisInfo('') === null);
  t('regiones: EUROPE y EUROPA son la misma', c.normRegion('EUROPE') === 'Europa' && c.normRegion('europa') === 'Europa' && c.normRegion('') === 'Sin región');
  const db = [
    { n: 'Alfa SA', team: 'F', region: 'EUROPE', contactado: true, rta: true, encuentro: true },
    { n: 'Beta', team: 'M - F', region: 'EUROPA', contactado: true, rta: false, encuentro: false },
    { n: 'Gama', team: '', region: 'ASIA', contactado: false, rta: false, encuentro: false },
  ];
  const E = c.calcEmbudo(db, [{ importador: 'ALFA S.A.', toneladas: 50 }, { importador: '(sin dato)', toneladas: 9 }]);
  t('embudo: etapas', E.total.base === 3 && E.total.cont === 2 && E.total.rta === 1 && E.total.enc === 1 && E.total.compro === 1);
  const F = E.porVendedor.find(x => x.g === 'F'), M = E.porVendedor.find(x => x.g === 'M');
  t('embudo: "M - F" suma en M y en F', F.base === 2 && M.base === 1 && F.compro === 1 && F.tns === 50 && E.porVendedor.some(x => x.g === 'Sin asignar'));
  t('embudo: regiones normalizadas', E.porRegion.find(x => x.g === 'Europa').base === 2);
  const eu = E.porRegion.find(x => x.g === 'Europa');
  t('embudo: cada región trae sus empresas con su etapa', eu.filas.length === 2 && eu.filas.find(x => x.n === 'Alfa SA').etapa === 'contrato' && eu.filas.find(x => x.n === 'Beta').etapa === 'cont' && E.porRegion.find(x => x.g === 'Asia').filas[0].etapa === 'sin');
  t('embudo: agrupa también por país', E.porPais.length >= 1 && E.porPais.every(x => x.filas.length === x.base));
  c.UI.biz = 'brokerage'; c.CLI_DB.brokerage = [{ n: 'Cliente Uno', pais: 'SPAIN', team: 'A', region: 'EUROPE' }];
  c.OPEN.brokerage = { filas: [{ contrato: 'C9' }] };
  const hoy = new Date(2026, 9, 30), f = (y, mo, d) => ({ y, mo, d });
  const cs = [
    ...[[2025, 3, 10], [2025, 5, 10], [2025, 7, 10], [2025, 9, 10], [2025, 11, 10]].map(([y, mo, d], i) => ({ importador: 'Cliente Uno', fecha: f(y, mo, d), toneladas: 10, contrato: 'U' + i })),
    { importador: 'Cliente Dos', fecha: f(2026, 9, 1), toneladas: 20, contrato: 'C9', saldo: 5 },
    { importador: 'Cliente Tres', fecha: f(2023, 2, 1), toneladas: 30, contrato: 'T1' },
  ];
  const cli = c.calcCartera(cs, 2026, hoy), uno = cli.find(x => x.n === 'Cliente Uno'), dos = cli.find(x => x.n === 'Cliente Dos'), tres = cli.find(x => x.n === 'Cliente Tres');
  t('cartera: activo, nuevo y país desde la database', uno.activo && uno.pais === 'España' && uno.team === 'A' && dos.nuevo && !uno.nuevo);
  t('cartera: en riesgo si pasa mucho más que su frecuencia', uno.riesgo && uno.frec === 61 && !dos.riesgo);
  t('cartera: contratos abiertos y días sin comprar', dos.abiertos === 1 && dos.saldo === 5 && !tres.activo && tres.dias > 900);
}

console.log(`\n${ok} ok · ${bad} fallas`);
process.exit(bad ? 1 : 0);

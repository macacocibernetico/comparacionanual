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

console.log(`\n${ok} ok · ${bad} fallas`);
process.exit(bad ? 1 : 0);

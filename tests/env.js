const fs=require('fs');
function mkEl(tag,id){const el={id,children:[],attrs:{},dataset:{},style:{},_html:'',textContent:'',_c:new Set(),
 classList:{add:c=>el._c.add(c),remove:c=>el._c.delete(c),toggle:(c,v)=>{const o=v===undefined?!el._c.has(c):!!v;o?el._c.add(c):el._c.delete(c);return o},contains:c=>el._c.has(c)},
 setAttribute:(k,v)=>{el.attrs[k]=v},getAttribute:k=>el.attrs[k],appendChild:c=>c,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,getContext:()=>({})};
 Object.defineProperty(el,'innerHTML',{get:()=>el._html,set:v=>{el._html=String(v)}});return el;}
const REG=new Map();const ensure=id=>{if(!REG.has(id))REG.set(id,mkEl('div',id));return REG.get(id)};
global.document={getElementById:ensure,querySelector:()=>mkEl(),querySelectorAll:()=>[],createElement:()=>mkEl(),addEventListener(){},body:mkEl(),documentElement:mkEl(),head:{appendChild(){}}};
global.window={addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),location:{href:''},devicePixelRatio:1};
global.matchMedia=global.window.matchMedia;
global.localStorage={d:{},getItem(k){return this.d[k]??null},setItem(k,v){this.d[k]=v},removeItem(k){delete this.d[k]}};
global.CHARTS=[];global.Chart=class{constructor(c,cfg){CHARTS.push(cfg)}destroy(){}resize(){}};Chart.register=()=>{};Chart.defaults={font:{},plugins:{legend:{labels:{}}}};
global.location={href:'http://localhost/',hash:''};global.history={replaceState(){}};global.btoa=s=>Buffer.from(s,'binary').toString('base64');global.atob=s=>Buffer.from(s,'base64').toString('binary');
global.fetch=()=>Promise.reject(new Error('x'));global.getComputedStyle=()=>({getPropertyValue:()=>'#000'});global.requestAnimationFrame=f=>f();global.navigator={userAgent:''};
module.exports={load(){const h=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const sc=[...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
return new Function(sc.at(-1)+";return {UI,CONFIG,DATA,OPEN,BUSINESSES,SUBVISTAS,aggregate,renderKpis,renderBizChart,renderRolling,abrirRollZoom,renderProductTable,renderPipeline,mezclarExactos,parseNumber,detectDecimalSep,parseDate,normHeader,mismaEmpresa,bizKeyTotal,subActual,fmt1,fmtUsd};")();}};

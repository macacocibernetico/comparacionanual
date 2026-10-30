#!/usr/bin/env node
/* Prueba local de artifact/: envuelve la página en un esqueleto parecido al del Artifact y la sirve
   en http://localhost:8767/ (con los archivos de artifact/data/). Uso: node tools/probar-artifact.js */
const http = require("http"), fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "artifact");
const esqueleto = frag => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-block:env(safe-area-inset-top,0) env(safe-area-inset-bottom,0)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${frag}</body></html>`;
http.createServer((q, s) => {
  const u = decodeURIComponent(q.url.split("?")[0]);
  if (u === "/") { s.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); return s.end(esqueleto(fs.readFileSync(path.join(dir, "index.html"), "utf8"))); }
  const p = path.join(dir, u);
  fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end("x"); } s.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }); s.end(d); });
}).listen(8767, () => console.log("http://localhost:8767/"));

# Dashboard de Exportaciones — Latinut (AXT · Buzaram · Brokerage)

Contexto para Claude Code. Leelo entero antes de tocar nada. El usuario es **Agustín** (agustin@latinutsa.com), habla en **español rioplatense**: respondé en español, corto y directo, sin inventar. Cuando dice "no inventes pavadas, solo cerciorate que ande", lo dice en serio: verificá contra datos reales o con tests antes de afirmar algo.

## Qué es

Una web app **estática de un solo archivo** (`index.html`, ~5000 líneas: HTML + CSS + JS inline) publicada en **GitHub Pages**. Lee en vivo planillas de **Google Sheets** compartidas como "cualquiera con el enlace: lector". Sin backend, sin build, sin dependencias locales. Librerías por CDN (cdnjs): Chart.js 4, y bajo demanda jsPDF + jspdf-autotable y html2canvas.

## Reglas que NO se negocian

1. **El repo es público.** Nunca hardcodear Sheet IDs, GIDs, nombres de clientes ni datos. Toda la config vive en `localStorage` y se carga desde el panel ⚙️ Configurar.
2. **Los negocios no se mezclan.** AXT, Buzaram y Brokerage se ven por separado; solo se suman en **Σ Total**.
3. **Columnas por nombre de encabezado (fila 2), nunca por letra.** El usuario reordena columnas. Ver `normHeader`, `headerMap`, `findInMap`, `findHeaderRow`.
4. **Mes/año de una carga = columna `ETD`** (salvo las secciones de Consolidación, que usan `Consolidación`).
5. Nunca dejar al usuario sin controles: si un filtro vacía la vista, se resetea (`sanitizeFilter`). Esto fue un bug CRÍTICO.
6. Un solo archivo. Todo el CSS/JS inline.

## Columnas clave (encabezados de la planilla)

| Dato | Encabezado |
|---|---|
| Fecha del mes | `ETD` |
| Toneladas | `Tns` |
| Producto | `Product` |
| Facturación USD | `TOTAL FINAL` (configurable) |
| Comisión | `Monto LT` |
| Fletes (grupos AXT) | `total flete` |
| Comisión broker (grupos AXT) | `Comision Broker` |
| Fecha consolidación | `Consolidación` |
| Cobro | `Fecha de cobro`, si vacía `Fecha estimada` |
| Packaging | `Packing` |
| Destino | `Port` |
| Exportador / Importador (Brokerage) | `Exporter` / `Importer` |

Contenedores: la columna no sirve → se muestra **estimado = Tns ÷ 22** (`TNS_POR_CONTENEDOR`).

Hojas extra de Brokerage (planilla "Control de Embarque 2.0"): **`ALL`** (cargas), **`ALL CONTRATOS`** (Fecha, Exportador, Importador, Producto, Tipo, Toneladas, Precio, Total, Packaging, Incoterm, Forma de pago, Comision Total, PAGOS USA ENT, **Saldo** = toneladas pendientes, Periodo de embarque), **`Contratos Abiertos`** (columnas de meses dinámicas tipo `ago-26`, `sept-26`, `ene-27` → `parseMesEncabezado`).

## Lectura de Sheets (`fetchBiz`)

- Principal: `gviz/tq?tqx=out:json&headers=2` → valores **exactos**. `headers=2` es obligatorio (con `headers=0` Google blanquea los encabezados de columnas tipadas como ETD/Tns).
- En paralelo: `export?format=csv&gid=N` → trae filas ocultas por filtros, pero **redondeadas por el formato de celda**. Si tiene más filas, se usa `mezclarExactos()`: exactos de gviz + solo las filas ocultas del export. Sin GID se verifica que sea la misma pestaña (≥80% de coincidencia) para no mezclar pestañas.
- Decimales: `detectDecimalSep` por columna + override manual. Ojo con "123.800" (fue un bug: 123,8 t leído como 123.800).
- Caché stale-while-revalidate en `localStorage` (`dashboardCache`, 12 h): pinta al instante y refresca.

## Negocios y vistas

```js
BUSINESSES: axt (split NOP/Convencional, consViews), brokerage (split oil, partnerViews, contractViews,
            focusExporter=NEWSAN SA, excluirDefault "Latinut S.A."), buzaram (simple)
Menú: AXT · Buzaram · Brokerage Maní · Brokerage Aceite + Expeller · Σ Total   (no existe "Brokerage Total")
SUBVISTAS.brokerage = mani (todo menos aceite/expeller) | oilexp (Peanut oil + Expeller)
```

- **Exclusión**: Latinut S.A. fuera de Brokerage y del Total (config `EXCLUDE_EXPORTERS`; chip para verlas). Matching de empresas con `normEmpresa`/`mismaEmpresa` (ignora puntuación y S.A., SRL…).
- **Todas las vistas**: KPIs (Tns, USD, Comisión, Contenedores est., **Precio promedio /t**, **Comisión /t + % de facturación**), gráficos mensuales (tns/usd/comisión/embarques), comparación anual YTD-justa, colores por año editables, filtro de productos, tema claro/oscuro, mobile (bottom sheet).
- **Tendencia 12 meses móviles** (`renderRolling`): suma móvil de 12 meses por ETD de Tns, Facturación, Comisión, Precio prom. y % comisión. 3 por fila, click → modal ampliado. En Σ Total: switch "Ver por negocio" y tooltip con desglose y con lo excluido (Latinut). Corta en el mes en curso. Reemplaza la tabla manual del Sheet (validado: dic-2017 = 2.904 t, 1,18%).
- **Σ Total**: 3 tortas rellenas (Tns / Facturación / Comisión) con AXT, Buzaram, Brokerage Maní, Brokerage Aceite+Expeller (`bizKeyTotal`), total arriba de cada torta, tabla con %, Precio prom./t y Comisión/t.
- **Detalle mensual por producto** (por ETD): selector Toneladas | Facturación USD.
- **Solo AXT**: Consolidación (producto×mes, producto×Port, Tns/USD, selector de meses) y **Grupos comerciales** (Blancheado NOP USA/CANADA = Split/38-42/40-50 a Norfolk, New York, Toronto; Blancheado NOP Europa = Livorno, Napoli, Genova…; Peanut paste y Roasted por `Packing`; columnas Toneladas, Facturación, Fletes(−), Comisión devengada(−), Total neto, Días prom. de cobro; filas clickeables).
- **Solo Brokerage · Mercado, clientes y frecuencia** (`renderMercado`, card `mktCard`, en "Ir a" como "Exportación vs local"): Local = el importador tiene Country **ARGENTINA** en la database de clientes; Country vacío, otro país o importador no encontrado = exportación. Arriba: tabla Maní / Aceite+Expeller / Brokerage total (cargas, tns, facturación, comisión, %) + gráfico `chMkt` de cantidad de cargas por mes (export vs local, apilado); participación % por exportador y por cliente (Tns/Facturación/Comisión, año elegido o histórico); frecuencia por cliente: cargas por ETD (hoja ALL, que ya contiene Embarques marítimos, Cargas Terrestres y A facturar) y contratos por `Fecha` de ALL CONTRATOS; empresas agrupadas con `normEmpresa`.
- **Solo Brokerage**: Exportadores/Importadores (por año + histórico, Top-N + "Otros", switch aceite/expeller, orden por columna, PDF real), Contratos (`ALL CONTRATOS`: por exportador/importador/listado, chips de año, saldos pendientes en t), vista **NEWSAN SA** (aceite vs expeller), en Aceite+Expeller torta de clientes, **Programación y proyección de embarques** (al final; matriz dinámica de `Contratos Abiertos`; tarjetas Ya embarcado + Falta embarcar = Total; modo "Comparar" o "Sumar → total del mes"; oculta meses pasados y sugiere columnas borrables).
- **Exportar**: cada cuadro tiene 🖼 Imagen / 📄 PDF (html2canvas + jsPDF) y cada tabla 📋 Copiar tabla (TSV + HTML para pegar en Excel). Funciones: `decorarExportables`, `exportarCard`, `copiarTabla`.
- Secciones plegables (`PLEGABLES`, estado en `UI.cerradas`), nav "Ir a" (`renderSecNav`), responsive al cambiar de monitor/DPR (resize + matchMedia + ResizeObserver).

## Estado en localStorage

`dashboardConfigV2` (config por negocio), `dashboardUI` (vista, filtros, toggles: `prodMetric`, `rollBiz`, `pipeProy`, `pipeView`, `cerradas`…), `dashboardColors`, `dashboardCache`, `dashboardTheme`. Nuevos campos de UI → agregar default en `loadUI()`.

## Flujo de render

`init` → `paint` (caché) → `loadData` → `render()` → `renderKpis`, `makeChart`×4, `renderRolling`, `renderBizChart`, `renderProductTable`, `renderProductCompare`, `renderConsolidacion`, `renderGrupos`, `renderPartners`, `renderOilExp`, `renderFocusExporter`, `renderContracts`, `renderPipeline`, `renderContext`, `aplicarPlegado`, `decorarExportables`, `renderSecNav`. Cada sección se oculta sola si no aplica al negocio activo.

Código muerto conocido (no se llama, se puede borrar): `renderTrend`, `renderProductChart` (sus canvas ya no existen).

## Cómo trabajar

- **Tests**: `node tests/run.js` (stubs de DOM/Chart en `tests/env.js`, extraen el último `<script>` de `index.html`). Correlos después de cada cambio y agregá casos para lo nuevo. Si un test falla, verificá primero que la cuenta del test sea correcta antes de "arreglar" el producto.
- Chequeo rápido de sintaxis + IDs: que no haya `id` duplicados ni `getElementById("x")` sin elemento.
- **Prueba de humo** (cambios de estructura, cálculo o lectura de datos): `node tests/smoke.js [ref]` (por defecto `HEAD`; antes de subir, `main`). Abre Chrome/Edge sin ventana, corre `tests/smoke-browser.js` (75 escenarios con planillas simuladas) sobre la versión de referencia y la actual, y compara: tiene que dar 0 diferencias, o solo las que el cambio busca. Tarda ~30 s. Para cambios chicos de estilo o texto alcanza con `node tests/run.js`.
- Cabecera: chips de contexto solo con lo que no se ve en la barra (cargas en la vista, misma fecha, exclusiones, filtro, desglose); `#ytdNote` queda oculto porque su explicación va en el `title` del chip. Desde 1101 px la barra de filtros es una grilla de dos filas y los rótulos de grupo quedan solo para lectores de pantalla.
- Estilo visual (rediseño oct-2026): bloque "Rediseño visual" al final del `<style>`. Texto principal `--text:#111827`, secundarios `--muted`/`--faint` legibles (nada de grises lavados), tarjetas blancas radio 22 px. Helpers: `bigNum` (KPIs), `shareBar` (barras rayadas), `hatchPattern`/`barGradient`/`capPlugin`/`dotsPlugin` (gráficos).
- Probar en navegador: abrir `index.html` (sin config muestra datos demo) o la URL de GitHub Pages con la config del usuario.
- Publicar: commit + push a `main`; GitHub Pages se actualiza en 1–2 min.
- Al terminar: decir en 1–2 frases qué cambió y qué se probó; avisar si algo no se pudo verificar con datos reales.

## Historial de pedidos que conviene recordar

- Gráficos con escalas distintas van separados (no mezclar tns con USD).
- El usuario compara contra su planilla a mano: los números deben coincidir (redondeos, ETD, exclusiones). Diferencias típicas: Latinut excluida, filas sin ETD, filtro de productos activo, filas ocultas por filtro.
- Prefiere controles visibles y obvios (aprendido con el botón "Σ Total proyectado" que no encontraba) y una vista no sobrecargada.

- **Database de clientes** (config Brokerage `CLIENTS_URL` + `CLIENTS_SHEET`, default pestaña **`Database_old`**): fila 1 tiene encabezados; nombre del cliente en columna **`Company`**, país en **`Country`**. `fetchClientes` prueba en orden: `export?format=csv&gid=` (si el link trae gid; trae filas ocultas por filtro) → gviz CSV por nombre de pestaña → gviz por gid; se queda con la primera respuesta que tenga columna Country (gviz devuelve la PRIMERA pestaña si el nombre no existe). `aplicarPaises` cruza por `normEmpresa`/`mismaEmpresa` y pone `r.pais`. Estado en `CLI_INFO[biz]` → la sección muestra diagnóstico (error de lectura / N filas leídas / importadores no encontrados, desplegable). Country vacío NO se avisa (es exportación por regla).
- **"Último contrato"** en la tabla de frecuencia mira TODA la hoja ALL CONTRATOS del cliente (cualquier año, vista o exportador, incluso Latinut); "Contratos" y "Frecuencia de contratos" sí respetan período/vista/exclusión.
- `normEmpresa` saca sufijos legales encadenados (GmbH & Co. KG, S.A., Ltd, SpA…).
- **Compartir config**: botón 🔗 "Link para compañeros" en ⚙️ Configurar (`linkCompartir`) genera `URL#cfg=<base64url JSON>`; al abrir, `importarDesdeLink` la guarda en localStorage y limpia el # de la barra. Nunca va al repo.
- Al importar un link: si ya había otra config, pide `confirm()` y guarda copia en `dashboardConfigV2_backup`.
- **Panel comercial** (`#comCard`, solo Brokerage, `renderComercial`): globo d3 (d3 + topojson desde cdnjs, mapa world-atlas; en el Artifact el mapa va en `data/world-110m.json`), salud de la cartera por **fecha de contrato** de ALL CONTRATOS (abiertos = los que están en Contratos Abiertos), embudo desde Database_old (`CLI_DB`: región, Team M, producto, Contactado, Cont con RTA, Encuentro) y proveedores desde Database suppliers (`SUPPLIERS_URL`, `PROV_DB`). Nunca leer columnas de contacto (mails, teléfonos, direcciones, VAT). Países: tabla `PAISES` (variantes → id ISO numérico).
- Header: con los datos bien leídos, `#statusLine` queda oculto (`estadoDatos`) y el detalle va al tooltip de ↻ Actualizar; el interruptor de exportadores excluidos está en el panel de Productos.
- Textos de la planilla en `renderMercado` se escapan con `esc()`. **Pendiente**: aplicar `esc()` en el resto de tablas (`renderPartners`, contratos, etc.).

## Documentación de la migración

- `docs/privado/CONVERSACION.md`: transcripción completa del chat original (Cowork), en orden. **No subir al repo** (tiene nombres de clientes; está en `.gitignore`). Leela cuando necesites el porqué de una decisión.
- `docs/PENDIENTES.md`: lo que quedó por hacer (revisión UX/UI y otros).
- `MIGRAR.md`: pasos para el usuario.

## Último estado (30/10/2026)

Lo último que se trabajó fue la database de clientes para exportación vs mercado local. El usuario reportó que 59 importadores "no figuraban" aunque están en Database_old con ese nombre → se cambió a leer primero el export por gid (filtro activo en la pestaña es la causa más probable) y se agregó diagnóstico. **Falta confirmar con él que ya cruza bien.** Si no, pedirle el número de "filas leídas" que muestra el aviso y comparar contra las filas reales de Database_old.

## Versión Artifact (claude.ai)

Hay una copia del dashboard publicada como Artifact (privado). `index.html` sigue siendo la **única fuente**: el Artifact se deriva de él.

- Un Artifact **no puede leer Google Sheets** (bloquea `fetch` a otros sitios). Sus datos son una **copia** publicada junto a la página (`data/manifest.json` + archivos). La página busca cada archivo por la misma clave que genera `tools/bajar-datos.js`.
- `node tools/bajar-datos.js datos-artifact/config.json` baja las planillas (pide las mismas direcciones que el dashboard). `config.json` = lo que el dashboard guarda en `localStorage["dashboardConfigV2"]` (sale del 🔗 Link para compañeros). Todo `datos-artifact/` está en `.gitignore`: tiene nombres de clientes y Sheet IDs.
- `node tools/armar-artifact.js` genera `artifact/index.html` (+ `artifact/data/`). Solo cambia lo que un Artifact no permite: de dónde salen los datos, descargas (Imagen/PDF por la capacidad `downloads`), textos ("copia de datos del …") y oculta ⚙️ Configurar.
- **Estilo Zentra** (`tools/zentra/`: `zentra.css`, `zentra.html`, `zentra.js`): solo en el Artifact. Marca + título grande con el nombre de la vista, y un resumen nuevo (franja de métricas, facturación con barras rayadas, puntos de embarques y precio, tarjeta de comisión) que usa los mismos agregados y el gráfico `mk`/`makeChart`. El resumen viejo (KPIs y 4 gráficos) queda oculto pero se sigue calculando: sirve de control cruzado.
- `node tools/probar-artifact.js` lo sirve en local (http://localhost:8767/) dentro de un esqueleto parecido al del Artifact.
- Para actualizar los datos: volver a correr `bajar-datos` + `armar-artifact` y republicar con `files` (`data/manifest.json` y los `data/fNN.txt`).

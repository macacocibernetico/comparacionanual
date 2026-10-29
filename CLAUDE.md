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
- **Solo Brokerage · Mercado, clientes y frecuencia** (`renderMercado`, card `mktCard`): Local = país (columna `Country`/`País` de ALL) Argentina, resto exportación; participación % por exportador y por cliente (Tns/Facturación/Comisión, año elegido o histórico); frecuencia por cliente: cargas por ETD (hoja ALL, que ya contiene Embarques marítimos, Cargas Terrestres y A facturar) y contratos por `Fecha` de ALL CONTRATOS; empresas agrupadas con `normEmpresa`.
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
- Probar en navegador: abrir `index.html` (sin config muestra datos demo) o la URL de GitHub Pages con la config del usuario.
- Publicar: commit + push a `main`; GitHub Pages se actualiza en 1–2 min.
- Al terminar: decir en 1–2 frases qué cambió y qué se probó; avisar si algo no se pudo verificar con datos reales.

## Historial de pedidos que conviene recordar

- Gráficos con escalas distintas van separados (no mezclar tns con USD).
- El usuario compara contra su planilla a mano: los números deben coincidir (redondeos, ETD, exclusiones). Diferencias típicas: Latinut excluida, filas sin ETD, filtro de productos activo, filas ocultas por filtro.
- Prefiere controles visibles y obvios (aprendido con el botón "Σ Total proyectado" que no encontraba) y una vista no sobrecargada.

- **Database de clientes** (config Brokerage `CLIENTS_URL`): `fetchClientes` lee la planilla (columnas Cliente/Customer/Importer + Country/País) y `aplicarPaises` pone `r.pais` a cada carga por importador. Country ARGENTINA = mercado local (`esLocal`). Gráfico `chMkt`: cargas por mes exportación vs local.

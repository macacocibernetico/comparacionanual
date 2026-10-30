# Checklist funcional

Qué hace el dashboard y cómo se comprueba que sigue igual después de un cambio. Revisado para el rediseño visual del 30/10/2026.

## Cómo verificar

1. `node tests/run.js`: lectura de números y fechas, agregación, Σ Total, tendencia de 12 meses, mezcla gviz + export, mercado local / exportación, link para compañeros, formato, estado vacío y accesibilidad (24 casos).
2. Prueba de humo en el navegador (`tests/smoke-browser.js`):
   - Sirve tres planillas falsas por `fetch` y las carga por el camino real (`init` → `fetchBiz` → CSV → `buildRecords`, contratos, contratos abiertos y database de clientes).
   - Recorre 75 escenarios y guarda una huella: textos de cada tabla y KPI, qué secciones se ven y los datos de cada gráfico.
   - Se corre sobre la versión anterior y la nueva, y `node tests/smoke-compare.js antes.json despues.json` tiene que dar **0 diferencias**.
   - En el rediseño dio 0 diferencias sobre 4.711 valores.

## Funciones y dónde se prueban

| Área | Qué hace | Prueba |
|---|---|---|
| Lectura de Sheets | gviz + export CSV, `mezclarExactos`, separador decimal por columna, encabezados por nombre (fila 2), "Customer" como importador | run.js + humo (carga real con fetch simulado) |
| Contratos | `ALL CONTRATOS` (`buildContracts`) y `Contratos Abiertos` con meses dinámicos (`buildOpenContracts`) | humo |
| Database de clientes | Country por `Company`, cruce con `normEmpresa`/`mismaEmpresa` | run.js + humo |
| Caché | `dashboardCache` 12 h, pinta primero y refresca | manual (no cambió) |
| Negocios | AXT, Buzaram, Brokerage Maní, Brokerage Aceite + Expeller, Σ Total; nunca se mezclan | humo (cada pestaña) |
| Exclusión | Latinut S.A. fuera de Brokerage y del Total, chip para verla | humo |
| Vista | Un año / Comparar, pills de año, "Todos", comparación a misma fecha (YTD) | humo |
| Filtro de productos | accesos rápidos, marcar / desmarcar / invertir, nunca deja la vista vacía (`sanitizeFilter`) | humo |
| Desglose | NOP vs Convencional (AXT), Aceite + Expeller vs resto (Brokerage) | humo |
| KPIs | Tns, USD, comisión, contenedores est. (÷ 22), precio prom./t, comisión/t y %, mejor mes, variación | run.js + humo |
| Gráficos mensuales | Tns, USD, comisión, embarques por ETD; click en barra → detalle de cargas | humo (click simulado) |
| Tendencia 12 meses | 5 gráficos, "Ver por negocio" en Σ Total, zoom al tocar | run.js + humo |
| Σ Total | 3 tortas + tabla con %, precio y comisión por tonelada | run.js + humo |
| Detalle por producto | tabla Toneladas / Facturación USD | humo |
| Comparación anual | Δ t y Δ % por producto | run.js + humo |
| Consolidación (AXT) | producto × mes, destinos, selector de meses | humo |
| Grupos comerciales (AXT) | fletes, comisión, neto, días de cobro, filas clickeables | humo (click en fila) |
| Mercado (Brokerage) | local vs exportación, participación por exportador y cliente, frecuencia de cargas y contratos | run.js + humo |
| Exportadores / importadores | por año e histórico, switch aceite, orden, detalle por empresa | humo (click en fila) |
| Aceite + Expeller | estadísticas, torta de clientes, selector | humo |
| Vista NEWSAN SA | aceite vs expeller, Toneladas / Facturación | humo |
| Contratos | por exportador / importador / listado, años, saldos | humo |
| Programación | ya embarcado + falta = total, Comparar / Sumar, meses pasados | humo |
| Exportar | 🖼 Imagen / 📄 PDF por tarjeta, 📋 Copiar tabla | manual (no cambió: el código es el mismo) |
| Plegar secciones, "Ir a" | estado en `UI.cerradas` | humo |
| Tema claro / oscuro | botón ◐, se recuerda | humo + contraste medido en los dos |
| Configurar | modal, pestañas Planilla / Columnas, link para compañeros | run.js + humo (abre y cierra) |
| Colores por año | panel 🎨, editables | humo (abre el panel) |
| Mobile | menú ☰, filtro a la vista, negocios en dos filas | revisión a 375 px |

## Qué cambió en el rediseño (solo visual)

- Tokens de color: texto principal `#111827`, grises secundarios `#374151` / `#4b5563`, fondo `#eef0f3`, tarjetas blancas.
- Tipografía Geist, números grandes en peso regular.
- Tarjetas de radio 22 px con sombra difusa y sin borde.
- Negocios en píldora con el activo en negro.
- Gráficos mensuales: año base con degradé y una marca arriba de cada barra; años comparados con barras rayadas en el color del año (los colores siguen siendo editables).
- "Cantidad de embarques" como matriz de puntos (un punto = una carga). Si los puntos no entran, se dibuja la barra común. El click sigue abriendo el detalle.
- Barras rayadas de participación en Mercado (exportación / local), en las tablas de participación por exportador y cliente, y en la tabla de Σ Total.
- Ningún texto, cálculo ni evento cambió: lo confirma la huella de la prueba de humo.

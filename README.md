# Dashboard Anual de Exportaciones

Web app estática (un solo `index.html`) que lee tu planilla de Google Sheets y muestra el dashboard con comparaciones anuales. Sin backend, sin claves de API.

## 1. Preparar la planilla

1. Abrí tu planilla en Google Sheets.
2. **Compartir** → "Cualquier persona con el enlace" → **Lector**.
   (Solo lectura; nadie puede editar. Si preferís no hacer pública la planilla, alternativa: creá una planilla espejo con `IMPORTRANGE` que traiga solo las columnas necesarias y compartí esa.)
3. Copiá el **ID** de la URL:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit#gid=0`

## 2. Configurar el dashboard (sin tocar el código)

**Nada sensible queda hardcodeado.** Abrí el dashboard, tocá **⚙️ Config** y completá:

- **Sheet ID**: pegá el ID o directamente la URL completa de la planilla (extrae el ID solo).
- **Nombre de la pestaña** con los datos.
- Fila de encabezados (2), formato de fecha, columna USD (AG=TOTAL FINAL o AC=Total CFR) y modo de comisión (sumar AF, o AF × Tns si es precio unitario).

La config se guarda en el **localStorage de tu navegador**: no viaja a GitHub ni la ve nadie que entre a la página. Cada persona/dispositivo que use el dashboard configura su propio Sheet ID una sola vez. Sin config, se muestran **datos demo**.

## 3. Subir a GitHub Pages

1. Creá un repo en GitHub (puede ser **privado**; Pages público requiere repo público en plan gratuito — con plan Pro/Team puede ser privado).
2. Subí `index.html` a la raíz del repo.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, carpeta `/ (root)` → Save.
4. En 1–2 minutos tu dashboard queda en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

Cada vez que abras la página (o toques **↻ Actualizar**) trae los datos frescos de la planilla.

## Qué muestra

- **Pestañas por negocio**: AXT, Brokerage y Buzaram — cada uno con su propia planilla y configuración; los datos NUNCA se mezclan entre pestañas — más **Σ Total**, que consolida los tres.
- **Columnas configurables por negocio**: en ⚙️ Config → pestaña "Columnas" ponés el nombre exacto del encabezado que usa cada planilla para fecha (mes/año), toneladas, producto, contenedores, facturación y comisión. Así Brokerage puede tener encabezados distintos a AXT sin tocar código.
- **Dos modos de vista**: "Un año" (un solo año estático, con mejor mes por métrica) y "Comparar" — contra un año puntual, contra **todos los anteriores** o contra **todos los años** (pill "📊 Todos"). El año elegido va en color pleno y los demás en tonos apagados; los KPIs comparan contra el año anterior disponible.
- **Colores editables** (botón 🎨): cada año tiene su propio color fuerte y distinto por defecto (azul, naranja, verde, magenta…). Podés cambiar cualquiera con un selector de color y los gráficos se actualizan al instante; también los colores de NOP y Convencional. Se guarda en el navegador y hay botón para restaurar los defaults.
- **Tendencia mensual**: gráfico de líneas con la historia completa mes a mes (toneladas en el eje izquierdo, USD y comisión en el derecho), respetando el filtro de productos. Click en un punto abre el detalle del mes.
- **Desglose por grupos de producto**: interruptor independiente, propio de cada negocio y que nunca se cruza al Total.
  - **AXT**: 🌿 NOP vs Convencional (detecta la palabra "NOP" en el producto).
  - **Brokerage**: 🥜 Aceite+Expeller vs Otros productos (detecta "oil"/"aceite" y "expeller"). Los KPIs muestran además cuánto corresponde a Aceite y cuánto a Expeller por separado.
  - **Buzaram y Σ Total**: sin desglose.

  Se combina con cualquier modo: con "Un año" son dos series del mismo año; con "Comparar" cada barra queda apilada. El filtro de productos ofrece también accesos rápidos para cada grupo del negocio activo.
- **Filtro de productos** (botón 🎛): chips rápidos Todos / Solo NOP / Solo Convencional, y checklist por producto con marcar todos / ninguno / invertir (para "solo aceite", "todo menos aceite", etc.). Aplica a todos los KPIs, gráficos y tablas, y se recuerda entre visitas.
- Selector de años tipo pills (2024 / 2025 / 2026…), generado automáticamente según los datos.
- KPIs: toneladas, USD, comisión, contenedores, negocios.
- Gráficos mensuales: toneladas consolidadas, USD, comisión, embarques (por ETD).
- Toneladas por producto y mes (barras apiladas) + tabla de detalle mensual.
- En modo comparar: tabla de comparación anual por producto (Δ toneladas y Δ %).
- En la pestaña Total: dona de toneladas por negocio.

- **Programación y proyección de embarques** (solo Brokerage, al final de la vista): arriba del gráfico hay tres números siempre visibles — **Ya embarcado** (cargas con ETD) **+ Falta embarcar** (lo programado que todavía no salió) **= Total del período**. El selector "Gráfico" cambia entre *Comparar* (las dos barras al lado) y *Sumar → total del mes* (barras apiladas con el total arriba de cada mes, que es el modo por defecto). Si estás en "Comparar", tocando la tarjeta del total pasás al modo sumado.

El mes/año de cada operación sale de la columna **ETD** (fecha de salida del embarque). Las filas sin ETD válida no se cuentan.

## Columnas blindadas por encabezado

Las columnas **no se buscan por posición** sino por su encabezado en la fila de encabezados (fila 2): `Negocio`, `Tns`, `Product`, `Containers`, `Consolidación`, `ETD`, `Total CFR`, `Price Serv`, `TOTAL FINAL`. Podés reordenar o insertar columnas en la planilla sin romper el dashboard. El match tolera mayúsculas/minúsculas, acentos y espacios extra. Si falta un encabezado crítico (`ETD` o `Tns`), el dashboard muestra un error claro en vez de leer datos equivocados; para el resto usa la posición original como último recurso. Lo que **no** hay que cambiar es el texto de los encabezados.

## Sumar otro negocio más adelante

1. En `index.html`, agregá una línea al array `BUSINESSES` (al inicio del script) con `key`, `name` y `status: "active"`.
2. Abrí el dashboard → **⚙️ Config** → elegí el negocio en el selector → pegá su Sheet ID, y si su planilla usa otros encabezados, cargalos en la pestaña "Columnas".
3. Aparece con su pestaña propia y se suma automáticamente al Total.

## Notas

- Fechas: se esperan en formato dd/mm/aaaa. Si tu planilla usa mm/dd, cambiá `DATE_FORMAT` a `"MDY"`.
- Números: acepta tanto `1.234,56` como `1,234.56`.
- Si aparece "La planilla no es pública", revisá el paso 1.

# Dashboard Anual de Exportaciones

Web app estática (un solo `index.html`) que lee tu planilla de Google Sheets y muestra el dashboard con comparaciones anuales. Sin backend, sin claves de API.

## 1. Preparar la planilla

1. Abrí tu planilla en Google Sheets.
2. **Compartir** → "Cualquier persona con el enlace" → **Lector**.
   (Solo lectura; nadie puede editar. Si preferís no hacer pública la planilla, alternativa: creá una planilla espejo con `IMPORTRANGE` que traiga solo las columnas necesarias y compartí esa.)
3. Copiá el **ID** de la URL:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit#gid=0`

## 2. Configurar el dashboard

Abrí `index.html` y editá el bloque `CONFIG` (arriba del script):

- `SHEET_ID`: el ID que copiaste.
- `SHEET_NAME`: nombre exacto de la pestaña con los datos.
- `HEADER_ROW: 2` ya está seteado (encabezados en fila 2).
- `USD_COL`: `"AG"` (TOTAL FINAL). Cambiá a `"AC"` si preferís Total CFR.
- `COMISION`: por defecto suma la columna `AF` (Price Serv). Si AF es un precio unitario, cambiá `mode` a `"porTon"` para que calcule AF × Tns.

Mientras `SHEET_ID` esté vacío, el dashboard muestra **datos demo** para que veas cómo queda.

## 3. Subir a GitHub Pages

1. Creá un repo en GitHub (puede ser **privado**; Pages público requiere repo público en plan gratuito — con plan Pro/Team puede ser privado).
2. Subí `index.html` a la raíz del repo.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, carpeta `/ (root)` → Save.
4. En 1–2 minutos tu dashboard queda en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

Cada vez que abras la página (o toques **↻ Actualizar**) trae los datos frescos de la planilla.

## Qué muestra

- KPIs anuales con variación % vs año de comparación: toneladas, USD, comisión, contenedores, negocios.
- Gráficos mensuales año vs año: toneladas consolidadas, USD, comisión, embarques (por ETD).
- Toneladas por producto y mes (barras apiladas) + tabla de detalle mensual.
- Comparación anual por producto (Δ toneladas y Δ %).

El mes/año de cada negocio sale de la columna **Consolidación (K)**; el gráfico de embarques usa **ETD (L)**.

## Notas

- Fechas: se esperan en formato dd/mm/aaaa. Si tu planilla usa mm/dd, cambiá `DATE_FORMAT` a `"MDY"`.
- Números: acepta tanto `1.234,56` como `1,234.56`.
- Si aparece "La planilla no es pública", revisá el paso 1.

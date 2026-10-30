# Dashboard de Negocios — Audit UX/UI

**Fecha:** 30/10/2026 · **Alcance:** `index.html` servido en local, **sin planillas conectadas** (datos de ejemplo), tema oscuro y claro.
**Viewports:** 1440×900 y 375×812 (mobile). **Vistas recorridas:** AXT (completa, escritorio), Brokerage Maní (escritorio y mobile), modal ⚙️ Configurar.
**No cubierto:** Buzaram, Σ Total, y las secciones que solo aparecen con datos reales de Brokerage (Mercado/clientes/frecuencia, Exportadores e importadores, Contratos, Programación). Tampoco la lectura contra Google Sheets. Esas hay que auditarlas con la config real cargada.

## Resumen

| Severidad | Cantidad |
|---|---|
| Mayor | 4 |
| Accesibilidad | 5 |
| Nota | 5 |

Lo que funciona está al final y tiene números. Los hallazgos están ordenados por consecuencia.

## Hallazgos

### 01 · Mayor · Brokerage sin planilla
**Cuatro gráficos quedan en blanco y el aviso dice que se están viendo datos de ejemplo.**
Quien abre Brokerage ve cuatro tarjetas vacías, sin ningún mensaje, bajo un cartel que afirma lo contrario. Parece un error de carga, no un estado vacío.

```
Chart.getChart(chTns | chUsd | chCom | chEtd) → "sin chart" (los 4), canvas de 150 px
Banner: "Estás viendo datos de ejemplo. Para ver tus números reales, tocá ⚙️ Configurar…"
Sección de abajo: "Este negocio todavía no tiene planilla conectada."
```
**Arreglo:** si el negocio no tiene datos, cada tarjeta muestra su estado vacío con el botón Configurar, o Brokerage usa datos demo como AXT. El banner debe decir lo mismo que las tarjetas.

### 02 · Mayor · Tabla "Comparación anual por producto"
**El Δ % usa punto decimal y el resto de la tabla usa coma.**
En la misma fila conviven los dos formatos. Para quien compara contra su planilla a mano, "+59.0%" y "554,16" parecen de sistemas distintos.

```
Aceite de maní   554,16   348,62   +205,53   +59.0%
Maíz pisingallo  490,05    44,56   +445,49   +999.7%
```
**Arreglo:** formatear el porcentaje con el mismo formateador es-AR que las toneladas.

### 03 · Mayor · Mobile (375 px) · selector de negocio
**"Σ Total" y "Brokerage Aceite + Expeller" quedan fuera de pantalla sin ninguna pista de que hay más.**
El Total, que es la vista principal, solo se alcanza si el usuario adivina que la fila se desliza. En la captura el corte cae justo en el punto naranja de la pestaña.

```
viewport 375 px
div#tabs > button.tab "Brokerage Aceite + Expeller"  right = 553 px
div#tabs > button.tab "Σ Total"                       right = 630 px
```
**Arreglo:** que las pestañas pasen a dos filas en mobile, o agregar un degradé y una flecha en el borde derecho.

### 04 · Mayor · Mobile · filtro de productos
**El botón 🎛 Productos no está visible en mobile.**
Es el control que cambia todos los números, y el chip de filtro activo tampoco se ve. Es una de las causas de "mis números no coinciden". Ya figuraba en `PENDIENTES.md` (UX/UI, punto 2).

```
375 px → #btnFilter getBoundingClientRect() = 0 × 0 (dentro del menú ☰)
```
**Arreglo:** dejar el botón y el chip de filtro activo siempre en la barra, fuera del ☰.

### 05 · Accesibilidad · Modales sin semántica de diálogo (WCAG 4.1.2, 1.3.1)
**Los 3 modales no tienen `role="dialog"`, `aria-modal` ni nombre.**
Un lector de pantalla no anuncia que se abrió un diálogo. Ya figuraba en `PENDIENTES.md` (punto 5).

```
.modal.wide.rollzoom → role=null aria-modal=null aria-label/labelledby=null
.modal.wide          → role=null aria-modal=null aria-label/labelledby=null
.modal               → role=null aria-modal=null aria-label/labelledby=null
```
**Arreglo:** agregar `role="dialog" aria-modal="true" aria-labelledby=<h2>` y devolver el foco al botón que lo abrió.

### 06 · Accesibilidad · Contraste insuficiente (WCAG 1.4.3)
**Dos textos no llegan a 4,5:1.**
Medí 225 elementos de texto en oscuro y fallan 2, ambos la misma etiqueta. En claro fallan los 4 deltas verdes de la tabla comparativa.

```
Oscuro: label "Meses" (12 px/600)   rgb(142,142,147) sobre rgb(44,44,46)   = 4,27:1  (pide 4,5)
Claro:  "+205,53" "+59.0%" "+445,49" "+999.7%"   rgb(36,138,61) sobre blanco = 4,40:1  (pide 4,5)
```
**Arreglo:** subir la luminosidad del gris del label en oscuro, y oscurecer el verde de variación en claro (por ejemplo a `#1e7a35`, aprox. 5,3:1, a validar).

### 07 · Accesibilidad · Sin landmark `main` (WCAG 1.3.1)
```
landmarks: main=0  nav=1  header=1  footer=1  · [role=main]=0
```
**Arreglo:** envolver el contenido en `<main id="...">` y apuntar el enlace "Saltar al contenido" ahí.

### 08 · Accesibilidad · Pill "Todos" sin estado (WCAG 4.1.2)
Los pills de año y el modo exponen `aria-pressed`; "Todos" no.
```
Un año=false · Comparar=true · 2026=true · 2025=true · 2024=false · Todos=null
```
**Arreglo:** agregar `aria-pressed` también a "Todos".

### 09 · Accesibilidad · Títulos de sección más bajos que 24 px (WCAG 2.5.8)
Los encabezados plegables ocupan todo el ancho pero miden 21 px de alto.
```
div#rollCard > h2.clickhead   1323 × 21
div#consSection > h2.clickhead  1323 × 21
div#gruposCard > h2.clickhead   1323 × 21
```
Son botones separados por más de 24 px del siguiente, así que probablemente aplica la excepción por espaciado. Lo dejo como nota, sin afirmarlo como falla.

### 10 · Nota · Nombre de página inconsistente
```
<title>: "Dashboard Anual — Negocios"   <h1>: "Dashboard de Negocios"
```
### 11 · Nota · Dos gráficos con el mismo nombre accesible
```
#chOilexp aria-label = "Aceite y expeller por mes"
#chFocus  aria-label = "Aceite y expeller por mes"   (este es NEWSAN SA)
```
### 12 · Nota · Emojis dentro de botones sin `aria-hidden`
6 de 6 botones muestreados (🎛 🌿 🎨 🖼 📄) leen el nombre del emoji además del texto.

### 13 · Nota · Densidad de la primera pantalla
```
1440×900: 25 elementos interactivos en la primera pantalla, índice de Hick 4,7
(referencia del probe para pantallas acotadas: 8–15 elementos, índice 3,2–4,0)
```
Es un dashboard de uso experto, así que no es automáticamente un error. Coincide con la nota de "sobrecarga" ya registrada en `PENDIENTES.md` (punto 1).

### 14 · Nota · Escala visual sin tokens claros
```
18 tamaños de fuente distintos · 20 valores de espaciado · 10 radios de borde
54 % del texto en pantalla con peso 600 o más (la jerarquía por peso se diluye)
```

## Lo que funciona

- **Foco de teclado:** `2px solid rgb(166,207,250)` sobre `rgb(44,44,46)` = **8,58:1** (exige 3:1, SC 1.4.11). Grosor cumple SC 2.4.13.
- **Contraste general:** 225 de 225 textos medidos; fallan solo los del hallazgo 06.
- **Semántica de las secciones plegables:** los 10 encabezados son `role=button`, `tabindex=0` y `aria-expanded`.
- **Selector de negocio:** `role=tab` con `aria-selected` en las 5 pestañas.
- **Gráficos:** los 21 `canvas` tienen `role=img` y `aria-label` (salvo el duplicado del hallazgo 11).
- **Nombres de controles:** 0 controles sin nombre, 0 nombres duplicados, 0 imágenes sin alt.
- **Estructura:** un solo `h1`, sin saltos de nivel, `lang="es"`, enlace "Saltar al contenido".
- **Escape cierra el modal de configuración** (verificado).
- **Desbordes:** sin scroll horizontal de página en 1440 ni en 375 px.
- **Carga:** DOMContentLoaded 133 ms, 16 KB transferidos, 0 tareas largas.
- **Reduced motion:** hay una regla `prefers-reduced-motion`.

## Por dónde empezar (impacto ÷ esfuerzo)

1. **02** — una línea: usar el mismo formateador es-AR en el Δ %.
2. **01** — estado vacío por tarjeta en Brokerage, y que el banner diga lo correcto.
3. **05, 07, 08** — atributos ARIA y un `<main>`: cambios chicos, sin riesgo visual.
4. **06** — dos colores.
5. **03 y 04** — pestañas y filtro en mobile (ya estaban en pendientes).
6. **10–14** — limpieza.

## Método y límites

- Mediciones con probes sobre el DOM real (contraste WCAG, geometría, ARIA, foco con Tab real), más capturas en dos viewports.
- Los probes de proximidad (`orphanedHeadings: -26px`) marcaron títulos "huérfanos" en las 8 tarjetas; no lo reporto porque en las capturas el título está pegado a su descripción. Lo tomo como falso positivo.
- Los probes de localización en inglés no aplican a una interfaz en español; solo usé sus resultados de formato y concatenación (sin hallazgos). El mix "Title Case ×5 / Sentence case ×12" en etiquetas es menor y no lo reporto.
- Sin datos reales no se pudo medir tiempo de carga contra Google Sheets ni las vistas exclusivas de Brokerage.

## Estado de los arreglos (30/10/2026)

Resueltos y verificados en el navegador y con `node tests/run.js` (22 ok): **01, 02, 03, 04, 05, 06, 07, 08**.
- **01:** un negocio sin planilla ya no muestra tarjetas vacías; ver el mensaje con el botón Configurar. El aviso de datos de ejemplo aclara que son de AXT. Además se corrigió un hallazgo nuevo: la tabla "Comparación anual por producto" de AXT se seguía mostrando dentro de Brokerage.
- **02:** Δ % y "vs año comp." con coma decimal.
- **05:** los 3 modales con `role="dialog"`, `aria-modal` y `aria-labelledby`. Falta mover el foco al abrir y devolverlo al cerrar.
- **06:** tras el cambio, 0 fallas de contraste en claro (224 textos) y en oscuro (225).
- **07/08:** `<main id="main">` y `aria-pressed` en "Todos".

- **03:** en mobile los 5 negocios se ven en dos filas (todos dentro de 375 px, antes "Σ Total" llegaba a 630 px).
- **04:** en mobile el filtro de productos queda en la barra, fuera del ☰ (en escritorio vuelve a "Ajustes de vista").

Pendientes: 09 a 14. Observado de paso: los pills de año en mobile siguen en carrusel y "Todos" queda cortado en el borde derecho.

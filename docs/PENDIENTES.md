# Pendientes

## A confirmar con Agustín
- [x] Database de clientes: cruza bien (confirmado el 30/10/2026).
- [ ] Último contrato de LUDGER WEHRY IMP EXP (20/8) aparece.
- [ ] Link para compañeros: probado con un compañero real.
- [ ] Rediseño visual (rama `rediseno-visual`): revisarlo con las planillas reales antes de mergear a `main`.

## Revisión UX/UI — ya hecho
- Contraste `--faint`/`--muted` en tema claro; botón primario en oscuro.
- Sacados los badges "CLICK PARA VER CARGAS" → pista en la bajada.
- `.meta` para años/conteos (antes parecían botones con `.clickable`).
- `confirm()` + backup al importar config por link.
- Mobile: filtro de productos siempre a la vista; negocios y años en varias filas.
- Errores de carga en palabras simples + botón **Reintentar**; los `alert()` pasaron a un aviso breve abajo.
- Modales: `role="dialog"`, `aria-modal`, nombre; el foco entra al abrir y vuelve al botón al cerrar; Escape cierra solo el de arriba.
- `esc()` en todos los textos que vienen de la planilla (productos, empresas, destinos, contratos, filtro).
- `<title>` = `h1` ("Dashboard de Negocios"); emojis de los botones fijos en `aria-hidden`.
- Si falla la carga, la sección Mercado ya no queda con datos viejos.
- Sobrecarga: los 4 gráficos mensuales, el detalle por producto y la comparación anual se pliegan; botón "Plegar todo / Desplegar todo" en la fila "Ir a" (no se cambió el estado inicial: todo arranca abierto).
- Rediseño visual completo (ver `docs/CHECKLIST-FUNCIONAL.md`).

## Revisión UX/UI — pendiente
1. Botones "⤓ Exportar a PDF" propios de Exportadores, NEWSAN y Contratos: **no son duplicados** (hacen un PDF con la tabla real, distinto del PDF-imagen del menú "···"). Si se quiere menos ruido, pasarlos adentro del menú "···" de su tarjeta.
2. Mismo patrón de rótulos en todas las `.consbar` (como `.ctlab` de Programación).
3. Emojis dentro de botones que arma el JS (🎛 Productos, 🌿/🥜 desglose): el texto lo genera `filterLabel()` y `currentSplit()`.

## Limpieza
- Borrar código muerto: `renderTrend`, `renderProductChart` (sus canvas ya no existen).

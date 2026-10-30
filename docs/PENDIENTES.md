# Pendientes

## A confirmar con Agustín
- [ ] Database de clientes: ¿cruza bien ahora? (antes 59 importadores "no encontrados" aunque estaban en Database_old). Necesita el link de la pestaña con `#gid=` en ⚙️ Configurar → Brokerage.
- [ ] Último contrato de LUDGER WEHRY IMP EXP (20/8) aparece.
- [ ] Link para compañeros: probado con un compañero real.

## Revisión UX/UI (puntaje 64/100) — ya hecho
- Contraste `--faint`/`--muted` en tema claro; botón primario en oscuro.
- Sacados los badges "CLICK PARA VER CARGAS" → pista en la bajada.
- `.meta` para años/conteos (antes parecían botones con `.clickable`).
- 🖼/📄 de exportar siempre visibles.
- `confirm()` + backup al importar config por link.
- `esc()` en la sección Mercado.

## Revisión UX/UI — pendiente (en orden sugerido)
1. Sobrecarga: hacer plegables el grid mensual, "Detalle mensual por producto" y `#compareCard`; arrancar con la mayoría plegada; botón "Plegar todo / Desplegar todo" en la nav "Ir a".
2. Mobile: `#btnFilter` (filtro de productos) siempre visible en la toolbar, no dentro de ☰; chip de filtro activo siempre visible.
3. Quitar botones duplicados "⤓ Exportar a PDF" (`#btnPartnerPdf`, `#btnFocusPdf`, `#btnContractsPdf`) y dejar solo `.cardtools`.
4. Errores en criollo + botón **Reintentar** (`init({force:true})`) en el banner; reemplazar `alert()`.
5. Modales: `role="dialog"`, `aria-modal`, foco al abrir/cerrar; Escape cierra solo el de arriba.
6. Mismo patrón de rótulos en todas las `.consbar` (como `.ctlab` de Programación).
7. Escapar con `esc()` todos los textos que vienen de la planilla (`renderPartners`, contratos, NEWSAN, grupos…).
8. Menores: unificar `<title>` y `h1`; emojis en `aria-hidden`; `.tab.soon` legible.

## Limpieza
- Borrar código muerto: `renderTrend`, `renderProductChart` (sus canvas ya no existen).

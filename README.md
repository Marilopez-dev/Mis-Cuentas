# Mis cuentas

Web de consulta para finanzas personales, sin login. Hecha con React + Vite, administrada con pnpm.

## Qué hace

- **Ingresos y gastos**: carga por día o por mes, resumen por día/mes/año con gráfico de torta y gastos por categoría.
- **Ahorros**: depósitos y retiros, suma acumulada, meta opcional y gráfico de barras (mes positivo/negativo) con la línea del total.
- **Inversiones**: simula cuánto tendrías hoy si hubieras invertido en Bitcoin, Ethereum o BNB (precios mensuales reales de la API pública de Binance) frente a plazo fijo, cuenta remunerada y USDT en Binance Earn (tasas editables).
- **Excel**: "Descargar Excel" genera un `.xlsx` con las hojas Movimientos, Resumen diario/mensual/anual, Ahorros y Configuración. "Subir Excel" vuelve a cargar ese archivo en otra sesión.

Los datos también quedan guardados en el navegador entre recargas, pero el Excel es la copia que conviene conservar.

## Uso

```bash
pnpm install
pnpm dev
```

Compilar para producción: `pnpm build` (genera `dist/`).

## Publicación

Cada push a `main` compila y publica la web en GitHub Pages con el workflow `.github/workflows/deploy.yml`:
https://marilopez-dev.github.io/Mis-Cuentas/

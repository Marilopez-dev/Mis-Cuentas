import { summarize, savingToMovement, TYPES } from './periods'
import { CURRENCIES, uid } from './format'

const MOV_HEADERS = ['Fecha', 'Tipo', 'Periodicidad', 'Categoría', 'Descripción', 'Moneda', 'Monto']

export async function exportWorkbook({ movements, currency }) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // One sheet holds every movement: Ingreso, Gasto, Ahorro (a withdrawal is a negative Ahorro) and Inversión.
  const movRows = [...movements]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({
      Fecha: m.date,
      Tipo: TYPES[m.type]?.label ?? 'Gasto',
      Periodicidad: m.frequency === 'mes' ? 'Mensual' : 'Diario',
      Categoría: m.category,
      Descripción: m.description,
      Moneda: m.currency ?? currency,
      Monto: m.amount,
    }))
  XLSX.utils.book_append_sheet(wb, sheet(XLSX, movRows, MOV_HEADERS), 'Movimientos')

  const summaries = [
    ['dia', 'Resumen diario'],
    ['mes', 'Resumen mensual'],
    ['anio', 'Resumen anual'],
  ]
  // Summaries never add different currencies together: one block of rows per currency.
  const currencies = [...new Set(movements.map((m) => m.currency ?? currency))].sort()
  for (const [mode, name] of summaries) {
    const rows = currencies.flatMap((cur) =>
      summarize(movements.filter((m) => (m.currency ?? currency) === cur), mode).map((r) => ({
        Período: r.periodo,
        Moneda: cur,
        Ingresos: r.ingresos,
        Gastos: r.gastos,
        Ahorros: r.ahorros,
        Inversiones: r.inversiones,
        Disponible: r.saldo,
      })),
    )
    XLSX.utils.book_append_sheet(wb, sheet(XLSX, rows, ['Período', 'Moneda', 'Ingresos', 'Gastos', 'Ahorros', 'Inversiones', 'Disponible']), name)
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Moneda', currency]]), 'Configuración')

  XLSX.writeFile(wb, `finanzas-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function sheet(XLSX, rows, headers) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }))
  return ws
}

export async function importWorkbook(file) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const movSheet = wb.Sheets.Movimientos
  if (!movSheet) {
    throw new Error('El archivo no tiene una hoja llamada "Movimientos". Subí un Excel descargado desde esta web.')
  }

  let currency
  const config = wb.Sheets.Configuración
  if (config) {
    const rows = XLSX.utils.sheet_to_json(config, { header: 1 })
    currency = rows.find((r) => r[0] === 'Moneda')?.[1]
  }

  const movements = XLSX.utils.sheet_to_json(movSheet).flatMap((row) => {
    const date = toISODate(row.Fecha)
    const amount = Number(row.Monto)
    if (!date || !Number.isFinite(amount)) return []
    const type = parseType(row.Tipo)
    const rowCurrency = String(row.Moneda ?? '').trim().toUpperCase()
    return [{
      id: uid(),
      date,
      type,
      frequency: String(row.Periodicidad).toLowerCase().startsWith('mensual') ? 'mes' : 'dia',
      category: String(row.Categoría ?? '').trim(),
      description: String(row.Descripción ?? '').trim(),
      currency: CURRENCIES[rowCurrency] ? rowCurrency : (currency ?? 'ARS'),
      // Only savings keep their sign: a negative Ahorro is a withdrawal.
      amount: type === 'ahorro' ? amount : Math.abs(amount),
    }]
  })

  // Files downloaded before savings moved into Movimientos have a separate "Ahorros" sheet.
  if (wb.Sheets.Ahorros) {
    for (const row of XLSX.utils.sheet_to_json(wb.Sheets.Ahorros)) {
      const date = toISODate(row.Fecha)
      const amount = Number(row.Monto)
      if (date && Number.isFinite(amount)) {
        movements.push(savingToMovement({ id: uid(), date, amount, note: String(row.Nota ?? '').trim() }, currency ?? 'ARS'))
      }
    }
  }

  return { movements, currency }
}

function parseType(value) {
  // "Inversión" -> "inversion"
  const text = String(value ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return Object.keys(TYPES).find((t) => text.startsWith(t)) ?? 'gasto'
}

function toISODate(value) {
  if (value instanceof Date && !Number.isNaN(value)) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  const text = String(value ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  // dd/mm/yyyy
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  return null
}

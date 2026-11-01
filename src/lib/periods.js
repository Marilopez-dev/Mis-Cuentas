// A movement is { id, type: 'ingreso' | 'gasto' | 'ahorro' | 'inversion', date: 'YYYY-MM-DD', amount, category, description, frequency: 'dia' | 'mes' }.
// Monthly movements are stored on the first day of their month.

export function periodKey(mode, date) {
  if (mode === 'anio') return date.slice(0, 4)
  if (mode === 'mes') return date.slice(0, 7)
  return date
}

export function inPeriod(movement, mode, value) {
  if (mode === 'dia') return movement.frequency !== 'mes' && movement.date === value
  return periodKey(mode, movement.date) === value
}

export const TYPES = {
  ingreso: { label: 'Ingreso', plural: 'ingresos' },
  gasto: { label: 'Gasto', plural: 'gastos' },
  ahorro: { label: 'Ahorro', plural: 'ahorros' },
  inversion: { label: 'Inversión', plural: 'inversiones' },
}

// Savings entered in the Ahorros tab are movements of type "ahorro"; a withdrawal has a negative amount.
export function savingToMovement(s, currency) {
  return {
    id: s.id,
    type: 'ahorro',
    frequency: 'dia',
    date: s.date,
    amount: s.amount,
    category: s.amount < 0 ? 'Retiro' : 'Otros',
    description: s.note ?? '',
    currency,
  }
}

// Effect of a movement on the available balance: income adds, everything else subtracts (a savings withdrawal adds back).
export function signedAmount(m) {
  return m.type === 'ingreso' ? m.amount : -m.amount
}

// Savings and investments leave the available balance but are not expenses.
export function totals(movements) {
  const t = { ingresos: 0, gastos: 0, ahorros: 0, inversiones: 0 }
  for (const m of movements) t[TYPES[m.type]?.plural ?? 'gastos'] += m.amount
  return { ...t, saldo: t.ingresos - t.gastos - t.ahorros - t.inversiones }
}

// Group movements into rows per day, month or year for the Excel summaries.
export function summarize(movements, mode) {
  const groups = new Map()
  for (const m of movements) {
    const key = periodKey(mode, m.date)
    const row = groups.get(key) ?? []
    row.push(m)
    groups.set(key, row)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, list]) => ({ periodo, ...totals(list) }))
}

export function byCategory(movements, type) {
  const groups = new Map()
  for (const m of movements) {
    if (m.type !== type) continue
    const key = m.category || 'Sin categoría'
    groups.set(key, (groups.get(key) ?? 0) + m.amount)
  }
  return [...groups.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount)
}

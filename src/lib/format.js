export const CURRENCIES = {
  ARS: { label: 'Pesos (ARS)', locale: 'es-AR' },
  USD: { label: 'Dólares (USD)', locale: 'es-AR' },
  EUR: { label: 'Euros (EUR)', locale: 'es-ES' },
}

export function money(value, currency = 'ARS', compact = false) {
  const { locale } = CURRENCIES[currency] ?? CURRENCIES.ARS
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: compact ? 1 : 2,
    notation: compact ? 'compact' : 'standard',
  }).format(value || 0)
}

export function percent(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(value || 0)
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function monthName(index) {
  return MONTHS[index]
}

// "2026-11" -> "nov 26"
export function shortMonth(key) {
  const [y, m] = key.split('-')
  return `${MONTHS_SHORT[Number(m) - 1]} ${y.slice(2)}`
}

// Describe the selected period in words: "el 3 de noviembre de 2026", "noviembre de 2026", "2026"
export function periodLabel(mode, value) {
  if (mode === 'anio') return value
  const [y, m, d] = value.split('-')
  if (mode === 'mes') return `${MONTHS[Number(m) - 1]} de ${y}`
  return `el ${Number(d)} de ${MONTHS[Number(m) - 1]} de ${y}`
}

export function todayISO() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Monthly prices from Binance's public market-data API (no key needed).
// data-api.binance.vision is Binance's public mirror and works in regions where api.binance.com is blocked.
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com']

export const CRYPTO = [
  { key: 'BTC', symbol: 'BTCUSDT', label: 'Bitcoin (Binance)' },
  { key: 'ETH', symbol: 'ETHUSDT', label: 'Ethereum (Binance)' },
  { key: 'BNB', symbol: 'BNBUSDT', label: 'BNB (Binance)' },
]

// Returns [{ month: 'YYYY-MM', open, close }] for the last `months` months, the current one (partial) included.
export async function monthlyPrices(symbol, months) {
  let lastError
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}/api/v3/klines?symbol=${symbol}&interval=1M&limit=${months}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows = await res.json()
      return rows.map((k) => ({
        month: new Date(k[0]).toISOString().slice(0, 7),
        open: Number(k[1]),
        close: Number(k[4]),
      }))
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

// Simulate buying with `initial` at the first month's open, then `monthly` at each following month's open.
export function simulateAsset(prices, initial, monthly) {
  let units = 0
  return prices.map((p, i) => {
    units += (i === 0 ? initial : monthly) / p.open
    return units * p.close
  })
}

// Fixed-rate product compounding monthly. `rate` is annual; `kind` is 'tna' (nominal) or 'tea' (effective).
export function simulateRate(count, initial, monthly, rate, kind) {
  const r = kind === 'tna' ? rate / 12 : Math.pow(1 + rate, 1 / 12) - 1
  let value = 0
  const out = []
  for (let i = 0; i < count; i++) {
    value = (value + (i === 0 ? initial : monthly)) * (1 + r)
    out.push(value)
  }
  return out
}

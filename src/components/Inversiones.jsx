import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { money, percent, shortMonth } from '../lib/format'
import { CRYPTO, monthlyPrices, simulateAsset, simulateRate } from '../lib/market'
import ChartTooltip from './ChartTooltip'

// Rates are starting points the user is expected to adjust to what their bank or platform offers today.
const FIXED = [
  { key: 'PF', label: 'Plazo fijo bancario', rate: 0.3, kind: 'tna', rateLabel: 'TNA' },
  { key: 'CR', label: 'Cuenta remunerada (billeteras virtuales)', rate: 0.28, kind: 'tna', rateLabel: 'TNA' },
  { key: 'EARN', label: 'USDT en Binance Earn', rate: 0.05, kind: 'tea', rateLabel: 'TEA' },
]

// Fixed categorical order; color follows the product, never its rank.
const COLORS = { BTC: 'var(--s1)', ETH: 'var(--s2)', BNB: 'var(--s3)', PF: 'var(--s4)', CR: 'var(--s5)', EARN: 'var(--s6)' }

const TERMS = [6, 12, 24, 36]

export default function Inversiones({ currency }) {
  const [initial, setInitial] = useState(100000)
  const [monthly, setMonthly] = useState(0)
  const [months, setMonths] = useState(12)
  const [rates, setRates] = useState(() => Object.fromEntries(FIXED.map((f) => [f.key, f.rate * 100])))
  const [enabled, setEnabled] = useState(() => Object.fromEntries([...CRYPTO, ...FIXED].map((p) => [p.key, true])))
  const [fetched, setFetched] = useState({ months: null, prices: {} })
  const prices = useMemo(() => (fetched.months === months ? fetched.prices : {}), [fetched, months])
  const status = fetched.months !== months ? 'loading' : Object.keys(prices).length ? 'ok' : 'error'

  useEffect(() => {
    let cancelled = false
    Promise.allSettled(CRYPTO.map((c) => monthlyPrices(c.symbol, months))).then((results) => {
      if (cancelled) return
      const next = {}
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[CRYPTO[i].key] = r.value
      })
      setFetched({ months, prices: next })
    })
    return () => {
      cancelled = true
    }
  }, [months])

  const products = useMemo(() => {
    const list = CRYPTO.filter((c) => prices[c.key]).map((c) => ({ ...c, values: simulateAsset(prices[c.key], initial, monthly), months: prices[c.key].map((p) => p.month) }))
    const count = list[0]?.values.length ?? months
    const monthKeys = list[0]?.months ?? fallbackMonths(count)
    for (const f of FIXED) {
      list.push({ ...f, values: simulateRate(count, initial, monthly, (rates[f.key] || 0) / 100, f.kind), months: monthKeys })
    }
    return list
  }, [prices, initial, monthly, rates, months])

  const monthKeys = products[0]?.months ?? []
  const contributed = monthKeys.map((_, i) => initial + monthly * i)
  const data = monthKeys.map((month, i) => {
    const row = { month, aportado: contributed[i] }
    for (const p of products) if (enabled[p.key]) row[p.key] = Math.round(p.values[i] ?? 0)
    return row
  })

  const finalContributed = contributed.at(-1) ?? initial
  const ranking = products
    .map((p) => ({ ...p, final: p.values.at(-1) ?? 0 }))
    .map((p) => ({ ...p, gain: finalContributed ? p.final / finalContributed - 1 : 0 }))
    .sort((a, b) => b.final - a.final)

  return (
    <div className="section-grid invest">
      <form className="panel entry" onSubmit={(e) => e.preventDefault()}>
        <h2>Simular una inversión</h2>
        <label className="field">
          <span>Monto inicial</span>
          <input inputMode="decimal" value={initial} onChange={(e) => setInitial(Number(e.target.value) || 0)} />
        </label>
        <label className="field">
          <span>Aporte mensual</span>
          <input inputMode="decimal" value={monthly} onChange={(e) => setMonthly(Number(e.target.value) || 0)} />
        </label>
        <fieldset className="field">
          <legend>Si hubieras empezado hace</legend>
          <div className="segmented small">
            {TERMS.map((t) => (
              <button key={t} type="button" className={`seg ${months === t ? 'on' : ''}`} aria-pressed={months === t} onClick={() => setMonths(t)}>
                {t} meses
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field rates">
          <legend>Tasas anuales (ajustalas a las de hoy)</legend>
          {FIXED.map((f) => (
            <label key={f.key} className="rate-row">
              <span>{f.label}</span>
              <span className="rate-input">
                <input inputMode="decimal" value={rates[f.key]} onChange={(e) => setRates((r) => ({ ...r, [f.key]: Number(e.target.value.replace(',', '.')) || 0 }))} aria-label={`${f.rateLabel} de ${f.label}`} />
                % {f.rateLabel}
              </span>
            </label>
          ))}
        </fieldset>
      </form>

      <section className="panel summary" aria-labelledby="inv-titulo">
        <h2 id="inv-titulo">¿Cuánto tendrías hoy?</h2>
        <p className="balance-line small">
          Aportando {money(finalContributed, currency)} en {months} meses, la mejor opción habría sido{' '}
          <strong>{ranking[0]?.label}</strong> con {money(ranking[0]?.final, currency)}.
        </p>

        {status === 'loading' && <p className="note">Consultando precios en Binance…</p>}
        {status === 'error' && (
          <p className="note warn" role="status">
            No se pudieron obtener los precios de Binance (revisá tu conexión). Se muestran solo las opciones de tasa fija.
          </p>
        )}

        <div className="chart-legend" role="group" aria-label="Opciones a comparar">
          {products.map((p) => (
            <label key={p.key} className={`toggle ${enabled[p.key] ? '' : 'off'}`}>
              <input type="checkbox" checked={enabled[p.key]} onChange={() => setEnabled((s) => ({ ...s, [p.key]: !s[p.key] }))} />
              <i className="swatch line" style={{ background: COLORS[p.key] }} />
              {p.label}
            </label>
          ))}
          <span className="toggle static"><i className="swatch line dashed" />Lo que aportaste</span>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} minTickGap={16} />
            <YAxis tickFormatter={(v) => money(v, currency, true)} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={72} domain={['auto', 'auto']} />
            <Tooltip content={<ChartTooltip currency={currency} labelFormatter={shortMonth} />} cursor={{ stroke: 'var(--axis)' }} />
            <Line dataKey="aportado" name="Lo que aportaste" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            {products.filter((p) => enabled[p.key]).map((p) => (
              <Line key={p.key} dataKey={p.key} name={p.label} stroke={COLORS[p.key]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>

        <p className="note">
          Las criptomonedas usan precios mensuales reales de Binance (en dólares, contra USDT). Las tasas fijas son nominales en la moneda de la
          inversión y no descuentan inflación ni devaluación. Rendimientos pasados no garantizan resultados futuros; esto es una consulta, no una
          recomendación.
        </p>
      </section>

      <section className="panel list" aria-labelledby="inv-tabla">
        <h2 id="inv-tabla">Resultado por opción</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Opción</th>
                <th scope="col" className="num">Valor final</th>
                <th scope="col" className="num">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p) => (
                <tr key={p.key}>
                  <td><i className="swatch line" style={{ background: COLORS[p.key] }} />{p.label}</td>
                  <td className="num">{money(p.final, currency)}</td>
                  <td className={`num ${p.gain >= 0 ? 'pos' : 'neg'}`}>{percent(p.gain)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function fallbackMonths(count) {
  const out = []
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - (count - 1))
  for (let i = 0; i < count; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

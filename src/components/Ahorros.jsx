import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { money, shortMonth, todayISO, uid } from '../lib/format'
import { savingToMovement } from '../lib/periods'
import ChartTooltip from './ChartTooltip'

export default function Ahorros({ movements, setMovements, currency, goal, setGoal }) {
  const [kind, setKind] = useState('deposito')
  const [date, setDate] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  // Savings are the movements of type "ahorro", whichever tab they were entered from.
  const sorted = useMemo(
    () =>
      movements
        .filter((m) => m.type === 'ahorro')
        .map((m) => ({ id: m.id, date: m.date, amount: m.amount, note: m.description || m.category, currency: m.currency }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [movements],
  )
  const total = sorted.reduce((sum, s) => sum + s.amount, 0)

  // One bar per month (net movement) and the running total as a line, both in the same currency.
  const chartData = useMemo(() => {
    const byMonth = new Map()
    for (const s of sorted) {
      const key = s.date.slice(0, 7)
      byMonth.set(key, (byMonth.get(key) ?? 0) + s.amount)
    }
    let running = 0
    return [...byMonth.entries()].map(([month, net]) => {
      running += net
      return { month, net, total: running, color: net >= 0 ? 'var(--income)' : 'var(--expense)' }
    })
  }, [sorted])

  function submit(e) {
    e.preventDefault()
    const value = Number(String(amount).replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setError('Ingresá un monto mayor a cero.')
      return
    }
    const saving = { id: uid(), date, amount: kind === 'retiro' ? -value : value, note: note.trim() }
    setMovements((list) => [...list, savingToMovement(saving, currency)])
    setAmount('')
    setNote('')
    setError('')
  }

  const progress = goal > 0 ? Math.max(0, Math.min(1, total / goal)) : null

  return (
    <div className="section-grid">
      <form className="panel entry" onSubmit={submit}>
        <h2>Registrar ahorro</h2>
        <div className="segmented" role="radiogroup" aria-label="Tipo">
          {[['deposito', 'Ahorré'], ['retiro', 'Retiré']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={kind === v}
              className={`seg ${kind === v ? `on ${v === 'deposito' ? 'ingreso' : 'gasto'}` : ''}`}
              onClick={() => setKind(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span>Monto</span>
          <input inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(error)} />
        </label>
        <label className="field">
          <span>Nota (opcional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: aguinaldo" />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" type="submit">{kind === 'retiro' ? 'Registrar retiro' : 'Registrar ahorro'}</button>

        <label className="field goal">
          <span>Meta de ahorro (opcional)</span>
          <input inputMode="decimal" placeholder="Ej.: 1000000" value={goal || ''} onChange={(e) => setGoal(Number(e.target.value.replace(',', '.')) || 0)} />
        </label>
      </form>

      <section className="panel summary" aria-labelledby="ahorro-titulo">
        <h2 id="ahorro-titulo">Tu ahorro acumulado</h2>
        <p className="balance-line">
          {sorted.length === 0 ? (
            <>Todavía no registraste ahorros. Cada monto que cargues se suma acá.</>
          ) : (
            <>Llevás ahorrado <strong className={total < 0 ? 'neg' : ''}>{money(total, currency)}</strong></>
          )}
        </p>

        {progress !== null && (
          <div className="goal-meter" role="meter" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.max(0, total)} aria-label="Avance hacia la meta">
            <div className="goal-track"><i style={{ width: `${progress * 100}%` }} /></div>
            <p>{Math.round(progress * 100)}% de tu meta de {money(goal, currency)}</p>
          </div>
        )}

        {chartData.length > 0 && (
          <>
            <div className="chart-legend">
              <span><i className="swatch" style={{ background: 'var(--income)' }} />Mes positivo</span>
              <span><i className="swatch" style={{ background: 'var(--expense)' }} />Mes negativo</span>
              <span><i className="swatch line" style={{ background: 'var(--ink)' }} />Total acumulado</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--grid)" />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                <YAxis tickFormatter={(v) => money(v, currency, true)} tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
                <ReferenceLine y={0} stroke="var(--axis)" />
                <Tooltip content={<ChartTooltip currency={currency} labelFormatter={shortMonth} />} cursor={{ fill: 'var(--hover)' }} />
                <Bar dataKey="net" name="Movimiento del mes" maxBarSize={28} radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {chartData.map((d) => (
                    <Cell key={d.month} fill={d.color} />
                  ))}
                </Bar>
                <Line dataKey="total" name="Total acumulado" stroke="var(--ink)" strokeWidth={2} dot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </section>

      <section className="panel list" aria-labelledby="ahorro-lista">
        <h2 id="ahorro-lista">Historial</h2>
        {sorted.length === 0 ? (
          <p className="empty">Sin registros.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Nota</th>
                  <th scope="col" className="num">Monto</th>
                  <th scope="col" className="num">Acumulado</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted
                  .map((s, i) => ({ ...s, running: sorted.slice(0, i + 1).reduce((a, b) => a + b.amount, 0) }))
                  .reverse()
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.date}</td>
                      <td className="desc">
                        {s.note || '—'}
                      </td>
                      <td className={`num ${s.amount >= 0 ? 'pos' : 'neg'}`}>{s.amount >= 0 ? '+' : '−'}{money(Math.abs(s.amount), s.currency ?? currency)}</td>
                      <td className="num">{money(s.running, currency)}</td>
                      <td>
                        <button className="ghost" type="button" onClick={() => setMovements((l) => l.filter((x) => x.id !== s.id))} aria-label={`Borrar registro del ${s.date}`}>
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

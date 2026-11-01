import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { money, periodLabel, todayISO, uid } from '../lib/format'
import { inPeriod, totals, byCategory, signedAmount, TYPES } from '../lib/periods'
import ChartTooltip from './ChartTooltip'

const CATEGORIES = {
  ingreso: ['Sueldo', 'Freelance', 'Ventas', 'Alquileres', 'Otros'],
  gasto: ['Supermercado', 'Alquiler', 'Servicios', 'Transporte', 'Salud', 'Ocio', 'Educación', 'Otros'],
}

// Savings are entered in the Ahorros tab; savings and investment rows can also arrive from an uploaded Excel.
const FORM_TYPES = ['ingreso', 'gasto']

// Where the income went; order fixed so each slice keeps its color.
const SLICES = [
  ['gastos', 'Gastos', 'var(--expense)'],
  ['ahorros', 'Ahorros', 'var(--saving)'],
  ['inversiones', 'Inversiones', 'var(--investing)'],
]

const emptyForm = () => ({
  type: 'gasto',
  date: todayISO(),
  amount: '',
  category: '',
  description: '',
})

export default function Movimientos({ movements, setMovements, currency }) {
  const [form, setForm] = useState(emptyForm)
  const [mode, setMode] = useState('mes')
  const [values, setValues] = useState({ dia: todayISO(), mes: todayISO().slice(0, 7), anio: todayISO().slice(0, 4) })
  const [error, setError] = useState('')

  const value = values[mode]
  const visible = useMemo(
    () => movements.filter((m) => inPeriod(m, mode, value)).sort((a, b) => b.date.localeCompare(a.date)),
    [movements, mode, value],
  )
  const t = totals(visible)
  const { ingresos, gastos, saldo } = t
  const gastosPorCategoria = byCategory(visible, 'gasto')

  function update(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  function submit(e) {
    e.preventDefault()
    const amount = Number(String(form.amount).replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresá un monto mayor a cero.')
      return
    }
    const date = form.date
    if (!date || date.length !== 10) {
      setError('Elegí una fecha.')
      return
    }
    setMovements((list) => [
      ...list,
      {
        id: uid(),
        type: form.type,
        frequency: 'dia',
        date,
        amount,
        category: form.category || 'Otros',
        description: form.description.trim(),
        currency,
      },
    ])
    setError('')
    setForm((f) => ({ ...emptyForm(), type: f.type, date: f.date }))
  }

  function remove(id) {
    setMovements((list) => list.filter((m) => m.id !== id))
  }

  const pieData = [
    ...SLICES.map(([key, name, color]) => ({ name, value: t[key], color })),
    { name: 'Disponible', value: Math.max(0, saldo), color: 'var(--income)' },
  ].filter((d) => d.value > 0)
  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="section-grid">
      <form className="panel entry" onSubmit={submit}>
        <h2>Cargar movimiento</h2>

        <div className="segmented" role="radiogroup" aria-label="Tipo de movimiento">
          {FORM_TYPES.map((v) => [v, TYPES[v].label]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={form.type === v}
              className={`seg ${form.type === v ? `on ${v}` : ''}`}
              onClick={() => setForm((f) => ({ ...f, type: v, category: '' }))}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Fecha</span>
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
        </label>

        <label className="field">
          <span>Monto</span>
          <input
            inputMode="decimal"
            placeholder="0"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>

        <label className="field">
          <span>Categoría</span>
          <select value={form.category} onChange={(e) => update('category', e.target.value)}>
            <option value="">Elegí una</option>
            {CATEGORIES[form.type].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Descripción (opcional)</span>
          <input value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Ej.: compra semanal" />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary" type="submit">
          Agregar {TYPES[form.type].label.toLowerCase()}
        </button>
      </form>

      <section className="panel summary" aria-labelledby="resumen-titulo">
        <div className="period-bar">
          <h2 id="resumen-titulo">Resumen</h2>
          <div className="segmented small" role="radiogroup" aria-label="Ver por">
            {[['dia', 'Día'], ['mes', 'Mes'], ['anio', 'Año']].map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={mode === v} className={`seg ${mode === v ? 'on' : ''}`} onClick={() => setMode(v)}>
                {label}
              </button>
            ))}
          </div>
          <PeriodInput mode={mode} value={value} onChange={(v) => setValues((s) => ({ ...s, [mode]: v }))} />
        </div>

        <p className="balance-line">
          {visible.length === 0 ? (
            <>No hay movimientos para {periodLabel(mode, value)}. Cargá uno con el formulario.</>
          ) : saldo >= 0 ? (
            <>En {periodLabel(mode, value)} te quedaron <strong>{money(saldo, currency)}</strong> disponibles</>
          ) : (
            <>En {periodLabel(mode, value)} usaste <strong className="neg">{money(-saldo, currency)}</strong> más de lo que ingresó</>
          )}
        </p>

        <div className="pie-row">
          <div className="pie-wrap" aria-hidden={pieData.length === 0}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={pieData.length > 1 ? 1.5 : 0}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    cornerRadius={4}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={currency} total={pieTotal} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="pie-empty" />
            )}
            <div className="pie-center">
              <span>Disponible</span>
              <b className={saldo < 0 ? 'neg' : ''}>{money(saldo, currency, Math.abs(saldo) >= 1e6)}</b>
            </div>
          </div>

          <dl className="legend-figures">
            <div className="total-row">
              <dt>Ingresos</dt>
              <dd>{money(ingresos, currency)}</dd>
            </div>
            {SLICES.map(([key, name, color]) => (
              <div key={key}>
                <dt><i className="swatch" style={{ background: color }} />{name}</dt>
                <dd>{money(t[key], currency)}</dd>
              </div>
            ))}
            <div>
              <dt><i className="swatch" style={{ background: 'var(--income)' }} />Disponible</dt>
              <dd className={saldo < 0 ? 'neg' : ''}>{money(saldo, currency)}</dd>
            </div>
            {ingresos > 0 && (
              <div className="muted-row">
                <dt>Ahorraste o invertiste el</dt>
                <dd>{Math.round(((t.ahorros + t.inversiones) / ingresos) * 100)}% de tus ingresos</dd>
              </div>
            )}
          </dl>
        </div>

        {gastosPorCategoria.length > 0 && (
          <div className="categories">
            <h3>Gastos por categoría</h3>
            <ul>
              {gastosPorCategoria.map((c) => (
                <li key={c.category}>
                  <span>{c.category}</span>
                  <span className="cat-bar"><i style={{ width: `${(c.amount / gastos) * 100}%` }} /></span>
                  <span className="num">{money(c.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="panel list" aria-labelledby="lista-titulo">
        <h2 id="lista-titulo">Movimientos de {periodLabel(mode, value).replace(/^el /, '')}</h2>
        {visible.length === 0 ? (
          <p className="empty">Todavía no cargaste nada en este período.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Descripción</th>
                  <th scope="col" className="num">Monto</th>
                  <th scope="col"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id}>
                    <td>{m.frequency === 'mes' ? `${m.date.slice(0, 7)} (mensual)` : m.date}</td>
                    <td><span className={`type-tag ${m.type}`}>{TYPES[m.type]?.label}</span></td>
                    <td>{m.category}</td>
                    <td className="desc">{m.description || '—'}</td>
                    <td className={`num ${m.type === 'ingreso' ? 'pos' : m.type === 'gasto' ? 'neg' : ''}`}>
                      {signedAmount(m) >= 0 ? '+' : '−'}{money(Math.abs(m.amount), m.currency ?? currency)}
                    </td>
                    <td>
                      <button className="ghost" type="button" onClick={() => remove(m.id)} aria-label={`Borrar ${m.category} ${money(m.amount, currency)}`}>
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

function PeriodInput({ mode, value, onChange }) {
  if (mode === 'dia') return <input className="period-input" type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Día" />
  if (mode === 'mes') return <input className="period-input" type="month" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Mes" />
  return (
    <input
      className="period-input year"
      type="number"
      min="2000"
      max="2100"
      value={value}
      onChange={(e) => e.target.value.length === 4 && onChange(e.target.value)}
      aria-label="Año"
    />
  )
}

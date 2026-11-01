import { money } from '../lib/format'

// Shared tooltip: text stays in ink colors, a swatch carries the series identity.
export default function ChartTooltip({ active, payload, label, currency, total, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label !== undefined && <div className="tt-label">{labelFormatter ? labelFormatter(label) : label}</div>}
      {payload.map((p) => (
        <div className="tt-row" key={p.dataKey ?? p.name}>
          <i className="swatch" style={{ background: p.payload?.color ?? p.color ?? p.stroke }} />
          <span>{p.name}</span>
          <b>
            {money(p.value, currency)}
            {total ? ` · ${Math.round((p.value / total) * 100)}%` : ''}
          </b>
        </div>
      ))}
    </div>
  )
}

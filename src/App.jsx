import { useEffect, useRef, useState } from 'react'
import Movimientos from './components/Movimientos'
import Ahorros from './components/Ahorros'
import Inversiones from './components/Inversiones'
import { exportWorkbook, importWorkbook } from './lib/excel'
import { CURRENCIES } from './lib/format'
import { savingToMovement } from './lib/periods'

const TABS = [
  ['movimientos', 'Ingresos y gastos'],
  ['ahorros', 'Ahorros'],
  ['inversiones', 'Inversiones'],
]

const STORAGE_KEY = 'finanzas-v1'

// Browser storage is only a convenience between reloads; the Excel file is the real way to keep data.
function loadStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

const stored = loadStored()

export default function App() {
  const [tab, setTab] = useState('movimientos')
  // Older saves kept savings in their own list and had no currency per movement.
  const [movements, setMovements] = useState(() =>
    [...(stored.movements ?? []), ...(stored.savings ?? []).map((s) => savingToMovement(s))].map((m) => ({ ...m, currency: m.currency ?? stored.currency ?? 'ARS' })),
  )
  const [goal, setGoal] = useState(stored.goal ?? 0)
  const [currency, setCurrency] = useState(stored.currency ?? 'ARS')
  const [notice, setNotice] = useState(null)
  const fileInput = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ movements, goal, currency }))
    } catch {
      // Storage unavailable (private mode): the app keeps working in memory.
    }
  }, [movements, goal, currency])

  async function handleImport(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await importWorkbook(file)
      setMovements(data.movements)
      if (data.currency && CURRENCIES[data.currency]) setCurrency(data.currency)
      setNotice({ kind: 'ok', text: `Excel cargado: ${data.movements.length} movimientos.` })
    } catch (err) {
      setNotice({ kind: 'error', text: err.message || 'No se pudo leer el archivo. Verificá que sea un .xlsx descargado desde esta web.' })
    }
  }

  async function handleExport() {
    await exportWorkbook({ movements, currency })
    setNotice({ kind: 'ok', text: 'Excel descargado. Subilo la próxima vez para seguir donde dejaste.' })
  }

  function handleClear() {
    if (!window.confirm('¿Borrar todos los movimientos y ahorros cargados? Descargá el Excel antes si querés conservarlos.')) return
    setMovements([])
    setGoal(0)
    setNotice({ kind: 'ok', text: 'Datos borrados.' })
  }

  const empty = movements.length === 0
  // Totals only add up amounts in the same currency, so each view shows the selected one.
  const inCurrency = movements.filter((m) => m.currency === currency)
  const otherCurrencies = [...new Set(movements.map((m) => m.currency).filter((c) => c !== currency))]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">$</span>
          <h1>Mis cuentas</h1>
        </div>
        <div className="file-actions">
          <label className="currency">
            <span className="sr-only">Moneda</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>{c.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>Subir Excel</button>
          <input ref={fileInput} type="file" accept=".xlsx,.xls" hidden onChange={handleImport} />
          <button type="button" className="primary" onClick={handleExport} disabled={empty}>Descargar Excel</button>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Secciones">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {notice && (
        <div className={`notice ${notice.kind}`} role="status">
          <span>{notice.text}</span>
          <button type="button" className="ghost" onClick={() => setNotice(null)} aria-label="Cerrar aviso">Cerrar</button>
        </div>
      )}

      {empty && tab !== 'inversiones' && (
        <p className="intro">
          Cargá tus ingresos y gastos acá o subí el Excel que descargaste en otra visita. No hace falta crear una cuenta: los datos quedan solo en
          tu navegador y en el Excel.
        </p>
      )}

      {otherCurrencies.length > 0 && tab !== 'inversiones' && (
        <p className="intro">
          Estás viendo los movimientos en {CURRENCIES[currency].label}. También tenés movimientos en{' '}
          {otherCurrencies.map((c) => CURRENCIES[c]?.label ?? c).join(' y ')}: elegí esa moneda arriba para verlos.
        </p>
      )}

      <main id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'movimientos' && <Movimientos movements={inCurrency} setMovements={setMovements} currency={currency} />}
        {tab === 'ahorros' && <Ahorros movements={inCurrency} setMovements={setMovements} currency={currency} goal={goal} setGoal={setGoal} />}
        {tab === 'inversiones' && <Inversiones currency={currency} />}
      </main>

      <footer className="footer">
        <button type="button" className="ghost" onClick={handleClear} disabled={empty}>Borrar todos los datos</button>
      </footer>
    </div>
  )
}

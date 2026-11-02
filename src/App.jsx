import React, { useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
)

function generateDigits(count, seed) {
  let x = seed >>> 0
  const next = () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0xffffffff
  }
  const digits = []
  let current = 4
  for (let i = 0; i < count; i++) {
    current = Math.floor(next() * 10)
    digits.push(current)
  }
  return digits
}

function lastDigitOfPrice(value) {
  return Math.abs(Math.round(value * 100)) % 10
}

function analyze(digits) {
  const total = digits.length
  const freq = Array(10).fill(0)
  let even = 0
  let odd = 0

  for (const d of digits) {
    freq[d]++
    if (d % 2 === 0) even++
    else odd++
  }

  let matches = 0
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] === digits[i - 1]) matches++
  }

  let parityStreak = 0
  let parityName = null
  if (total > 0) {
    parityName = digits[total - 1] % 2 === 0 ? 'Even' : 'Odd'
    for (let i = total - 1; i >= 0 && (digits[i] % 2 === 0) === (parityName === 'Even'); i--) {
      parityStreak++
    }
  }

  let digitRun = 0
  if (total > 0) {
    const last = digits[total - 1]
    for (let i = total - 1; i >= 0 && digits[i] === last; i--) digitRun++
  }

  let longestEven = 0
  let longestOdd = 0
  let run = 0
  let runParity = null
  for (const d of digits) {
    const p = d % 2
    if (p === runParity) run++
    else {
      runParity = p
      run = 1
    }
    if (p === 0) longestEven = Math.max(longestEven, run)
    else longestOdd = Math.max(longestOdd, run)
  }

  return {
    total,
    even,
    odd,
    evenPct: total ? (even / total) * 100 : 0,
    oddPct: total ? (odd / total) * 100 : 0,
    freq,
    matches,
    matchPct: total > 1 ? (matches / (total - 1)) * 100 : 0,
    parityName,
    parityStreak,
    digitRun,
    lastDigit: total ? digits[total - 1] : null,
    longestEven,
    longestOdd,
  }
}

function parseImported(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const values = []
  for (const line of lines) {
    const fields = line.split(/[,;\t]+/).map((f) => f.replace(/[^0-9.+-]/g, ''))
    for (let i = fields.length - 1; i >= 0; i--) {
      const parsed = Number(fields[i])
      if (fields[i] !== '' && Number.isFinite(parsed)) {
        values.push(parsed)
        break
      }
    }
  }
  if (values.length < 10) {
    throw new Error('Need at least 10 numeric values or digits.')
  }
  const allDigits = values.every((v) => Number.isInteger(v) && v >= 0 && v <= 9)
  return allDigits ? values : values.map(lastDigitOfPrice)
}

export default function App() {
  const [size, setSize] = useState(300)
  const [seed, setSeed] = useState(20261102)
  const [imported, setImported] = useState(null)
  const [source, setSource] = useState('Synthetic sample')
  const fileRef = useRef(null)

  const digits = useMemo(
    () => imported ?? generateDigits(size, seed),
    [imported, size, seed]
  )
  const stats = useMemo(() => analyze(digits), [digits])

  const sequenceData = useMemo(
    () => ({
      labels: digits.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Last digit',
          data: digits,
          borderColor: '#4f9bff',
          backgroundColor: 'rgba(79,155,255,0.18)',
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    }),
    [digits]
  )

  const frequencyData = useMemo(
    () => ({
      labels: Array.from({ length: 10 }, (_, i) => String(i)),
      datasets: [
        {
          label: 'Occurrences',
          data: stats.freq,
          backgroundColor: stats.freq.map((_, d) =>
            d % 2 === 0 ? 'rgba(79,155,255,0.55)' : 'rgba(245,158,11,0.55)'
          ),
          borderColor: stats.freq.map((_, d) =>
            d % 2 === 0 ? '#8bb8ff' : '#f7c76b'
          ),
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [stats.freq]
  )

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: { ticks: { color: '#9aa2c3', maxTicksLimit: 12 }, grid: { color: 'rgba(154,162,195,0.08)' } },
      y: { ticks: { color: '#9aa2c3', stepSize: 1 }, grid: { color: 'rgba(154,162,195,0.08)' }, suggestedMin: 0, suggestedMax: 9 },
    },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: { ticks: { color: '#9aa2c3' }, grid: { display: false } },
      y: { ticks: { color: '#9aa2c3' }, grid: { color: 'rgba(154,162,195,0.08)' }, beginAtZero: true },
    },
    plugins: {
      legend: { display: false },
    },
  }

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseImported(String(reader.result ?? ''))
        setImported(parsed.slice(-5000))
        setSource(`Imported: ${file.name}`)
      } catch (error) {
        window.alert(error.message)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  function useSynthetic() {
    setImported(null)
    setSource('Synthetic sample')
    setSeed((s) => s + 1)
  }

  const recent = digits.slice(-40)

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="dot" />
          <div>
            <div>Blueprint Analytics</div>
            <div className="brand-sub">Personal historical digit statistics</div>
          </div>
        </div>
        <div className="controls">
          <span className="muted">{source}</span>
          <label className="control-label">
            Sample
            <select
              value={imported ? 'imported' : size}
              onChange={(e) => {
                if (e.target.value === 'imported') return
                setImported(null)
                setSize(Number(e.target.value))
                setSource('Synthetic sample')
              }}
              disabled={Boolean(imported)}
            >
              {[50, 100, 300, 500, 1000].map((n) => (
                <option key={n} value={n}>Last {n}</option>
              ))}
              {imported && <option value="imported">Imported</option>}
            </select>
          </label>
          <button onClick={() => fileRef.current?.click()}>Import CSV</button>
          <button onClick={useSynthetic}>Reset demo</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={handleFile} />
        </div>
      </header>

      <main>
        <aside className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Parity summary</div>
              <div className="panel-sub">Even vs odd distribution</div>
            </div>
            <span className="badge">n={stats.total}</span>
          </div>

          <div className="stats">
            <div className="stat">
              <span className="stat-label">Even</span>
              <span className="stat-value">{stats.even}</span>
              <span className="stat-delta">{stats.evenPct.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Odd</span>
              <span className="stat-value">{stats.odd}</span>
              <span className="stat-delta">{stats.oddPct.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Matches</span>
              <span className="stat-value">{stats.matches}</span>
              <span className="stat-delta">{stats.matchPct.toFixed(1)}% of transitions</span>
            </div>
            <div className="stat">
              <span className="stat-label">Most frequent</span>
              <span className="stat-value">{stats.freq.indexOf(Math.max(...stats.freq))}</span>
              <span className="stat-delta">{Math.max(...stats.freq)} occurrences</span>
            </div>
          </div>

          <div className="list">
            <div className="item">
              <span className="item-label">Current parity run</span>
              <span className="item-value">{stats.parityName ?? '—'} × {stats.parityStreak}</span>
            </div>
            <div className="item">
              <span className="item-label">Current identical run</span>
              <span className="item-value">digit {stats.lastDigit ?? '—'} × {stats.digitRun}</span>
            </div>
            <div className="item">
              <span className="item-label">Longest even run</span>
              <span className="item-value">{stats.longestEven}</span>
            </div>
            <div className="item">
              <span className="item-label">Longest odd run</span>
              <span className="item-value">{stats.longestOdd}</span>
            </div>
          </div>

          <div className="footer-note">Historical only. Independent random outcomes are not predictable.</div>
        </aside>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Digit sequence</div>
              <div className="panel-sub">Last digit per sample</div>
            </div>
            <span className="badge">{digits.length} samples</span>
          </div>
          <div className="chart-wrap">
            <Line data={sequenceData} options={lineOptions} />
          </div>

          <div className="panel-header">
            <div>
              <div className="panel-title">Digit frequency</div>
              <div className="panel-sub">Blue = even, amber = odd</div>
            </div>
          </div>
          <div className="chart-wrap">
            <Bar data={frequencyData} options={barOptions} />
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Digit table</div>
              <div className="panel-sub">Counts and percentages</div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Digit</th>
                <th>Count</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {stats.freq.map((count, d) => (
                <tr key={d}>
                  <td>{d}</td>
                  <td>{count}</td>
                  <td>{stats.total ? ((count / stats.total) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="panel-header">
            <div>
              <div className="panel-title">Recent digits</div>
              <div className="panel-sub">Latest 40</div>
            </div>
          </div>
          <div className="digits-strip">
            {recent.map((d, i) => (
              <span key={i} className={`d-chip ${d % 2 === 0 ? 'even' : 'odd'}`}>{d}</span>
            ))}
          </div>

          <div className="footer-note">
            Import a CSV of digits (0–9) or prices; prices are reduced to their last two-decimal digit.
          </div>
        </aside>
      </main>
    </div>
  )
}

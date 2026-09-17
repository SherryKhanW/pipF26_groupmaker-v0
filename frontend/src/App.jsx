import { useEffect, useState } from 'react'
import Survey from './Survey.jsx'

export default function App() {
  const [roster, setRoster] = useState(null)
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [groupSize, setGroupSize] = useState(4)
  const [view, setView] = useState('home')

  useEffect(() => {
    fetch('/api/roster')
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`)
        return res.json()
      })
      .then(setRoster)
      .catch((err) => setError(err.message))
  }, [])

  async function randomize() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/groups/randomize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_size: groupSize }),
      })
      if (!res.ok) throw new Error(`Backend responded ${res.status}`)
      const data = await res.json()
      setGroups(data.groups)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (view === 'survey') {
    return <Survey onBack={() => setView('home')} />
  }

  if (error) {
    return (
      <main className="page">
        <h1>GroupMaker</h1>
        <p className="error">
          Could not reach the backend: {error}. Is <code>python app.py</code> running?
        </p>
      </main>
    )
  }

  if (!roster) {
    return (
      <main className="page">
        <h1>GroupMaker</h1>
        <p>Loading roster…</p>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>GroupMaker</h1>
      <p className="subtitle">{roster.course}</p>
      <button type="button" className="nav-link" onClick={() => setView('survey')}>
        Survey
      </button>

      <div className="controls">
        <label htmlFor="group-size">
          Group size
          <input
            id="group-size"
            type="number"
            min={2}
            max={10}
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
          />
        </label>
        <button className="randomize" onClick={randomize} disabled={loading}>
          {loading ? 'Randomizing…' : 'Randomize Groups'}
        </button>
      </div>

      {groups ? (
        <section className="groups">
          {groups.map((g) => (
            <div className="card" key={g.number}>
              <h2>Group {g.number}</h2>
              <ul>
                {g.members.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section>
          <h2>Roster ({roster.students.length})</h2>
          <ul className="roster">
            {roster.students.map((s) => (
              <li key={s.id}>{s.name}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

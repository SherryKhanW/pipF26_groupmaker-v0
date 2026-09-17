import { useEffect, useState } from 'react'

const SCHOOL_YEARS = ['First-year', 'Sophomore', 'Junior', 'Senior', 'Other']
const MAJORS = [
  'Finance',
  'Marketing',
  'Information Systems',
  'Economics',
  'Computer Science',
  'Undeclared',
  'Other',
]
const PROFICIENCY = ['1', '2', '3', '4', '5']

const FIELD_LABELS = {
  name: 'What is your name?',
  school_year: 'What year are you in?',
  major: 'What is your major?',
  python_proficiency: 'What is your proficiency in Python?',
}

const EMPTY = {
  name: '',
  school_year: '',
  major: '',
  python_proficiency: '',
}

export default function Survey({ onBack }) {
  const [roster, setRoster] = useState(null)
  const [answers, setAnswers] = useState(EMPTY)
  const [missing, setMissing] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch('/api/roster')
      .then((res) => {
        if (!res.ok) throw new Error(`Backend responded ${res.status}`)
        return res.json()
      })
      .then(setRoster)
      .catch((err) => setError(err.message))
  }, [])

  function update(field, value) {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    const blank = Object.keys(FIELD_LABELS).filter((key) => !String(answers[key]).trim())
    if (blank.length) {
      setMissing(blank)
      setError(null)
      return
    }

    setMissing([])
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...answers,
          python_proficiency: Number(answers.python_proficiency),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Backend responded ${res.status}`)
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <h1>GroupMaker</h1>
      <p className="subtitle">Student survey</p>
      <button type="button" className="nav-link" onClick={onBack}>
        ← Back to groups
      </button>

      {submitted ? (
        <p className="confirm">Thanks — your responses were saved.</p>
      ) : !roster && !error ? (
        <p>Loading roster…</p>
      ) : (
        <form className="survey" onSubmit={submit}>
          <label>
            {FIELD_LABELS.name}
            <select
              value={answers.name}
              onChange={(e) => update('name', e.target.value)}
            >
              <option value="">Select your name</option>
              {roster?.students.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {FIELD_LABELS.school_year}
            <select
              value={answers.school_year}
              onChange={(e) => update('school_year', e.target.value)}
            >
              <option value="">Select year</option>
              {SCHOOL_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label>
            {FIELD_LABELS.major}
            <select value={answers.major} onChange={(e) => update('major', e.target.value)}>
              <option value="">Select major</option>
              {MAJORS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>{FIELD_LABELS.python_proficiency}</legend>
            <div className="scale">
              {PROFICIENCY.map((n) => (
                <label key={n} className="scale-option">
                  <input
                    type="radio"
                    name="python_proficiency"
                    value={n}
                    checked={answers.python_proficiency === n}
                    onChange={(e) => update('python_proficiency', e.target.value)}
                  />
                  {n}
                </label>
              ))}
            </div>
            <p className="hint">1 = beginner, 5 = advanced</p>
          </fieldset>

          {missing.length > 0 && (
            <p className="error">
              Please fill in: {missing.map((key) => FIELD_LABELS[key]).join(', ')}
            </p>
          )}
          {error && <p className="error">Could not save: {error}</p>}

          <button className="randomize" type="submit" disabled={loading || !roster}>
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      )}
    </main>
  )
}

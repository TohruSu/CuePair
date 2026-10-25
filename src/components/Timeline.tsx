import { useEffect, useState } from 'react'
import type { ComparisonGroup } from '../lib/alignment'
import { formatTime, parseSeekTime } from '../lib/srt'
import { Icon } from './Icon'

export function Timeline({ start, end, time, groups, active, onSeek }: {
  start: number; end: number; time: number; groups: ComparisonGroup[]; active: ComparisonGroup[]; onSeek: (time: number) => void
}) {
  const [entry, setEntry] = useState(formatTime(time))
  const [error, setError] = useState('')
  useEffect(() => { setEntry(formatTime(time)); setError('') }, [time, start, end, groups])
  const showGroup = () => {
    const element = document.getElementById(active[0]?.id ?? '')
    element?.scrollIntoView({ block: 'center', behavior: 'instant' })
    element?.focus({ preventScroll: true })
  }
  const firstIndex = active[0] ? groups.indexOf(active[0]) + 1 : 0
  return <section className="timeline-panel" aria-labelledby="timeline-heading">
    <div className="timeline-top">
      <div><h2 id="timeline-heading">Shared timeline</h2><p>Move through both tracks together.</p></div>
      <form className="seek-form" onSubmit={(event) => {
        event.preventDefault()
        const next = parseSeekTime(entry)
        if (next === null) { setError('Use HH:MM:SS.mmm, for example 00:00:05.500.'); return }
        if (next < start || next > end) { setError(`Enter a time between ${formatTime(start)} and ${formatTime(end)}.`); return }
        onSeek(next)
        setError('')
      }}>
        <label htmlFor="seek-time" className="sr-only">Jump to time</label>
        <input id="seek-time" value={entry} onChange={(event) => setEntry(event.target.value)} spellCheck={false} autoComplete="off" aria-invalid={!!error} aria-describedby={error ? 'seek-error' : undefined} />
        <button type="submit">Go <Icon name="arrow" size={15} /></button>
      </form>
    </div>
    {error && <p className="seek-error" id="seek-error" role="alert">{error}</p>}
    <label htmlFor="timeline" className="sr-only">Shared time</label>
    <div className="timeline-rail">
      <div className="timeline-marks" aria-hidden="true">{groups.map((group) => <span key={group.id} style={{ left: `${(group.start - start) / (end - start) * 100}%`, width: `${(group.end - group.start) / (end - start) * 100}%` }} />)}</div>
      <input id="timeline" type="range" min={start} max={end} step={1} value={time} aria-valuetext={formatTime(time)} onChange={(event) => onSeek(Number(event.target.value))} />
    </div>
    <div className="timeline-scale"><span>{formatTime(start)}</span><span>{formatTime(end)}</span></div>
    <div className="timeline-bottom">
      <p aria-live="polite">{active.length ? <><span className="playhead-dot" />{active.length > 1 ? `${active.length} groups at playhead` : `Group ${String(firstIndex).padStart(2, '0')} at playhead`}</> : time === end ? 'End of loaded tracks' : 'Between cues · no subtitle at this time'}</p>
      <button className="text-button" onClick={showGroup} disabled={!active.length}><Icon name="locate" size={16} /> Show {active.length > 1 ? 'first group' : 'group'}</button>
    </div>
  </section>
}

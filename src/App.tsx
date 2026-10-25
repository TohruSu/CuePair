import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TrackInput, type TrackData } from './components/TrackInput'
import { GroupCard } from './components/GroupCard'
import { Icon } from './components/Icon'
import { Timeline } from './components/Timeline'
import { activeGroups, compareTracks } from './lib/alignment'
import { parseSrt, readSrtFile, type TrackId } from './lib/srt'
import demoA from './demo/station-ja.srt?raw'
import demoB from './demo/station-zh.srt?raw'

type Tracks = Record<TrackId, TrackData | null>

export default function App() {
  const [tracks, setTracks] = useState<Tracks>({ A: null, B: null })
  const [errors, setErrors] = useState<Partial<Record<TrackId, string>>>({})
  const [loading, setLoading] = useState({ A: false, B: false })
  const [time, setTime] = useState(0)
  const [demo, setDemo] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const requests = useRef({ A: 0, B: 0 })
  const comparison = useMemo(() => compareTracks(tracks.A?.cues ?? [], tracks.B?.cues ?? []), [tracks])
  const { groups, timingWarnings } = comparison
  const hasBothTracks = !!tracks.A && !!tracks.B
  const start = groups[0]?.start ?? 0
  const end = groups.reduce((max, group) => Math.max(max, group.end), 0)
  const active = useMemo(() => activeGroups(groups, time), [groups, time])
  const activeIds = new Set(active.map((group) => group.id))
  const overlapping = groups.filter((group) => group.a.length && group.b.length).length
  const seek = useCallback((next: number) => setTime(next), [])
  useEffect(() => { setTime(start) }, [tracks, start])

  function loadDemo() {
    requests.current.A++
    requests.current.B++
    const a = parseSrt(demoA, 'A')
    const b = parseSrt(demoB, 'B')
    setTracks({ A: { name: 'station-ja.srt', cues: a, language: 'Japanese' }, B: { name: 'station-zh.srt', cues: b, language: 'Chinese' } })
    setTime(Math.min(a[0].start, b[0].start))
    setErrors({})
    setLoading({ A: false, B: false })
    setDemo(true)
    setAnnouncement('Demo loaded. 5 Japanese cues and 6 Chinese cues, in 5 comparison groups.')
  }

  async function importFile(id: TrackId, file: File) {
    const request = ++requests.current[id]
    setLoading((current) => ({ ...current, [id]: true }))
    setErrors((current) => ({ ...current, [id]: undefined }))
    try {
      const cues = await readSrtFile(file, id)
      if (request !== requests.current[id]) return
      // Apply to the latest state so simultaneous A/B reads cannot overwrite each other.
      setTracks((current) => ({ ...current, [id]: { name: file.name, cues } }))
      setDemo(false)
      setAnnouncement(`Track ${id} loaded: ${file.name}, ${cues.length} cues.`)
    } catch (error) {
      if (request === requests.current[id]) setErrors((current) => ({ ...current, [id]: error instanceof Error ? error.message : 'This file could not be imported.' }))
    } finally {
      if (request === requests.current[id]) setLoading((current) => ({ ...current, [id]: false }))
    }
  }

  // A successful source change starts at the earliest loaded cue. Invalid reads
  // leave this keyed reader untouched, including its timeline position.
  return <>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <header className="app-header"><div className="header-inner">
      <a className="wordmark" href="./" aria-label="CuePair home"><span className="logo"><Icon name="pair" size={25} /></span>CuePair<span className="version">v0.1</span></a>
      <span className="privacy-note"><Icon name="lock" size={14} /> Your files stay in your browser</span>
    </div></header>
    <main id="workspace">
      <div className="workspace-heading">
        <div><p className="eyebrow">A LITTLE PERSPECTIVE FOR YOUR SUBTITLES</p><h1>Two tracks, one timeline.</h1><p className="intro">Read subtitles side by side, even when the cues don’t line up.</p></div>
        <button className="demo-button" onClick={loadDemo}><Icon name="demo" size={17} /> Load demo</button>
      </div>

      <div className="source-grid">
        {(['A', 'B'] as const).map((id) => <TrackInput key={id} id={id} data={tracks[id]} error={errors[id]} loading={loading[id]} onFile={importFile} />)}
      </div>
      <p className="source-note">Two local SRT files. Any language. Up to 10,000 cues per track.</p>
      <div className="sr-only" role="status">{announcement}</div>

      {groups.length ? <>
      <section className="comparison-summary" aria-label="Comparison summary">
        <div><span className="summary-number">{groups.length}</span><span>comparison groups</span></div>
        <div><span className="summary-number purple">{overlapping}</span><span>overlapping</span></div>
        <div><span className="summary-number">{hasBothTracks ? groups.length - overlapping : '—'}</span><span>no counterpart{!hasBothTracks && ' · add a track'}</span></div>
        <div><span className={`summary-number ${timingWarnings.size ? 'amber' : ''}`}>{timingWarnings.size}</span><span>cues with timing overlaps</span></div>
      </section>
      {demo && <p className="demo-note"><span className="demo-note-label">THE DEMO</span>A short walk to the river. Group 02 splits one Japanese cue into two Chinese cues; Group 04 has timing overlaps.</p>}
      <Timeline start={start} end={end} time={time} groups={groups} active={active} onSeek={seek} />
      <section className="reading-view" aria-labelledby="reading-heading">
        <div className="reading-heading"><h2 id="reading-heading">Reading view <span>{groups.length} groups</span></h2><p>Overlap suggests a counterpart; it doesn’t verify meaning.</p></div>
        <div className="column-headings" aria-hidden="true"><span><i className="track-dot dot-a" /> Track A <span>{tracks.A?.name ?? 'Not loaded'}</span></span><span><i className="track-dot dot-b" /> Track B <span>{tracks.B?.name ?? 'Not loaded'}</span></span></div>
        <div className="group-list">{groups.map((group, index) => <GroupCard key={group.id} group={group} index={index} active={activeIds.has(group.id)} warnings={timingWarnings} hasBothTracks={hasBothTracks} onSeek={seek} />)}</div>
      </section>
      </> : <section className="empty-state">
        <div className="empty-illustration" aria-hidden="true"><span className="mini-track"><i /><i /><i /></span><span className="mini-track"><i /><i /><i /></span><span className="mini-playhead" /></div>
        <h2>A shared view starts here.</h2><p>Choose two subtitle files to see how their timing overlaps.<br />Or take a short walk through our Japanese + Chinese demo.</p>
        <button className="text-button empty-demo" onClick={loadDemo}>Try the demo <Icon name="arrow" size={16} /></button>
        <span className="empty-footnote">No uploads. No account. Just your subtitles.</span>
      </section>}
    </main>
    <footer className="app-footer"><span>CuePair <span className="footer-divider">/</span> A closer look, side by side.</span><span>Made for the space between languages.</span></footer>
  </>
}

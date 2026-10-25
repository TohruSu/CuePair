import { memo } from 'react'
import type { ComparisonGroup } from '../lib/alignment'
import type { Cue, TrackId } from '../lib/srt'
import { formatTime } from '../lib/srt'
import { Icon } from './Icon'

function CueColumn({ track, cues, warnings, hasBothTracks }: { track: TrackId; cues: Cue[]; warnings: Set<string>; hasBothTracks: boolean }) {
  return <div className={`cue-column cue-column-${track.toLowerCase()}`}>
    <span className="mobile-track-label">Track {track}</span>
    {cues.length ? cues.map((cue) => <div className="cue" key={cue.id}>
      <div className="cue-meta"><span>Cue {cue.order + 1}</span><time>{formatTime(cue.start)} <span className="time-arrow">→</span> {formatTime(cue.end)}</time></div>
      <p className="cue-text" dir="auto">{cue.text}</p>
      {warnings.has(cue.id) && <p className="timing-warning"><Icon name="warning" size={14} /> Timing overlap in Track {track}</p>}
    </div>) : <div className="no-counterpart"><span className="empty-dash" aria-hidden="true">—</span><p>{hasBothTracks ? 'No counterpart in this track' : `Import Track ${track} to compare`}</p></div>}
  </div>
}

export const GroupCard = memo(function GroupCard({ group, index, active, warnings, hasBothTracks, onSeek }: {
  group: ComparisonGroup
  index: number
  active: boolean
  warnings: Set<string>
  hasBothTracks: boolean
  onSeek: (time: number) => void
}) {
  const overlapping = group.a.length > 0 && group.b.length > 0
  return <article id={group.id} className={`comparison-group${active ? ' is-active' : ''}`} aria-label={`Group ${index + 1}`} aria-current={active ? 'true' : undefined} tabIndex={-1}>
    <div className="group-heading">
      <button className="group-seek" onClick={() => onSeek(group.start)} aria-label={`Seek to group ${index + 1}`}>
        <span className="group-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="group-time">{formatTime(group.start)} <span>–</span> {formatTime(group.end)}</span>
      </button>
      <div className="group-badges">
        {active && <span className="active-badge">At playhead</span>}
        <span className={`status-badge ${overlapping ? 'overlapping' : 'unmatched'}`}>
          {overlapping ? <><span aria-hidden="true">↔</span> Overlapping <span className="cue-ratio">{group.a.length} : {group.b.length}</span></> : hasBothTracks ? 'No counterpart' : 'Awaiting track'}
        </span>
      </div>
    </div>
    <div className="cue-columns">
      <CueColumn track="A" cues={group.a} warnings={warnings} hasBothTracks={hasBothTracks} />
      <CueColumn track="B" cues={group.b} warnings={warnings} hasBothTracks={hasBothTracks} />
    </div>
  </article>
})

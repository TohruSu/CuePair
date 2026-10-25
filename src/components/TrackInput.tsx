import type { Cue, TrackId } from '../lib/srt'
import { formatTime } from '../lib/srt'
import { Icon } from './Icon'

export interface TrackData { name: string; cues: Cue[]; language?: string }

export function TrackInput({ id, data, error, loading, onFile }: {
  id: TrackId
  data: TrackData | null
  error?: string
  loading: boolean
  onFile: (id: TrackId, file: File) => void
}) {
  const first = data ? Math.min(...data.cues.map((cue) => cue.start)) : 0
  const last = data ? Math.max(...data.cues.map((cue) => cue.end)) : 0
  return <section className={`track-input track-${id.toLowerCase()}`} aria-label={`Track ${id} source`}>
    <div className="track-heading">
      <span className="track-name"><span className="track-letter">{id}</span> Track {id}</span>
      <span className="track-detail">{data ? `${data.cues.length} cues${data.language ? ` · ${data.language}` : ''}` : 'Not loaded'}</span>
    </div>
    <div className="source-body">
      <div className="source-file-icon"><Icon name="file" size={23} /></div>
      <div className="source-description">
        <h2 title={data?.name}>{data?.name ?? `Choose your ${id === 'A' ? 'first' : 'second'} track`}</h2>
        <p>{data ? `${formatTime(first)} – ${formatTime(last)}` : 'SRT · UTF-8 · up to 2 MiB'}</p>
      </div>
    </div>
    <label className="file-button">
      <input type="file" accept=".srt" aria-label={`${data ? 'Replace' : 'Import'} Track ${id}`} aria-describedby={error ? `error-${id}` : undefined}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) onFile(id, file)
        }} />
      <span>{loading ? 'Reading file…' : data ? 'Replace file' : 'Choose .srt file'}</span>
      <Icon name="arrow" size={16} />
    </label>
    {error && <p className="import-error" id={`error-${id}`} role="alert"><Icon name="warning" size={16} /><span>{error}{data && ' Previous file is still loaded.'}</span></p>}
  </section>
}

export type TrackId = 'A' | 'B'

export interface Cue {
  id: string
  track: TrackId
  order: number
  start: number
  end: number
  text: string
}

export const MAX_FILE_BYTES = 2 * 1024 * 1024
export const MAX_CUES = 10_000

const timestamp = /^(\d{2}):([0-5]\d):([0-5]\d),(\d{3})$/

function parseTimestamp(value: string, block: number): number {
  const parts = timestamp.exec(value)
  if (!parts) {
    throw new Error(`Cue block ${block}: invalid timestamp. Use HH:MM:SS,mmm (minutes and seconds 00–59).`)
  }
  const [, hours, minutes, seconds, milliseconds] = parts
  return Number(hours) * 3_600_000 + Number(minutes) * 60_000 + Number(seconds) * 1000 + Number(milliseconds)
}

export function parseSrt(input: string, track: TrackId): Cue[] {
  if (new TextEncoder().encode(input).byteLength > MAX_FILE_BYTES) {
    throw new Error('This file exceeds the 2 MiB limit.')
  }
  const normalized = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  if (!normalized.trim()) throw new Error('This file is empty. Choose an SRT file with subtitle cues.')
  if (normalized.includes('\r')) throw new Error('Unrecognized line endings. Use LF or CRLF.')

  const blocks = normalized.split(/\n[\t ]*\n(?:[\t ]*\n)*/)
    .filter((block) => block.trim().length > 0)
  if (blocks.length > MAX_CUES) throw new Error('This file exceeds the 10,000 cue limit.')

  return blocks.map((block, order) => {
    const lines = block.split('\n')
    // Leading/trailing file whitespace is allowed; subtitle text itself is retained.
    if (order === 0) while (lines[0]?.trim() === '') lines.shift()
    if (order === blocks.length - 1) while (lines.at(-1)?.trim() === '') lines.pop()
    const timingIndex = /^\d+$/.test(lines[0]?.trim() ?? '') ? 1 : 0
    const timing = lines[timingIndex]?.trim() ?? ''
    const parts = timing.split(/\s+-->\s+/)
    if (parts.length !== 2) {
      throw new Error(`Cue block ${order + 1}: expected a timestamp line with the --> separator.`)
    }
    const start = parseTimestamp(parts[0], order + 1)
    const end = parseTimestamp(parts[1], order + 1)
    if (end <= start) throw new Error(`Cue block ${order + 1}: end time must be later than start time.`)
    const text = lines.slice(timingIndex + 1).join('\n')
    if (!text.trim()) throw new Error(`Cue block ${order + 1}: subtitle text is missing.`)
    if (lines.slice(timingIndex + 1).some((line) => /^\s*\d+:\d+:\d+.*(?:-->|->|→)/.test(line))) {
      throw new Error(`Cue block ${order + 1}: add a blank line between subtitle cues.`)
    }
    return { id: `${track}-${order}`, track, order, start, end, text }
  })
}

export function formatTime(milliseconds: number, srt = false): string {
  const ms = Math.max(0, Math.round(milliseconds))
  const hours = Math.floor(ms / 3_600_000).toString().padStart(2, '0')
  const minutes = (Math.floor(ms / 60_000) % 60).toString().padStart(2, '0')
  const seconds = (Math.floor(ms / 1000) % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}${srt ? ',' : '.'}${(ms % 1000).toString().padStart(3, '0')}`
}

export function parseSeekTime(value: string): number | null {
  const match = /^(\d{2}):([0-5]\d):([0-5]\d)[.,](\d{3})$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 3_600_000 + Number(match[2]) * 60_000 + Number(match[3]) * 1000 + Number(match[4])
}

export async function readSrtFile(file: File, track: TrackId): Promise<Cue[]> {
  if (!/\.srt$/i.test(file.name)) throw new Error('Choose a file with the .srt extension.')
  if (file.size > MAX_FILE_BYTES) throw new Error('This file exceeds the 2 MiB limit.')
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('This file could not be read. Try choosing it again.'))
    reader.onabort = () => reject(new Error('File reading was interrupted. Try choosing it again.'))
    reader.readAsArrayBuffer(file)
  })
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw new Error('This file is not valid UTF-8. Save it as UTF-8 and try again.')
  }
  return parseSrt(text, track)
}

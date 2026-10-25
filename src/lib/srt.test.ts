import { describe, expect, it } from 'vitest'
import { formatTime, MAX_CUES, MAX_FILE_BYTES, parseSeekTime, parseSrt, readSrtFile } from './srt'

const standard = '1\n00:00:01,200 --> 00:00:03,400\n朝の駅。\nA quiet station.\n\n19\n00:00:04,000 --> 00:00:05,000\n你好，世界！'

describe('SRT parsing', () => {
  it.each(['LF', 'CRLF', 'BOM'] as const)('reads %s, Unicode, multiline text, and nonconsecutive identifiers', (variant) => {
    const input = variant === 'CRLF' ? standard.replaceAll('\n', '\r\n') : variant === 'BOM' ? `\uFEFF${standard}` : standard
    const cues = parseSrt(input, 'B')
    expect(cues).toEqual([
      { id: 'B-0', track: 'B', order: 0, start: 1200, end: 3400, text: '朝の駅。\nA quiet station.' },
      { id: 'B-1', track: 'B', order: 1, start: 4000, end: 5000, text: '你好，世界！' },
    ])
  })

  it('accepts optional identifiers, separator whitespace, and blank lines at file edges', () => {
    expect(parseSrt('\n\n00:00:02,000  -->  00:00:03,000\n  Keep text spaces.  \n\n5\n00:00:01,000 --> 00:00:02,000\nSecond in source order.\n', 'A').map((cue) => [cue.order, cue.text]))
      .toEqual([[0, '  Keep text spaces.  '], [1, 'Second in source order.']])
  })

  it('keeps HTML-like content as literal subtitle text', () => {
    expect(parseSrt('00:00:00,000 --> 00:00:01,000\n<img src=x onerror=alert(1)>', 'A')[0].text).toBe('<img src=x onerror=alert(1)>')
  })

  it.each([
    ['', /empty/], ['\uFEFF \n', /empty/],
    ['1\nhello', /timestamp line/],
    ['00:00:01,000 -> 00:00:02,000\ntext', /separator/],
    ['00:00:01.000 --> 00:00:02,000\ntext', /invalid timestamp/],
    ['00:60:01,000 --> 00:61:02,000\ntext', /invalid timestamp/],
    ['00:00:60,000 --> 00:01:02,000\ntext', /invalid timestamp/],
    ['0:00:01,000 --> 00:00:02,000\ntext', /invalid timestamp/],
    ['00:00:01,00 --> 00:00:02,000\ntext', /invalid timestamp/],
    ['00:00:01,000 --> 00:00:01,000\ntext', /later than/],
    ['00:00:02,000 --> 00:00:01,000\ntext', /later than/],
    ['00:00:01,000 --> 00:00:02,000\n  ', /text is missing/],
    ['1\n00:00:01,000 --> 00:00:02,000', /text is missing/],
    ['00:00:01,000 --> 00:00:02,000\ntext\n2\n00:00:02,000 --> 00:00:03,000\nmore', /blank line/],
    ['00:00:01,000 --> 00:00:02,000\rtext', /line endings/],
  ])('rejects malformed input: %j', (input, error) => {
    expect(() => parseSrt(input, 'A')).toThrow(error)
  })

  it('rejects an invalid later block instead of silently dropping it', () => {
    expect(() => parseSrt(`${standard}\n\n3\ninvalid\ntext`, 'A')).toThrow(/Cue block 3/)
  })

  it('enforces byte and cue limits, including multibyte UTF-8 text', () => {
    expect(() => parseSrt('あ'.repeat(Math.ceil(MAX_FILE_BYTES / 3)), 'A')).toThrow(/2 MiB/)
    const block = '00:00:01,000 --> 00:00:02,000\ntext'
    expect(() => parseSrt(Array(MAX_CUES + 1).fill(block).join('\n\n'), 'A')).toThrow(/10,000/)
    expect(parseSrt(Array(MAX_CUES).fill(block).join('\n\n'), 'A')).toHaveLength(MAX_CUES)
  })

  it('reads local UTF-8 files and rejects invalid bytes, oversized files, and other extensions', async () => {
    expect(await readSrtFile(new File([`\uFEFF${standard}`], '日本語.SRT'), 'A')).toHaveLength(2)
    await expect(readSrtFile(new File([new Uint8Array([0xff, 0xfe])], 'bad.srt'), 'A')).rejects.toThrow(/UTF-8/)
    await expect(readSrtFile(new File(['x'], 'notes.txt'), 'A')).rejects.toThrow(/extension/)
    await expect(readSrtFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.srt'), 'A')).rejects.toThrow(/2 MiB/)
  })
})

describe('timeline time format', () => {
  it('round-trips integer milliseconds and supports comma or dot input', () => {
    expect(formatTime(3_723_045)).toBe('01:02:03.045')
    expect(formatTime(3_723_045, true)).toBe('01:02:03,045')
    expect(parseSeekTime('01:02:03.045')).toBe(3_723_045)
    expect(parseSeekTime('01:02:03,045')).toBe(3_723_045)
    expect(parseSeekTime('00:61:00.000')).toBeNull()
    expect(parseSeekTime('12')).toBeNull()
  })
})

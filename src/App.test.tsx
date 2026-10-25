import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import * as srt from './lib/srt'

const source = (text: string, start = '01', end = '03') => `8\n00:00:${start},000 --> 00:00:${end},000\n${text}`
const file = (name: string, text: string) => new File([text], name, { type: 'application/x-subrip' })

describe('CuePair workspace', () => {
  it('starts with an accessible empty state and loads the complete demo', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'A shared view starts here.' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Load demo' }))
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByText('5 cues · Japanese')).toBeTruthy()
    expect(screen.getByText('6 cues · Chinese')).toBeTruthy()
    const split = screen.getByRole('article', { name: 'Group 2' })
    expect(within(split).getAllByText(/Cue \d/)).toHaveLength(3)
    expect(within(split).getByText('1 : 2')).toBeTruthy()
    expect(screen.getAllByText('No counterpart in this track')).toHaveLength(2)
    expect(screen.getAllByText('Timing overlap in Track A')).toHaveLength(2)
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('1000')
  })

  it('imports the first track gracefully, adds the other, and replaces a file', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText('Import Track A'), file('first.srt', source('日本語\nSecond line')))
    expect(await screen.findByText('first.srt', { selector: 'h2' })).toBeTruthy()
    expect(screen.getByText('Import Track B to compare')).toBeTruthy()
    await user.upload(screen.getByLabelText('Import Track B'), file('second.srt', source('中文', '02', '04')))
    expect(await screen.findByText('中文')).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    await user.upload(screen.getByLabelText('Replace Track A'), file('replacement.srt', source('Replacement', '09', '10')))
    expect(await screen.findByText('Replacement')).toBeTruthy()
    expect(screen.queryByText('日本語', { exact: false })).toBeNull()
    expect(screen.getByText('中文')).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await waitFor(() => {
      expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('2000')
    })
  })

  it('keeps both valid tracks and the timeline after an invalid replacement', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Load demo' }))
    fireEvent.change(screen.getByRole('slider'), { target: { value: '7000' } })
    await user.upload(screen.getByLabelText('Replace Track A'), file('broken.srt', '7\nno timing\ntext'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Previous file is still loaded.')
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByText('station-ja.srt', { selector: 'h2' })).toBeTruthy()
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('7000')
    expect(screen.getByLabelText('Jump to time').getAttribute('value')).toBe('00:00:07.000')
  })

  it('supports precise seeking, gap/end states, group navigation, and useful seek errors', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Load demo' }))
    const entry = screen.getByLabelText('Jump to time')
    await user.clear(entry)
    await user.type(entry, '00:00:06.250')
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByText('Group 02 at playhead')).toBeTruthy()
    expect(screen.getByRole('article', { name: 'Group 2' }).getAttribute('aria-current')).toBe('true')
    await user.click(screen.getByRole('button', { name: 'Show group' }))
    expect(document.activeElement).toBe(screen.getByRole('article', { name: 'Group 2' }))
    fireEvent.change(screen.getByRole('slider'), { target: { value: '14000' } })
    expect(screen.getByText(/Between cues/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Show group' }) as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Seek to group 5' }))
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('22000')
    fireEvent.change(screen.getByRole('slider'), { target: { value: '24000' } })
    expect(screen.getByText('End of loaded tracks')).toBeTruthy()
    await user.clear(entry)
    await user.type(entry, 'bad time')
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByRole('alert').textContent).toContain('HH:MM:SS.mmm')
    await user.clear(entry)
    await user.type(entry, '00:01:00.000')
    await user.click(screen.getByRole('button', { name: 'Go' }))
    expect(screen.getByRole('alert').textContent).toContain('between')
  })

  it('renders imported HTML as text and retains mobile track labels', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await user.upload(screen.getByLabelText('Import Track A'), file('literal.srt', source('<img src=x onerror=alert(1)>')))
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeTruthy()
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelectorAll('.mobile-track-label')).toHaveLength(2)
  })

  it('keeps the most recent selection when asynchronous imports finish out of order', async () => {
    const user = userEvent.setup()
    let finishFirst!: (value: srt.Cue[]) => void
    vi.spyOn(srt, 'readSrtFile').mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve }))
    render(<App />)
    await user.upload(screen.getByLabelText('Import Track A'), file('slow.srt', source('Old text')))
    await user.upload(screen.getByLabelText('Import Track A'), file('new.srt', source('Newest text')))
    expect(await screen.findByText('Newest text')).toBeTruthy()
    await act(async () => { finishFirst(srt.parseSrt(source('Old text'), 'A')) })
    expect(screen.queryByText('Old text')).toBeNull()
    expect(screen.getByText('new.srt', { selector: 'h2' })).toBeTruthy()
  })

  it('does not allow a pending file read to overwrite Load demo', async () => {
    const user = userEvent.setup()
    let finish!: (value: srt.Cue[]) => void
    vi.spyOn(srt, 'readSrtFile').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    render(<App />)
    await user.upload(screen.getByLabelText('Import Track A'), file('slow.srt', source('Stale text')))
    await user.click(screen.getByRole('button', { name: 'Load demo' }))
    await act(async () => { finish(srt.parseSrt(source('Stale text'), 'A')) })
    expect(screen.queryByText('Stale text')).toBeNull()
    expect(screen.getAllByRole('article')).toHaveLength(5)
  })

  it('preserves concurrent imports of both tracks', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Import Track A'), { target: { files: [file('a.srt', source('Alpha'))] } })
    fireEvent.change(screen.getByLabelText('Import Track B'), { target: { files: [file('b.srt', source('Beta'))] } })
    await waitFor(() => { expect(screen.getByText('Alpha')).toBeTruthy(); expect(screen.getByText('Beta')).toBeTruthy() })
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })
})

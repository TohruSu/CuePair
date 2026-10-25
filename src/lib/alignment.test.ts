import { describe, expect, it } from 'vitest'
import { activeGroups, compareTracks, findTimingWarnings } from './alignment'
import type { Cue, TrackId } from './srt'

function cues(track: TrackId, intervals: number[][]): Cue[] {
  return intervals.map(([start, end], order) => ({ id: `${track}-${order}`, track, order, start, end, text: `Text ${track}-${order}` }))
}

function grouping(a: Cue[], b: Cue[]) {
  return compareTracks(a, b).groups.map((group) => [group.a.map((cue) => cue.id), group.b.map((cue) => cue.id)])
}

describe('temporal grouping', () => {
  it('groups one-to-one overlaps', () => {
    expect(grouping(cues('A', [[0, 5]]), cues('B', [[1, 6]]))).toEqual([[['A-0'], ['B-0']]])
  })
  it('groups one-to-many overlaps', () => {
    expect(grouping(cues('A', [[0, 10]]), cues('B', [[1, 4], [5, 9]]))).toEqual([[['A-0'], ['B-0', 'B-1']]])
  })
  it('groups many-to-one overlaps', () => {
    expect(grouping(cues('A', [[1, 4], [5, 9]]), cues('B', [[0, 10]]))).toEqual([[['A-0', 'A-1'], ['B-0']]])
  })
  it('follows transitive cross-track edges with multiple cues on both sides', () => {
    expect(grouping(cues('A', [[0, 3], [5, 9]]), cues('B', [[2, 6], [8, 12]])))
      .toEqual([[['A-0', 'A-1'], ['B-0', 'B-1']]])
  })
  it('keeps touching endpoints separate, with unmatched cues from either track', () => {
    expect(grouping(cues('A', [[0, 3], [6, 8]]), cues('B', [[3, 6], [10, 12]])))
      .toEqual([[['A-0'], []], [[], ['B-0']], [['A-1'], []], [[], ['B-1']]])
  })
  it('does not use within-track overlaps as cross-track evidence', () => {
    const a = cues('A', [[0, 10], [2, 4]])
    expect(grouping(a, cues('B', [[8, 9]]))).toEqual([[['A-0'], ['B-0']], [['A-1'], []]])
    expect([...compareTracks(a, []).timingWarnings].sort()).toEqual(['A-0', 'A-1'])
  })
  it('flags nested and chained timing overlaps, without warning at touching endpoints', () => {
    expect([...findTimingWarnings(cues('A', [[0, 10], [1, 2], [3, 4], [10, 11], [10, 12], [12, 13]]))].sort())
      .toEqual(['A-0', 'A-1', 'A-2', 'A-3', 'A-4'])
  })
  it('sorts ties deterministically and preserves original source order', () => {
    const a = cues('A', [[5, 8], [0, 10], [5, 8]])
    const b = cues('B', [[7, 9]])
    expect(grouping(a, b)).toEqual([[['A-0', 'A-1', 'A-2'], ['B-0']]])
    expect(grouping(cues('A', [[0, 2], [0, 2]]), [])).toEqual([[['A-0'], []], [['A-1'], []]])
    expect(compareTracks(a, b)).toEqual(compareTracks(a, b))
  })
  it('retains frontier components across gaps and removes expired representatives', () => {
    expect(grouping(cues('A', [[0, 100], [21, 25], [101, 110]]), cues('B', [[10, 20], [22, 23], [30, 40], [109, 120]])))
      .toEqual([[['A-0', 'A-1'], ['B-0', 'B-1', 'B-2']], [['A-2'], ['B-3']]])
  })
  it('handles either or both tracks being empty', () => {
    expect(compareTracks([], []).groups).toEqual([])
    expect(grouping([], cues('B', [[0, 4], [2, 3]]))).toEqual([[[], ['B-0']], [[], ['B-1']]])
  })
  it('identifies multiple simultaneous unmatched groups and excludes end boundaries', () => {
    const { groups } = compareTracks(cues('A', [[0, 10], [3, 5]]), [])
    expect(activeGroups(groups, 3)).toHaveLength(2)
    expect(activeGroups(groups, 5)).toHaveLength(1)
    expect(activeGroups(groups, 10)).toHaveLength(0)
  })

  it('agrees with an exhaustive reference on seeded unsorted intervals; every cue appears once', () => {
    let seed = 83221
    const random = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max }
    for (let run = 0; run < 300; run++) {
      const intervals = () => Array.from({ length: random(20) }, () => { const start = random(120); return [start, start + 1 + random(25)] })
      const a = cues('A', intervals())
      const b = cues('B', intervals())
      const all = [...a, ...b]
      const unseen = new Set(all)
      const reference: string[][] = []
      while (unseen.size) {
        const first = unseen.values().next().value!
        unseen.delete(first)
        const component = [first]
        for (let i = 0; i < component.length; i++) {
          for (const candidate of unseen) {
            const current = component[i]
            if (candidate.track !== current.track && candidate.start < current.end && current.start < candidate.end) {
              unseen.delete(candidate)
              component.push(candidate)
            }
          }
        }
        reference.push(component.map((cue) => cue.id).sort())
      }
      const { groups, timingWarnings } = compareTracks(a, b)
      const actual = groups.map((group) => [...group.a, ...group.b].map((cue) => cue.id).sort())
      expect(actual.map((ids) => ids.join(',')).sort()).toEqual(reference.map((ids) => ids.join(',')).sort())
      const flattened = groups.flatMap((group) => [...group.a, ...group.b])
      expect(flattened).toHaveLength(all.length)
      expect(new Set(flattened).size).toBe(all.length)
      expect(flattened.map((cue) => cue.id).sort()).toEqual(all.map((cue) => cue.id).sort())
      const warningIds = all.filter((cue) => all.some((other) => other !== cue && other.track === cue.track && other.start < cue.end && cue.start < other.end)).map((cue) => cue.id)
      expect([...timingWarnings].sort()).toEqual(warningIds.sort())
    }
  })

  it('handles 10,000 densely overlapping cues on each track without enumerating all edges', () => {
    const intervals = Array.from({ length: 10_000 }, (_, i) => [i, 20_000 + i])
    const { groups, timingWarnings } = compareTracks(cues('A', intervals), cues('B', intervals))
    expect(groups).toHaveLength(1)
    expect(groups[0].a).toHaveLength(10_000)
    expect(groups[0].b).toHaveLength(10_000)
    expect(timingWarnings.size).toBe(20_000)
  })
})

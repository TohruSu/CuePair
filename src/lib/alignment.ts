import type { Cue } from './srt'

export interface ComparisonGroup {
  id: string
  start: number
  end: number
  a: Cue[]
  b: Cue[]
}

export interface Comparison {
  groups: ComparisonGroup[]
  timingWarnings: Set<string>
}

/** Flag every cue involved in a same-track overlap without enumerating pairs. */
export function findTimingWarnings(cues: Cue[]): Set<string> {
  const warnings = new Set<string>()
  let furthest: Cue | undefined
  for (const cue of [...cues].sort((a, b) => a.start - b.start || a.order - b.order)) {
    if (furthest && cue.start < furthest.end) {
      warnings.add(cue.id)
      warnings.add(furthest.id)
    }
    if (!furthest || cue.end > furthest.end) furthest = cue
  }
  return warnings
}

/** Connected components of positive-duration cross-track overlaps. */
export function compareTracks(a: Cue[], b: Cue[]): Comparison {
  const cues = [...a, ...b]
  const parent = cues.map((_, index) => index)
  const size = cues.map(() => 1)
  function root(index: number): number {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]]
      index = parent[index]
    }
    return index
  }
  function join(left: number, right: number) {
    let x = root(left)
    let y = root(right)
    if (x === y) return
    if (size[x] < size[y]) [x, y] = [y, x]
    parent[y] = x
    size[x] += size[y]
  }

  const events = cues.flatMap((cue, index) => [
    { time: cue.start, end: false, index },
    { time: cue.end, end: true, index },
  ]).sort((x, y) => x.time - y.time || Number(y.end) - Number(x.end) || x.index - y.index)

  const pending = [new Set<number>(), new Set<number>()]
  const connected = [new Set<number>(), new Set<number>()]

  // All active cues that have already met an opposite-track cue belong to one
  // component. Keep one representative of that frontier, plus cues that have
  // never met a counterpart. Each pending cue is visited at most once here.
  // This avoids enumerating the quadratic edge set of densely overlapping SRTs.
  for (const event of events) {
    const side = event.index < a.length ? 0 : 1
    const other = 1 - side
    if (event.end) {
      pending[side].delete(event.index)
      connected[side].delete(event.index)
      continue
    }
    const representative = connected[other].values().next().value
    if (representative === undefined && pending[other].size === 0) {
      pending[side].add(event.index)
      continue
    }
    if (representative !== undefined) join(event.index, representative)
    for (const index of pending[other]) {
      join(event.index, index)
      connected[other].add(index)
    }
    pending[other].clear()
    connected[side].add(event.index)
  }

  const components = new Map<number, ComparisonGroup>()
  for (let index = 0; index < cues.length; index++) {
    const cue = cues[index]
    const key = root(index)
    let group = components.get(key)
    if (!group) {
      group = { id: `group-${cue.id}`, start: cue.start, end: cue.end, a: [], b: [] }
      components.set(key, group)
    }
    group.start = Math.min(group.start, cue.start)
    group.end = Math.max(group.end, cue.end)
    ;(cue.track === 'A' ? group.a : group.b).push(cue)
  }
  const groups = [...components.values()].sort((x, y) =>
    x.start - y.start || x.end - y.end ||
    (x.a[0]?.order ?? Infinity) - (y.a[0]?.order ?? Infinity) ||
    (x.b[0]?.order ?? Infinity) - (y.b[0]?.order ?? Infinity),
  )
  return {
    groups,
    timingWarnings: new Set([...findTimingWarnings(a), ...findTimingWarnings(b)]),
  }
}

export function activeGroups(groups: ComparisonGroup[], time: number): ComparisonGroup[] {
  return groups.filter((group) => group.start <= time && time < group.end)
}

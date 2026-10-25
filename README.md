# CuePair

A lightweight browser tool for reading two subtitle tracks on a shared timeline. Compare original and translated subtitles even when their cue counts, timing, or segmentation differ.

**[Try the live demo](https://tohrusu.github.io/CuePair/)**

## Features

- Two local SRT imports, with filenames and cue counts.
- Time-based comparison groups, including one-to-many and many-to-one overlaps.
- Visible cues without a counterpart and warnings for timing overlaps within a track.
- A shared slider, precise time entry, and navigation to the current group.
- Unicode and multiline text, with a responsive two-column reading view.
- An original Japanese/Chinese demo that loads without external requests.

## Use

Choose an SRT file for Track A and another for Track B, or select **Load demo**. Move the shared time slider or enter `HH:MM:SS.mmm` and select **Go**. **Show group** scrolls to the group at the playhead; a group's timestamp also seeks to its start. On small screens, Track A and Track B stack with labels.

Files are processed locally in your browser. Replacing a file restarts the timeline at the earliest loaded cue. A failed import keeps the last valid tracks and time position. A single imported track can be read while you choose the second.

The bundled demo follows a short walk from a station to a river. Group 02 contains one Japanese cue and two Chinese cues. Groups 03 and 05 have no counterpart. Group 04 contains two overlapping Japanese cues, shown with timing warnings.

## Supported input

Import `.srt` files directly; no CSV preparation is needed. Each file may contain up to **2 MiB (2,097,152 bytes)** and **10,000 cues**. Use UTF-8 with or without a BOM, LF or CRLF line endings, and standard `HH:MM:SS,mmm --> HH:MM:SS,mmm` timing lines. Numeric cue identifiers are optional and need not be consecutive. Separate cues with a blank line. Text, punctuation, and line breaks are retained, including formatting tags as literal text.

Invalid timestamps, nonpositive durations, missing text, malformed blocks, invalid UTF-8, and files over the limits are rejected with an error. Legacy text encodings and other subtitle formats are not supported.

## How grouping works

Cues use half-open intervals `[start, end)` in integer milliseconds. Cues from different tracks share a group when their intervals overlap, directly or through a chain of cross-track overlaps. Cues touching only at an endpoint remain separate. Every cue appears once, in its original order within its track. Groups are sorted by start, end, then source order in Track A and Track B.

A sweep line with a small union-find structure builds these components. It retains one representative of the active connected frontier and any active cues still waiting for a counterpart. Each waiting cue joins that frontier at most once, avoiding enumeration of dense overlap pairs. Sorting costs O(n log n); grouping uses O(n α(n)) time and O(n) memory. Same-track timing warnings are detected separately with a sorted scan.

Temporal overlap suggests a possible counterpart; it does not establish equivalent meaning. Same-track overlaps produce warnings and do not independently connect groups. Multiple isolated groups can be active at the same time; **Show first group** navigates to the first in chronological order.

## Development

Use **Node.js 22.12 or newer in the Node 22 series** and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

`npm test` runs parser, temporal grouping, and UI tests with Vitest. The grouping tests include seeded comparisons against an exhaustive reference and a dense 10,000-cue case on each track. The production build includes TypeScript checking.

The implementation uses React, TypeScript, Vite, and plain CSS. Runtime dependencies are limited to React and React DOM. There is no server or persistence; reloading clears the workspace. Large imports can create long reading views, and the file limits are safeguards rather than performance guarantees. Text is displayed as plain text without rendering SRT styling tags.

## GitHub Pages

The CI workflow tests and builds on pull requests and pushes to `main`, using Node.js 22. The separate Pages workflow tests, builds, and deploys `dist/` on `main` pushes or manual dispatch. It uses the official Pages artifact and deployment actions with the `github-pages` environment. Enable **Settings → Pages → Source → GitHub Actions** after creating the repository.

Vite uses relative asset URLs (`base: './'`) so the build works at `https://tohrusu.github.io/CuePair/`. Do not commit `dist/` or create a `gh-pages` branch.

## License

[MIT](LICENSE) © 2026 TohruSu.

# CuePair

**Compare two subtitle tracks on one timeline.**

CuePair helps you review original and translated subtitles side by side, even when their timing or line breaks differ. Import your own SRT files or explore the built-in Japanese–Chinese demo.

**[Try the live demo](https://tohrusu.github.io/CuePair/)**

## Features

- **Side-by-side reading:** Compare two subtitle tracks with readable timestamps and preserved multiline text.
- **Time-based grouping:** See one-to-one, one-to-many, and many-to-one relationships based on overlapping intervals.
- **Clear timing cues:** Spot subtitles without a counterpart and overlaps within the same track.
- **Shared timeline:** Seek with the slider, enter an exact time, or jump to a subtitle group.
- **Local and responsive:** Read files directly in your browser on desktop or mobile.

## Getting started

Open the [live app](https://tohrusu.github.io/CuePair/) and select **Load demo**, or import an SRT file into **Track A** and **Track B**. You can load either track first and replace it whenever you like.

Move the timeline slider or enter a time in `HH:MM:SS.mmm` format and choose **Go**. Select **Show group** to jump to the subtitle group at the current time; selecting a group's timestamp seeks to its start.

The demo follows a short walk from a station to a river. It includes a one-to-many match, subtitles without counterparts, and a pair of overlapping cues worth reviewing.

Files stay in your browser. Replacing a track resets the timeline; an invalid file leaves the previous comparison available.

## Supported SRT files

CuePair supports UTF-8 `.srt` files, with or without a BOM, using LF or CRLF line endings. Use standard SRT timing lines such as:

```text
1
00:00:01,000 --> 00:00:03,000
Hello there.
```

Numeric cue identifiers are optional and may be nonconsecutive. Multiline text and Unicode are preserved, while subtitle formatting tags are displayed as text.

| Limit | Per track |
| --- | --- |
| File size | 2 MiB |
| Subtitles | 10,000 cues |

Each cue needs valid timestamps, a positive duration, and nonempty text. Separate cues with a blank line. Invalid input produces a clear message without replacing the last successfully loaded track.

## How grouping works

CuePair connects subtitles from different tracks when their time intervals overlap. A chain of overlaps can form a group with several cues on either side. Subtitles that only touch at a boundary remain separate, while overlaps within a single track are highlighted as timing warnings.

The comparison uses a sweep-line algorithm with union-find to build groups efficiently, preserving each cue's text and order. Groups are presented chronologically.

**Time overlap indicates a possible counterpart, not a verified translation.**

## Run locally

Requires Node.js 22.12 or newer in the Node.js 22 series and npm.

```sh
npm ci
npm run dev
```

To run tests and preview the production build:

```sh
npm test
npm run build
npm run preview
```

CuePair is built with React, TypeScript, Vite, and plain CSS. The Vitest suite covers SRT parsing, temporal grouping, and interface behavior, with **45 automated tests**.

GitHub Actions runs CI checks and [deploys the site](.github/workflows/pages.yml) to GitHub Pages from `main`. For a fork, select **Settings → Pages → Build and deployment → Source → GitHub Actions**.

## Notes

CuePair handles one file per track and keeps data only for the current browser session. Large files can produce long reading views. The tool focuses on timing-based comparison and navigation rather than subtitle editing.

## License

[MIT](LICENSE) © 2026 TohruSu.

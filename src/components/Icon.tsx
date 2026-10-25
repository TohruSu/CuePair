import type { CSSProperties } from 'react'

export function Icon({ name, size = 18, style }: { name: 'file' | 'arrow' | 'demo' | 'lock' | 'warning' | 'locate' | 'pair'; size?: number; style?: CSSProperties }) {
  const paths = {
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    demo: <><path d="m9 5 11 7-11 7z" /><path d="M4 5v14" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    warning: <><path d="m12 3 10 18H2zM12 9v4" /><path d="M12 17h.01" /></>,
    locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
    pair: <><path d="M3 6h13v4H3zm5 8h13v4H8zM3 14h2v4H3zm16-8h2v4h-2z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}

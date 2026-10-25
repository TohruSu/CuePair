import { TextDecoder, TextEncoder } from 'node:util'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

Object.assign(globalThis, { TextEncoder, TextDecoder })
Element.prototype.scrollIntoView = vi.fn()
afterEach(cleanup)

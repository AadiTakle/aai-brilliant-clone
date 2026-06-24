import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// [Phase 7] Responsive design is verified visually on the device matrix
// (tests/manual/phase-7-responsive.md). These scripted checks guard the
// structural prerequisites that make the manual checks meaningful: a mobile
// viewport, the PRD breakpoints, and overflow/touch-target safeguards.
// Vitest runs from the project root, so resolve paths from cwd.
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
const css = readFileSync(join(process.cwd(), 'src/App.css'), 'utf8')

describe('[Phase 7] responsive prerequisites', () => {
  it('declares a mobile viewport so the layout scales on phones', () => {
    expect(html).toMatch(/<meta[^>]*name=["']viewport["'][^>]*width=device-width/i)
  })

  it('defines the PRD phone and tablet breakpoints', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)/)
    expect(css).toMatch(/@media\s*\(max-width:\s*1024px\)/)
  })

  it('stacks the lessons grid and block layout on phones', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 640px)'))
    expect(phone).toMatch(/\.lessons-grid\s*\{[^}]*grid-template-columns:\s*1fr/)
    expect(phone).toMatch(/\.block-layout\s*\{[^}]*grid-template-columns:\s*1fr/)
  })

  it('uses comfortable touch targets on phones', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 640px)'))
    expect(phone).toMatch(/min-height:\s*44px/)
  })

  it('prevents code/console blocks from overflowing horizontally', () => {
    expect(css).toMatch(/\.console\s*\{[^}]*overflow-x:\s*auto/)
  })
})

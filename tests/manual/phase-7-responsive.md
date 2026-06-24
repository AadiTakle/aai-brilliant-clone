# Phase 7 — Responsive & Mobile Device Matrix

Scripted checks (`npm test`) guard the viewport meta, PRD breakpoints, grid stacking, touch targets, and overflow rules. Actual responsiveness is verified by eye across the matrix below using the browser device toolbar (`npm run dev`).

## Breakpoints (PRD)
- Phone: < 640px
- Tablet: 640–1024px
- Desktop: > 1024px

## Device matrix
Test each viewport in Chrome/Safari device toolbar:

| Device | Width | Notes |
| --- | --- | --- |
| iPhone SE | 375px | Smallest common phone |
| iPhone 14/15 | 390px | Default phone |
| Pixel 7 | 412px | Android phone |
| iPad mini | 768px | Tablet portrait |
| iPad Pro | 1024px | Tablet landscape edge |
| Desktop | 1440px | Baseline desktop |

## What to check per viewport
1. Global
   - No horizontal scrollbar / content does not overflow the viewport.
   - Nav stays usable; brand, points pill, and account menu wrap cleanly on phones.
2. Home page
   - Lesson cards stack to a single column on phones, grid on tablet/desktop.
   - Progress bar on each card is readable; "Continue/Start" tappable (≥ 44px).
3. Article step
   - Panels, widgets (repeated addition, loop visualizer), and Continue button fit and are tappable.
4. Block problem
   - Palette + workspace stack vertically on phones; blocks remain draggable AND tap-to-place works (touch).
   - Console output scrolls horizontally instead of stretching the page.
5. Python sandbox
   - CodeMirror editor fits width; symbol toolbar wraps and keys are tappable.
   - Test-results panel is readable; long expected/actual values wrap.
6. Results page
   - Stat cards wrap to 2-up on phones; actions remain tappable.

## Sign-off (per device)
- [ ] iPhone SE (375)
- [ ] iPhone 14/15 (390)
- [ ] Pixel 7 (412)
- [ ] iPad mini (768)
- [ ] iPad Pro (1024)
- [ ] Desktop (1440)

## Cross-cutting
- [ ] No horizontal overflow anywhere
- [ ] All interactive targets ≥ 44px on phones
- [ ] Block drag + tap-to-place both work on touch
- [ ] Editor + symbol toolbar usable on phones

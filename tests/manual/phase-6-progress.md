# Phase 6 — Manual / Environment-Dependent Tests

Automated unit tests (`npm test`) cover points decay, streak math, and the progress reducers (completion, idempotency, lesson-complete). Persistence across sessions/devices is verified against the emulator; the end-to-end UX is a manual check.

## A. Persistence (emulator)
`tests/phase-6-progress/progress-persistence.emulator.test.ts`. Run:
```bash
npm run test:emulator
```
Expected: a completed step round-trips from Firestore, and the user doc's `totalPoints`, `currentStreak`, and `completedLessons` update atomically.

## B. End-to-end UX (manual)
Run `npm run dev`, sign in, and play **Over and Over Again**.

1. Progress bar
   - Lesson header shows a bar that fills as steps complete.
   - Home page lesson card shows the same completed/total and a bar.
   - Nav shows total points; the account menu shows points + streak.
2. Points + decay
   - Ace a graded step first try → full points added to the total.
   - Miss a graded step a few times, then solve it → fewer points (but ≥ minimum).
   - Ungraded steps (article, sandbox) award full points on completion.
3. Resume
   - Leave mid-lesson, return to Home → card shows "Continue lesson" and resumes at the right step.
   - Reload the browser → progress and points persist (different device/session).
4. Lesson complete + results
   - Complete all graded steps → **Finish** becomes enabled.
   - Results page shows points earned this lesson, total points, and day streak.
   - The lesson is added to `completedLessons`.
5. Streak
   - First completion today starts a 1-day streak; completing again the same day does not double-count.

## Sign-off
- [ ] A. `npm run test:emulator` passes
- [ ] Progress bars (lesson header, home card, nav points)
- [ ] First-try full points; decayed points after misses; floor respected
- [ ] Progress persists across reload (and devices)
- [ ] Finish gated until graded steps done; results page correct
- [ ] Streak increments once per active day

# Phase 3 — Manual / Visual Tests

Automated tests (`npm test`) cover markdown rendering, checkpoint grading + feedback, both widgets' completion logic, and end-to-end completion of authored step 1. The items below are visual/feel checks that can't be meaningfully scripted in jsdom.

Run the app: `npm run dev`, sign in, open **Over and Over Again** → step 1.

0. Panel progression (Brilliant-style)
   - Only one panel (short text + one activity) is visible at a time.
   - The **Continue** button is disabled until the current activity is finished; completing it enables Continue, which reveals the next panel.
   - The final panel (checkpoint) has no Continue; finishing it completes the step.

1. Repeated-addition widget
   - Tap **+ 3** repeatedly. Expected: the expression grows `3 + 3 + …` with a live running total; the count shows `n / 5 times`.
   - At 5, the button disables and a green "that's 3 × 5 = 15" note appears.
   - **Reset** clears it back to `0`.
2. Loop visualizer
   - The code block shows `for i in range(5): print("Hello!")`.
   - Tap **Step**: the `i =` counter (yellow pill) advances and one output line appears per step.
   - At iteration 5 the Step button disables and the completion note appears.
3. Checkpoint
   - Pick a wrong answer + **Check** → red "Count again." feedback; can retry.
   - Pick **5 times** + **Check** → green feedback; choices lock.
4. Overall feel
   - Spacing, colors (Python blue/yellow), and readability look polished on desktop.
   - Prose `code` spans are tinted blue; the loop code block is dark.

## Sign-off
- [ ] Repeated-addition grows + completes + resets
- [ ] Loop visualizer steps + outputs + completes
- [ ] Checkpoint correct/incorrect feedback
- [ ] Visual polish acceptable

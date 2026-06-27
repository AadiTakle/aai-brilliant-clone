// The Mastery Challenge sigil: a gear (mastery of mechanics) with a star at its
// heart (achievement). Inherits `currentColor`, so it reads coral in the arena
// and gold on completion just by changing the parent's color.
export function MasteryGearStar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
        <circle cx="24" cy="24" r="15" />
        <circle cx="24" cy="24" r="20" strokeDasharray="2.2 5.2" opacity="0.75" />
      </g>
      <path
        d="M24 12.5L26.7 20.28L34.94 20.45L28.37 25.42L30.76 33.3L24 28.6L17.24 33.3L19.63 25.42L13.06 20.45L21.3 20.28Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

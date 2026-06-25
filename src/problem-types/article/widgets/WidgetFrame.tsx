import type { ReactNode } from 'react'

export type WidgetStatus = 'idle' | 'running' | 'done'

interface WidgetFrameProps {
  /** Goes on `data-widget` (kept stable for styling/tests). */
  kind: string
  /** Decorative machine glyph for the header chip. */
  icon: ReactNode
  /** Short machine name, e.g. "Loop Machine". */
  title: string
  status: WidgetStatus
  /** Honors prefers-reduced-motion; drives `data-motion`. */
  reduced?: boolean
  /** Extra class, usually the widget's bespoke `widget-xxx` class. */
  className?: string
  /** Small helper line shown under the body. */
  caption?: ReactNode
  /** Extra `data-*` attributes some widgets rely on for CSS (e.g. data-running). */
  dataAttrs?: Record<string, string | undefined>
  children: ReactNode
}

/**
 * The shared "machine module" chassis every article widget renders inside. It
 * gives the whole widget family one cohesive frame (header chip + title + status
 * badge) and one success language (the `data-status="done"` energize glow), so
 * bespoke interiors still feel like parts of the same machine when combined in
 * an article. Visuals live in App.css under `.widget-frame`.
 */
export function WidgetFrame({
  kind,
  icon,
  title,
  status,
  reduced = false,
  className,
  caption,
  dataAttrs,
  children,
}: WidgetFrameProps) {
  return (
    <section
      className={`widget widget-frame${className ? ` ${className}` : ''}`}
      data-widget={kind}
      data-status={status}
      data-motion={reduced ? 'reduced' : 'full'}
      {...dataAttrs}
    >
      <header className="widget-frame-head">
        <span className="widget-frame-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="widget-frame-title">{title}</span>
        <span className="widget-frame-badge" aria-hidden="true">
          {status === 'done' ? (
            <>
              <span className="widget-frame-badge-check">{'\u2713'}</span> Powered
            </>
          ) : status === 'running' ? (
            'Running'
          ) : (
            'Ready'
          )}
        </span>
      </header>

      <div className="widget-frame-body">{children}</div>

      {caption && <p className="widget-caption">{caption}</p>}
    </section>
  )
}

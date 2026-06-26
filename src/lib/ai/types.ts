// Shared contract for the AI lesson generator. The generator returns RAW
// (unvalidated) lesson JSON or a structured refusal; the caller is responsible
// for validating the lesson against `lessonSchema` before trusting it. This
// keeps the trust boundary explicit no matter which generator (stub, callable)
// produced the content.

export interface CustomLessonRequest {
  /** The learner's plain-language concept request. */
  prompt: string
  /**
   * Optional correction context for an auto-repair pass: the previous (rejected)
   * lesson plus the exact validation errors it produced. When present the
   * generator is asked to return a corrected lesson fixing only those issues.
   */
  repair?: {
    lesson: unknown
    errors: string[]
  }
  /**
   * Widget vocabulary for this generation. `simple` restricts article activities
   * to a small, reliable set when the model struggles with complex widgets.
   */
  widgetMode?: 'standard' | 'simple'
}

export type RawGenerationResult =
  | { accepted: true; lesson: unknown }
  | { accepted: false; reason: string }

export interface AiGenerator {
  generate(req: CustomLessonRequest): Promise<RawGenerationResult>
}

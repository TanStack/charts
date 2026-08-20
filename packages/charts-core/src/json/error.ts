import type { ChartJsonIssue } from './types'

export class ChartJsonError extends TypeError {
  readonly issues: readonly ChartJsonIssue[]

  constructor(issues: readonly ChartJsonIssue[], options?: ErrorOptions) {
    super(
      issues.length === 1
        ? issues[0]!.message
        : `Chart JSON contains ${issues.length} errors`,
      options,
    )
    this.name = 'ChartJsonError'
    this.issues = issues
  }
}

/**
 * shieldcn
 * src/providers/coverage-color
 *
 * Shared coverage-percentage → badge color thresholds, used by every
 * coverage-reporting provider (Codecov, Coveralls) so their badges agree on
 * what counts as "good" coverage.
 */

/** Round a raw coverage percentage to 2 decimal places and pick its badge color. */
export function coveragePctAndColor(coverage: number): { pct: number; color: string } {
  const pct = Math.round(coverage * 100) / 100
  const color = pct >= 90 ? "green" : pct >= 75 ? "yellow" : pct >= 50 ? "amber" : "red"
  return { pct, color }
}

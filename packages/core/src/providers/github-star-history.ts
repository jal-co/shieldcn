/** A single point on a cumulative curve. */
export interface StarPoint {
  /** ISO-8601 timestamp. */
  date: string
  /** Cumulative count at that moment. */
  value: number
}

/** Resolved cumulative time series for a repository. */
export interface StarHistory {
  owner: string
  repo: string
  total: number
  /** Time-ordered cumulative points (first → last). */
  points: StarPoint[]
}

interface StarWeek {
  week: number
  total: number
  days: number[]
}

function isStarWeek(value: unknown): value is StarWeek {
  if (typeof value !== "object" || value === null) return false
  return "week" in value && typeof value.week === "number" &&
    Number.isSafeInteger(value.week) && value.week >= 0 &&
    Number.isFinite(new Date(value.week * 1000).getTime()) &&
    "total" in value && typeof value.total === "number" &&
    Number.isSafeInteger(value.total) && value.total >= 0 &&
    "days" in value && Array.isArray(value.days) && value.days.length === 7 &&
    value.days.every((day: unknown) => typeof day === "number" && Number.isSafeInteger(day) && day >= 0) &&
    value.days.reduce((sum: number, day: number) => sum + day, 0) === value.total
}

export async function fetchStarHistory(
  owner: string,
  repo: string,
  fetchPage: (url: string) => Promise<Response | null>,
): Promise<StarHistory | null> {
  const weeks: StarWeek[] = []
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers/history`
  for (let page = 1; page <= 100; page++) {
    const response = await fetchPage(`${base}?per_page=30&page=${page}`)
    if (!response?.ok) return null
    let data: unknown
    try {
      data = await response.json()
    } catch {
      return null
    }
    if (!Array.isArray(data) || data.length > 30 || !data.every(isStarWeek)) return null
    for (const week of data) {
      if (weeks.length > 0 && week.week >= weeks[weeks.length - 1].week) return null
      weeks.push(week)
    }
    if (data.length < 30) break
    if (page === 100) return null
  }

  const now = Date.now()
  if (weeks.length === 0) {
    return { owner, repo, total: 0, points: [{ date: new Date(now).toISOString(), value: 0 }] }
  }

  weeks.reverse()
  const points: StarPoint[] = [{ date: new Date(weeks[0].week * 1000).toISOString(), value: 0 }]
  let total = 0
  for (const week of weeks) {
    if (week.week * 1000 > now) return null
    total += week.total
    points.push({
      date: new Date(Math.min((week.week + 7 * 86400) * 1000, now)).toISOString(),
      value: total,
    })
  }
  const count = Math.min(30, points.length)
  const sampled = Array.from({ length: count }, (_, index) =>
    points[Math.round(index * (points.length - 1) / (count - 1))],
  )
  return { owner, repo, total, points: sampled }
}

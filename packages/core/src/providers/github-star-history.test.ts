import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchStarHistory } from "./github-star-history"

const week = (index: number, total = 7) => ({
  week: 1609632000 + index * 7 * 86400,
  total,
  days: [total, 0, 0, 0, 0, 0, 0],
})

const respond = (data: unknown) => Promise.resolve(Response.json(data))

afterEach(() => vi.useRealTimers())

describe("privacy-safe star history", () => {
  it("accumulates weekly counts chronologically, including zero weeks", async () => {
    const result = await fetchStarHistory("owner", "repo", () => respond([week(2, 5), week(1, 0), week(0, 3)]))
    expect(result?.total).toBe(8)
    expect(result?.points.map(point => point.value)).toEqual([0, 3, 3, 8])
    expect(result?.points.map(point => point.date)).toEqual([
      "2021-01-03T00:00:00.000Z", "2021-01-10T00:00:00.000Z",
      "2021-01-17T00:00:00.000Z", "2021-01-24T00:00:00.000Z",
    ])
  })

  it("fetches all weeks before sampling and does not cap counts at 40,000", async () => {
    const fetchPage = vi.fn(async (url: string) => {
      const page = new URL(url).searchParams.get("page")
      return Response.json(page === "1"
        ? Array.from({ length: 30 }, (_, i) => week(30 - i, 2000))
        : [week(0, 1000)])
    })
    const result = await fetchStarHistory("owner/name", "a b", fetchPage)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage.mock.calls[0][0]).toBe("https://api.github.com/repos/owner%2Fname/a%20b/stargazers/history?per_page=30&page=1")
    expect(result?.total).toBe(61000)
    expect(result?.points).toHaveLength(30)
    expect(result?.points[0].value).toBe(0)
    expect(result?.points.at(-1)?.value).toBe(61000)
  })

  it("checks the next page after an exactly full page", async () => {
    const fetchPage = vi.fn(async (url: string) => Response.json(
      new URL(url).searchParams.get("page") === "1"
        ? Array.from({ length: 30 }, (_, i) => week(29 - i)) : [],
    ))
    expect((await fetchStarHistory("o", "r", fetchPage))?.total).toBe(210)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it("stops at GitHub's 100-page limit without publishing truncated data", async () => {
    const fetchPage = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get("page"))
      return Response.json(Array.from({ length: 30 }, (_, index) => week(3000 - (page - 1) * 30 - index)))
    })
    expect(await fetchStarHistory("o", "r", fetchPage)).toBeNull()
    expect(fetchPage).toHaveBeenCalledTimes(100)
  })

  it("returns a zero baseline for an empty history", async () => {
    const result = await fetchStarHistory("o", "r", () => respond([]))
    expect(result?.total).toBe(0)
    expect(result?.points).toHaveLength(1)
    expect(result?.points[0].value).toBe(0)
  })

  it("does not place the current week's count in the future", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2021-01-05T12:00:00Z"))
    const result = await fetchStarHistory("o", "r", () => respond([week(0, 12)]))
    expect(result?.points.at(-1)).toEqual({ date: "2021-01-05T12:00:00.000Z", value: 12 })
  })

  it.each([
    {}, [{ starred_at: "2021-01-01" }], [{ ...week(0), total: -1 }],
    [{ ...week(0), days: [] }], [{ ...week(0), week: "bad" }],
    [week(0), week(1)], [week(0), week(0)],
  ].map(data => [data]))("rejects malformed or unordered history %j", async (data) => {
    expect(await fetchStarHistory("o", "r", () => respond(data))).toBeNull()
  })

  it("rejects invalid JSON", async () => {
    expect(await fetchStarHistory("o", "r", async () => new Response("invalid"))).toBeNull()
  })

  it.each([401, 403, 404, 429, 503])("rejects upstream status %i", async (status) => {
    expect(await fetchStarHistory("o", "r", async () => new Response("{}", { status }))).toBeNull()
  })

  it("does not publish a partial history when a later page fails", async () => {
    const fetchPage = vi.fn(async (url: string) => new URL(url).searchParams.get("page") === "1"
      ? Response.json(Array.from({ length: 30 }, (_, i) => week(30 - i)))
      : null)
    expect(await fetchStarHistory("o", "r", fetchPage)).toBeNull()
  })
})

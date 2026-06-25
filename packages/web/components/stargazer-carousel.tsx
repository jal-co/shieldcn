"use client"

/**
 * shieldcn
 * components/stargazer-carousel
 *
 * Two-row auto-scrolling marquee of the repo's stargazers. Pure CSS animation
 * for smooth 60fps; each row pauses on hover so an avatar can be clicked. Built
 * with the Storyboard Animation pattern — every value is a named constant and
 * the loop is documented as a shot list up top.
 */

/* ─────────────────────────────────────────────────────────
 * STARGAZER MARQUEE STORYBOARD
 *
 *    ∞   two avatar rows scroll on a seamless loop, opposite directions
 *        (row 1 → left, row 2 → right; each set is duplicated and the track
 *         translates exactly one set (0 ↔ -50%) so the wrap is invisible)
 *  hover  the hovered row pauses (lets you aim at an avatar)
 *  edges  soft fade masks taper each row into the background
 * ───────────────────────────────────────────────────────── */

import Image from "next/image"

const MARQUEE = {
  secondsPerLoop: 140, // full loop duration (higher = slower, calmer drift)
  avatar: 34, //         px avatar diameter
}

interface Stargazer {
  login: string
  avatar_url: string
}

function MarqueeRow({ avatars, reverse }: { avatars: Stargazer[]; reverse: boolean }) {
  // Duplicate the set so a 50% translate wraps seamlessly.
  const row = [...avatars, ...avatars]
  return (
    <div className="group/marquee relative overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
      {/* Animation via longhand utilities (not the `animation` shorthand) so the
          hover `animation-play-state:paused` isn't overridden by inline style.
          Only the keyframe name + duration are set inline. */}
      <div
        className="flex w-max gap-1.5 [animation-iteration-count:infinite] [animation-timing-function:linear] group-hover/marquee:[animation-play-state:paused]"
        style={{
          animationName: reverse ? "stargazer-marquee-right" : "stargazer-marquee-left",
          animationDuration: `${MARQUEE.secondsPerLoop}s`,
        }}
      >
        {row.map((user, i) => {
          const clone = i >= avatars.length
          return (
            <a
              key={`${user.login}-${i}`}
              href={`https://github.com/${user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              title={user.login}
              aria-hidden={clone}
              tabIndex={clone ? -1 : undefined}
              className="group/avatar shrink-0 p-1"
            >
              <Image
                src={user.avatar_url}
                alt={user.login}
                width={MARQUEE.avatar}
                height={MARQUEE.avatar}
                unoptimized
                className="rounded-full ring-1 ring-border transition-all duration-200 group-hover/avatar:scale-110 group-hover/avatar:ring-foreground/40"
              />
            </a>
          )
        })}
      </div>
    </div>
  )
}

export function StargazerCarousel({ stargazers }: { stargazers: Stargazer[] }) {
  if (stargazers.length === 0) return null

  // Split into two rows that drift in opposite directions.
  const mid = Math.ceil(stargazers.length / 2)
  const rows = [stargazers.slice(0, mid), stargazers.slice(mid)].filter((r) => r.length > 0)

  return (
    <div className="flex flex-col gap-2">
      <style>{`
        @keyframes stargazer-marquee-left  { 0% { transform: translateX(0); }     100% { transform: translateX(-50%); } }
        @keyframes stargazer-marquee-right { 0% { transform: translateX(-50%); }  100% { transform: translateX(0); } }
      `}</style>
      {rows.map((row, i) => (
        <MarqueeRow key={i} avatars={row} reverse={i === 1} />
      ))}
    </div>
  )
}

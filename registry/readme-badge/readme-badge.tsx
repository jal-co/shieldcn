/**
 * shieldcn
 * ReadmeBadge
 * by Justin Levine
 * shieldcn.dev
 *
 * Renders a shieldcn badge image with optional link wrapping.
 * Works with any shieldcn badge URL or any image URL.
 *
 * Props:
 * - src: badge image URL (shieldcn, shields.io, or any image)
 * - alt: accessible alt text for the badge
 * - href?: optional link URL — wraps the badge in an anchor tag
 * - height?: image height in pixels (default 20)
 * - className?: class name for the outer element (link or image)
 * - imgClassName?: class name for the img element (when href is set)
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface ReadmeBadgeProps extends React.ComponentProps<"img"> {
  /** Badge image URL. */
  src: string
  /** Accessible alt text. */
  alt: string
  /** Optional link — wraps badge in an anchor. */
  href?: string
  /** Image height in pixels. @default 20 */
  height?: number
  /** Class name for the outer element. */
  className?: string
  /** Class name for the img element when wrapped in a link. */
  imgClassName?: string
}

function ReadmeBadge({
  src,
  alt,
  href,
  height = 20,
  className,
  imgClassName,
  ...props
}: ReadmeBadgeProps) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      height={height}
      className={cn(
        "inline-block align-middle",
        href ? imgClassName : className
      )}
      loading="lazy"
      decoding="async"
      {...props}
    />
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-flex", className)}
      >
        {img}
      </a>
    )
  }

  return img
}

export { ReadmeBadge }
export type { ReadmeBadgeProps }

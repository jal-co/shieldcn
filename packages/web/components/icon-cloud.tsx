// shieldcn — components/icon-cloud.tsx
// Interactive 3D icon cloud using DOM elements (not canvas)
// Renders badge SVGs at native resolution via <img> tags
// Adapted from magic UI / shadcnblocks hero236

"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface IconCloudProps {
  images: string[]
  className?: string
  /** Sphere radius in pixels */
  radius?: number
}

interface SpherePoint {
  x: number
  y: number
  z: number
}

/**
 * Distribute N points evenly on a sphere using Fibonacci spiral.
 */
function fibonacciSphere(count: number, radius: number): SpherePoint[] {
  const points: SpherePoint[] = []
  const offset = 2 / count
  const increment = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = i * offset - 1 + offset / 2
    const r = Math.sqrt(1 - y * y)
    const phi = i * increment

    points.push({
      x: Math.cos(phi) * r * radius,
      y: y * radius,
      z: Math.sin(phi) * r * radius,
    })
  }
  return points
}

export function IconCloud({ images, className, radius = 200 }: IconCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const mousePosRef = useRef({ x: 0, y: 0 })
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  const [points] = useState(() => fibonacciSphere(images.length, radius))

  const updatePositions = useCallback(() => {
    const cosX = Math.cos(rotationRef.current.x)
    const sinX = Math.sin(rotationRef.current.x)
    const cosY = Math.cos(rotationRef.current.y)
    const sinY = Math.sin(rotationRef.current.y)

    for (let i = 0; i < points.length; i++) {
      const el = itemRefs.current[i]
      if (!el) continue

      const pt = points[i]

      // Rotate around Y axis, then X axis
      const rotatedX = pt.x * cosY - pt.z * sinY
      const rotatedZ = pt.x * sinY + pt.z * cosY
      const rotatedY = pt.y * cosX + rotatedZ * sinX
      const finalZ = pt.y * -sinX + rotatedZ * cosX

      const scale = (finalZ + radius * 1.8) / (radius * 2.5)
      const opacity = Math.max(0.1, Math.min(1, (finalZ + radius * 1.2) / (radius * 1.8)))

      el.style.transform = `translate3d(${rotatedX}px, ${rotatedY}px, 0) scale(${scale})`
      el.style.opacity = String(opacity)
      el.style.zIndex = String(Math.round(finalZ + radius))
    }
  }, [points, radius])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (!isDraggingRef.current) {
        const mx = mousePosRef.current.x
        const my = mousePosRef.current.y
        // Gentle auto-rotation biased by mouse position
        rotationRef.current.x += (my * 0.00002) + 0.001
        rotationRef.current.y += (mx * 0.00002) + 0.002
      }

      updatePositions()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationRef.current)
  }, [updatePositions])

  // Mouse handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true
    lastMouseRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      mousePosRef.current = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      }
    }

    if (isDraggingRef.current) {
      const deltaX = e.clientX - lastMouseRef.current.x
      const deltaY = e.clientY - lastMouseRef.current.y

      rotationRef.current.x += deltaY * 0.004
      rotationRef.current.y += deltaX * 0.004

      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handlePointerUp = () => {
    isDraggingRef.current = false
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative select-none cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{
        width: radius * 2.6,
        height: radius * 2.6,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      aria-label="Interactive 3D badge cloud"
      role="img"
    >
      {images.map((src, i) => (
        <div
          key={i}
          ref={(el) => { itemRefs.current[i] = el }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="h-7 w-auto shrink-0"
            loading="eager"
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}

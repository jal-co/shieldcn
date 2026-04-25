"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Pipette } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100
  const l1 = l / 100
  const a = s1 * Math.min(l1, 1 - l1)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l1 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, "0")
  }
  return `${f(0)}${f(8)}${f(4)}`
}

function isValidHex(v: string): boolean {
  return /^[0-9a-fA-F]{6}$/.test(v)
}

// ---------------------------------------------------------------------------
// ColorInput — swatch + hex input + popover picker
// ---------------------------------------------------------------------------

export function ColorInput({
  value,
  onChange,
  placeholder = "auto",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)

  const displayColor = value && isValidHex(value) ? `#${value}` : undefined

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "size-9 shrink-0 cursor-pointer rounded-md border border-input transition-colors hover:border-ring",
              !displayColor && "bg-transparent",
            )}
            style={displayColor ? { backgroundColor: displayColor } : undefined}
            aria-label="Pick color"
          >
            {!displayColor && (
              <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                —
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <ColorPicker
            value={value}
            onChange={(v) => {
              onChange(v)
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/^#/, ""))}
        placeholder={placeholder}
        className="flex-1 font-mono"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ColorPicker — HSL canvas + hue slider + eyedropper + presets
// ---------------------------------------------------------------------------

const PRESETS = [
  "ef4444", "f97316", "eab308", "22c55e", "06b6d4",
  "3b82f6", "8b5cf6", "ec4899", "ffffff", "000000",
]

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const hex = value && isValidHex(value) ? value : "3b82f6"
  const [h, s, l] = hexToHsl(hex)

  const [hue, setHue] = useState(h)
  const [sat, setSat] = useState(s)
  const [lit, setLit] = useState(l)

  // Sync internal state when external value changes
  const prevValue = useRef(value)
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value
      if (value && isValidHex(value)) {
        const [nh, ns, nl] = hexToHsl(value)
        setHue(nh)
        setSat(ns)
        setLit(nl)
      }
    }
  }, [value])

  const emit = useCallback(
    (h2: number, s2: number, l2: number) => {
      const newHex = hslToHex(h2, s2, l2)
      prevValue.current = newHex
      onChange(newHex)
    },
    [onChange],
  )

  // --- Canvas (saturation/lightness) ---
  const canvasRef = useRef<HTMLDivElement>(null)
  const draggingCanvas = useRef(false)

  const handleCanvasMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
      const newSat = x * 100
      const newLit = (1 - y) * 50 + (1 - x) * (1 - y) * 50
      // Simplified: top-left is white, top-right is hue, bottom is black
      // Use HSB-to-HSL: s = x*100, b = (1-y)*100, then convert
      const b = (1 - y) * 100
      const hslL = (b * (200 - x * 100)) / 200
      const hslS = hslL === 0 || hslL === 100 ? 0 : (b - hslL) / Math.min(hslL, 100 - hslL) * 100
      setSat(Math.max(0, Math.min(100, hslS)))
      setLit(Math.max(0, Math.min(100, hslL)))
      emit(hue, Math.max(0, Math.min(100, hslS)), Math.max(0, Math.min(100, hslL)))
    },
    [hue, emit],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingCanvas.current) return
      e.preventDefault()
      handleCanvasMove(e.clientX, e.clientY)
    }
    const onUp = () => {
      draggingCanvas.current = false
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [handleCanvasMove])

  // Convert current HSL back to HSB for canvas thumb position
  const hsbS = (() => {
    const l1 = lit / 100
    const s1 = sat / 100
    const v = l1 + s1 * Math.min(l1, 1 - l1)
    return v === 0 ? 0 : 2 * (1 - l1 / v)
  })()
  const hsbB = (() => {
    const l1 = lit / 100
    const s1 = sat / 100
    return l1 + s1 * Math.min(l1, 1 - l1)
  })()
  const thumbX = hsbS * 100
  const thumbY = (1 - hsbB) * 100

  // --- Hue slider ---
  const hueRef = useRef<HTMLDivElement>(null)
  const draggingHue = useRef(false)

  const handleHueMove = useCallback(
    (clientX: number) => {
      const el = hueRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newHue = x * 360
      setHue(newHue)
      emit(newHue, sat, lit)
    },
    [sat, lit, emit],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingHue.current) return
      e.preventDefault()
      handleHueMove(e.clientX)
    }
    const onUp = () => {
      draggingHue.current = false
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [handleHueMove])

  // --- Eyedropper ---
  const [hasEyedropper] = useState(() =>
    typeof window !== "undefined" && "EyeDropper" in window,
  )

  const handleEyedropper = useCallback(async () => {
    try {
      // @ts-expect-error EyeDropper API not in all TS libs
      const dropper = new window.EyeDropper()
      const result = await dropper.open()
      const picked = result.sRGBHex.replace(/^#/, "")
      if (isValidHex(picked)) {
        const [nh, ns, nl] = hexToHsl(picked)
        setHue(nh)
        setSat(ns)
        setLit(nl)
        prevValue.current = picked
        onChange(picked)
      }
    } catch {
      /* user cancelled */
    }
  }, [onChange])

  // --- Hex input ---
  const [hexInput, setHexInput] = useState(hex)
  useEffect(() => {
    setHexInput(value && isValidHex(value) ? value : hex)
  }, [value, hex])

  return (
    <div className="space-y-3">
      {/* SL Canvas */}
      <div
        ref={canvasRef}
        className="relative h-36 w-full cursor-crosshair overflow-hidden rounded-md border border-input"
        style={{
          background: `
            linear-gradient(to bottom, transparent, #000),
            linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))
          `,
        }}
        onPointerDown={(e) => {
          draggingCanvas.current = true
          handleCanvasMove(e.clientX, e.clientY)
        }}
      >
        <div
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{
            left: `${thumbX}%`,
            top: `${thumbY}%`,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        className="relative h-3 w-full cursor-pointer rounded-full border border-input"
        style={{
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onPointerDown={(e) => {
          draggingHue.current = true
          handleHueMove(e.clientX)
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: `hsl(${hue}, 100%, 50%)`,
          }}
        />
      </div>

      {/* Hex input + eyedropper */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">#</span>
        <Input
          value={hexInput}
          onChange={(e) => {
            const raw = e.target.value.replace(/^#/, "").slice(0, 6)
            setHexInput(raw)
            if (isValidHex(raw)) {
              const [nh, ns, nl] = hexToHsl(raw)
              setHue(nh)
              setSat(ns)
              setLit(nl)
              prevValue.current = raw
              onChange(raw)
            }
          }}
          className="h-7 flex-1 font-mono text-xs"
          maxLength={6}
        />
        {hasEyedropper && (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => void handleEyedropper()}
            title="Pick color from screen"
          >
            <Pipette className="size-3" />
          </Button>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={cn(
              "size-5 rounded-sm border transition-transform hover:scale-110",
              value === preset
                ? "border-ring ring-1 ring-ring"
                : "border-input",
            )}
            style={{ backgroundColor: `#${preset}` }}
            onClick={() => {
              const [nh, ns, nl] = hexToHsl(preset)
              setHue(nh)
              setSat(ns)
              setLit(nl)
              prevValue.current = preset
              onChange(preset)
            }}
            title={`#${preset}`}
          />
        ))}
      </div>
    </div>
  )
}

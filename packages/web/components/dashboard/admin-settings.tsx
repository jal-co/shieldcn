"use client"

/**
 * shieldcn
 * components/dashboard/admin-settings.tsx
 *
 * Admin-only global toggles. Writes go through /api/admin/settings (also
 * admin-gated server-side). Optimistic with rollback on failure.
 */

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Settings {
  showcaseBrandBadges: boolean
}

const TOGGLES: { name: keyof Settings; label: string; description: string }[] = [
  {
    name: "showcaseBrandBadges",
    label: "Brand badges in showcase",
    description:
      "Show logo/brand-badge categories (Frameworks, Databases, Deploy, Package Managers, AI, Brand Badges) to all visitors on the public showcase.",
  },
]

export function AdminSettings({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState<Settings>(initial)
  const [busy, setBusy] = useState<keyof Settings | null>(null)

  async function toggle(name: keyof Settings, value: boolean) {
    setBusy(name)
    setSettings((s) => ({ ...s, [name]: value }))
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value }),
        credentials: "include",
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "update failed")
      toast.success("Saved")
    } catch (err) {
      setSettings((s) => ({ ...s, [name]: !value })) // rollback
      toast.error(err instanceof Error ? err.message : "update failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {TOGGLES.map((t) => (
        <div key={t.name} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium">{t.label}</span>
            <span className="text-sm text-muted-foreground">{t.description}</span>
          </div>
          <Switch
            checked={settings[t.name]}
            disabled={busy === t.name}
            onCheckedChange={(v) => toggle(t.name, v)}
            aria-label={t.label}
          />
        </div>
      ))}
    </div>
  )
}

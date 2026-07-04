"use client"

/**
 * shieldcn
 * components/auth/auth-modal.tsx
 *
 * Sign-in in a modal — open the auth form from anywhere (e.g. the header) without
 * a full page navigation. Reuses AuthForm; a successful sign-in closes the modal.
 * The dedicated /sign-in and /sign-up pages remain for direct links, deep links,
 * and OAuth returns.
 */

import { useState } from "react"
import { Suspense } from "react"
import {
  Dialog, DialogContent, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { AuthForm } from "@/components/auth/auth-form"

export function AuthModal({
  trigger,
  mode = "sign-in",
  callbackURL,
}: {
  trigger: React.ReactNode
  mode?: "sign-in" | "sign-up"
  callbackURL?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-none bg-transparent p-0 shadow-none sm:max-w-sm [&>button]:hidden">
        {/* Accessible title (visually hidden — the card renders its own heading). */}
        <DialogTitle className="sr-only">
          {mode === "sign-up" ? "Create your account" : "Sign in"}
        </DialogTitle>
        <Suspense fallback={null}>
          <AuthForm mode={mode} callbackURL={callbackURL} onSuccess={() => setOpen(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}
